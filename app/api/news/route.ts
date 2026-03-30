import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Important: This route needs to be dynamic to ensure fresh maintenance checks
export const dynamic = 'force-dynamic'

// Throttling: Only fetch from external SerpAPI if the latest DB entry is older than this
const REFRESH_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour for manual/auto refresh check
const CACHE_LIFETIME_MS = 4 * 60 * 60 * 1000 // 4 hours before we definitely refresh

export async function GET() {
  const supabase = await createClient()
  
  try {
    // 1. Check if we need to refresh from SerpAPI
    // We get the most recent entry from the DB to see how fresh our data is
    const { data: latestEntry } = await supabase
      .from('news')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const now = Date.now()
    const lastFetchTime = latestEntry ? new Date(latestEntry.created_at).getTime() : 0
    const timeSinceLastFetch = now - lastFetchTime

    // Only fetch if data is older than threshold
    if (timeSinceLastFetch > REFRESH_THRESHOLD_MS) {
      await refreshNewsFromSerpApi(supabase)
    }

    // 2. Query news from our DB
    const { data: articles, error } = await supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(48)

    if (error) throw error

    return NextResponse.json({ articles: articles || [] })
  } catch (error) {
    console.error('News API Route Error:', error)
    return NextResponse.json({ articles: [] }, { status: 500 })
  }
}

async function refreshNewsFromSerpApi(supabase: any) {
  const serpKey = process.env.SERP_API_KEY
  if (!serpKey) return

  try {
    // Use google_search with tbm=nws for more consistent and sortable results
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_search&tbm=nws&q=indian+stock+market+finance+economy+news&gl=in&hl=en&api_key=${serpKey}`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return

    const data = await response.json()
    const rawResults = data.news_results || []

    const allowedNames = ['economic times', 'times of india', 'moneycontrol', 'ndtv', 'mint', 'livemint', 'business standard', 'financial express', 'zee business', 'cnbctv18', 'hindustan times', 'reuters', 'firstpost']
    
    const processedArticles = rawResults
      .filter((item: any) => {
        const sourceName = (item.source || '').toLowerCase()
        return allowedNames.some(allowed => sourceName.includes(allowed))
      })
      .map((item: any) => {
        const published_at = parseRelativeDate(item.date)
        return {
          title: item.title,
          description: item.snippet || '',
          url: item.link,
          image: item.thumbnail || '',
          source: item.source || 'Google News',
          published_at: published_at.toISOString()
        }
      })

    // Upsert into DB (duplicates on URL will be ignored or updated)
    if (processedArticles.length > 0) {
      const { error: upsertError } = await supabase
        .from('news')
        .upsert(processedArticles, { onConflict: 'url' })
      
      if (upsertError) console.error('Supabase Upsert Error:', upsertError)
    }

    // Maintenance: Delete news older than 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    await supabase
      .from('news')
      .delete()
      .lt('published_at', sixMonthsAgo.toISOString())

  } catch (error) {
    console.error('SerpAPI Fetch/Upsert Error:', error)
  }
}

// Helper to convert SerpAPI relative strings to real dates
function parseRelativeDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  const now = new Date()
  const lower = dateStr.toLowerCase().trim()
  
  // Handled formats: "2 hours ago", "1 day ago", "15 minutes ago", "3 weeks ago"
  const match = lower.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/)
  if (!match) {
    // Attempt standard parse as fallback
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? now : parsed
  }

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
