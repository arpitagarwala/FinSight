import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const REFRESH_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const supabase = await createClient()
  const logs: string[] = []
  
  try {
    logs.push('--- News Fetch Started ---')
    
    // 1. Initial check: Is the DB empty or stale?
    const { data: latestEntry, error: checkError } = await supabase
      .from('news')
      .select('created_at, published_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (checkError) {
      logs.push(`Supabase Check Error: ${JSON.stringify(checkError)}`)
      const { articles: fallback, error: directError } = await fetchFreshNewsDirect()
      return NextResponse.json({ 
        articles: fallback, 
        metadata: { 
          has_serp_key: !!process.env.SERP_API_KEY, 
          fallback: true,
          db_error: checkError,
          direct_error: directError,
          logs
        } 
      })
    }

    const now = Date.now()
    const lastFetchTime = latestEntry?.[0] ? new Date(latestEntry[0].created_at).getTime() : 0
    const timeSinceLastFetch = now - lastFetchTime
    logs.push(`Last fetch: ${Math.round(timeSinceLastFetch / 1000 / 60)}m ago`)

    // 2. Trigger background refresh if stale or empty
    let refreshResult: any = null
    if (timeSinceLastFetch > REFRESH_THRESHOLD_MS || !latestEntry || latestEntry.length === 0) {
      logs.push('Triggering Refresh from SerpAPI...')
      refreshResult = await refreshNewsFromSerpApi(supabase, logs)
    }

    // 3. Final Query from DB
    const { data: articles, error: fetchError } = await supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(48)

    if (fetchError) logs.push(`Final DB Fetch Error: ${JSON.stringify(fetchError)}`)

    // Fallback if still empty
    if (!articles || articles.length === 0) {
      logs.push('DB empty after refresh, getting direct content...')
      const { articles: direct, error: directError } = await fetchFreshNewsDirect()
      return NextResponse.json({ 
        articles: direct, 
        metadata: { has_serp_key: !!process.env.SERP_API_KEY, fallback: true, direct_error: directError, refresh_result: refreshResult, logs } 
      })
    }

    return NextResponse.json({ 
      articles, 
      metadata: {
        has_serp_key: !!process.env.SERP_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        count: articles?.length || 0,
        last_fetch: Math.round(timeSinceLastFetch / 1000 / 60),
        logs
      }
    })
  } catch (error: any) {
    logs.push(`CRITICAL ERROR: ${error.message}`)
    const { articles: direct, error: directError } = await fetchFreshNewsDirect()
    return NextResponse.json({ 
      articles: direct, 
      metadata: { has_serp_key: !!process.env.SERP_API_KEY, fallback: true, logs, last_error: error.message },
      error: 'See logs in metadata' 
    })
  }
}

async function fetchFreshNewsDirect() {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) return { articles: [], error: 'Missing API Key' }
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google&tbm=nws&q=finance+news&gl=in&hl=en&api_key=${serpKey}`,
      { cache: 'no-store' }
    )
    if (!response.ok) {
      const errText = await response.text()
      return { articles: [], error: `SerpAPI Error: ${response.status} - ${errText}` }
    }
    const data = await response.json()
    const articles = (data.news_results || []).slice(0, 24).map((item: any) => ({
      title: item.title,
      description: item.snippet || '',
      url: item.link,
      image: item.thumbnail || '',
      source: item.source || 'News',
      published_at: item.published_at || parseRelativeDate(item.date).toISOString()
    }))
    return { articles, error: null }
  } catch (err: any) {
    return { articles: [], error: err.message }
  }
}

async function refreshNewsFromSerpApi(supabase: any, logs: string[]) {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) {
    logs.push('Refresh Error: Missing SerpAPI Key')
    return { error: 'Missing Key' }
  }

  try {
    const response = await fetch(
       `https://serpapi.com/search.json?engine=google&tbm=nws&q=indian+finance+news&gl=in&api_key=${serpKey}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) {
      const errText = await response.text()
      logs.push(`SerpAPI Fetch Failed: ${response.status} - ${errText}`)
      return { error: `SerpAPI ${response.status}`, details: errText }
    }

    const data = await response.json()
    const rawResults = data.news_results || []
    logs.push(`SerpAPI returned ${rawResults.length} articles`)

    // Just take whatever we get for now to be safe
    const processedArticles = rawResults
      .slice(0, 30)
      .map((item: any) => {
        const pubAt = item.published_at ? new Date(item.published_at) : parseRelativeDate(item.date)
        return {
          title: item.title,
          description: item.snippet || '',
          url: item.link,
          image: item.thumbnail || '',
          source: item.source || 'News',
          published_at: pubAt.toISOString()
        }
      })

    if (processedArticles.length > 0) {
      const { error: upsertError } = await supabase
        .from('news')
        .upsert(processedArticles, { onConflict: 'url' })
      
      if (upsertError) {
        logs.push(`Supabase Upsert Error: ${JSON.stringify(upsertError)}`)
        return { error: 'Upsert failed', details: upsertError }
      }
      logs.push('Database successfully updated.')
      return { success: true, count: processedArticles.length }
    }

    logs.push('No articles processed after mapping.')
    return { error: 'No content found' }

  } catch (error: any) {
    logs.push(`Refresh Error: ${error.message}`)
    return { error: error.message }
  }
}

function parseRelativeDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const now = new Date()
  const lower = dateStr.toLowerCase().trim()
  const match = lower.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/)
  if (!match) return now
  const num = parseInt(match[1], 10)
  const unit = match[2]
  switch (unit) {
    case 'minute': return new Date(now.getTime() - num * 60 * 1000)
    case 'hour': return new Date(now.getTime() - num * 60 * 60 * 1000)
    case 'day': return new Date(now.getTime() - num * 24 * 60 * 60 * 1000)
    case 'week': return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000)
    case 'month': return new Date(now.getTime() - num * 30 * 24 * 60 * 60 * 1000)
    default: return now
  }
}
