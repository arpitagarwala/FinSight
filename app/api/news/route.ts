import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const REFRESH_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const supabase = await createClient()
  
  try {
    console.log('--- News Fetch Started ---')
    
    // 1. Initial check: Is the DB empty or stale?
    const { data: latestEntry, error: checkError } = await supabase
      .from('news')
      .select('created_at, published_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (checkError) {
      console.error('Supabase News Check Error:', checkError)
      // Fallback to direct SerpAPI if DB table is missing or broken
      const fallback = await fetchFreshNewsDirect()
      return NextResponse.json({ articles: fallback, warning: 'Database check failed, using direct fallback' })
    }

    const now = Date.now()
    const lastFetchTime = latestEntry?.[0] ? new Date(latestEntry[0].created_at).getTime() : 0
    const timeSinceLastFetch = now - lastFetchTime

    console.log(`Last fetch was ${Math.round(timeSinceLastFetch / 1000 / 60)} mins ago (Threshold: ${REFRESH_THRESHOLD_MS / 1000 / 60}m)`)

    // 2. Trigger background refresh if stale or empty
    if (timeSinceLastFetch > REFRESH_THRESHOLD_MS || !latestEntry || latestEntry.length === 0) {
      console.log('Triggering SerpAPI Refresh...')
      await refreshNewsFromSerpApi(supabase)
    }

    // 3. Final Query from DB
    const { data: articles, error: fetchError } = await supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(48)

    if (fetchError) {
      console.error('Supabase Final Fetch Error:', fetchError)
    }

    // If DB is still empty (e.g., first run and refresh is still processing or failed), return direct fallback
    return NextResponse.json({ 
      articles: articles || [], 
      metadata: {
        has_serp_key: !!process.env.SERP_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        count: articles?.length || 0,
        last_fetch: timeSinceLastFetch / 1000 / 60
      }
    })
  } catch (error) {
    console.error('CRITICAL News API Error:', error)
    const direct = await fetchFreshNewsDirect()
    return NextResponse.json({ 
      articles: direct, 
      metadata: { has_serp_key: !!process.env.SERP_API_KEY, fallback: true },
      error: 'Internal server error, fallback used' 
    })
  }
}

async function fetchFreshNewsDirect() {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) return []
  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_search&tbm=nws&q=indian+stock+market+finance+economy+news&gl=in&hl=en&api_key=${serpKey}`,
      { cache: 'no-store' }
    )
    if (!response.ok) return []
    const data = await response.json()
    return (data.news_results || []).slice(0, 24).map((item: any) => ({
      title: item.title,
      description: item.snippet || '',
      url: item.link,
      image: item.thumbnail || '',
      source: item.source || 'Google News',
      published_at: item.published_at || parseRelativeDate(item.date).toISOString()
    }))
  } catch {
    return []
  }
}

async function refreshNewsFromSerpApi(supabase: any) {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) {
    console.warn('MISSING SERP_API_KEY')
    return
  }

  try {
    const response = await fetch(
       `https://serpapi.com/search.json?engine=google_search&tbm=nws&q=indian+stock+market+finance+economy+news&gl=in&hl=en&api_key=${serpKey}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) {
      console.error('SerpAPI Error:', await response.text())
      return
    }

    const data = await response.json()
    const rawResults = data.news_results || []
    console.log(`Fetched ${rawResults.length} raw articles from SerpAPI`)

    // REMOVED FILTER FOR DEBUGGING: let's see if we get anything at all
    const processedArticles = rawResults
      .slice(0, 30) // Take first 30
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

    console.log(`Filtered down to ${processedArticles.length} valid articles`)

    if (processedArticles.length > 0) {
      const { error: upsertError } = await supabase
        .from('news')
        .upsert(processedArticles, { onConflict: 'url' })
      
      if (upsertError) {
        console.error('UPSERT FAILED:', upsertError)
      } else {
        console.log('Successfully upserted news into database')
      }
    }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    await supabase.from('news').delete().lt('published_at', sixMonthsAgo.toISOString())

  } catch (error) {
    console.error('Refresh Execution Error:', error)
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
