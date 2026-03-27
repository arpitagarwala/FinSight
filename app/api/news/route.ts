import { NextResponse } from 'next/server'

export async function GET() {
  const serpKey = process.env.SERP_API_KEY
  
  if (!serpKey) {
    return NextResponse.json({ articles: [] }, { status: 500 })
  }

  try {
    // Next.js automatically caches this fetch for 4 hours (14400 seconds) 
    // This perfectly limits us to 6 requests per day, keeping us well under 
    // SerpAPI's 250 requests/month free limit even with many users.
    const res = await fetch(
      `https://serpapi.com/search.json?engine=google_news&q=indian+stock+market+finance+economy&gl=in&hl=en&api_key=${serpKey}`,
      { next: { revalidate: 14400 } }
    )
    
    if (res.ok) {
      const data = await res.json()
      const allowedNames = ['economic times', 'times of india', 'moneycontrol', 'ndtv', 'mint', 'livemint', 'business standard', 'financial express', 'zee business', 'cnbctv18', 'hindustan times', 'reuters', 'firstpost']
      
      const filtered = (data.news_results || []).filter((item: any) => {
        const sourceName = (item.source?.name || '').toLowerCase()
        return allowedNames.some(allowed => sourceName.includes(allowed))
      })

      const articles = filtered.slice(0, 24).map((item: any) => ({
        title: item.title,
        description: item.snippet || '',
        url: item.link,
        image: item.thumbnail || '',
        source: item.source?.name || 'Google News',
        publishedAt: item.date || new Date().toISOString()
      }))
      
      return NextResponse.json({ articles })
    }
  } catch (error) {
    console.error('SerpAPI Fetch Error:', error)
  }

  return NextResponse.json({ articles: [] }, { status: 500 })
}
