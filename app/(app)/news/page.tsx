'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react'

type Article = { title: string; description: string; url: string; source: string; published_at: string; image: string }



export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNews() }, [])

  async function fetchNews() {
    setLoading(true)
    try {
      // Calls our internal API which securely manages SerpAPI limits with caching
      const res = await fetch('/api/news')
      if (res.ok) {
        const data = await res.json()
        if (data.articles && data.articles.length > 0) { 
          setArticles(data.articles)
          setLoading(false)
          return 
        }
      }
    } catch {}
    // Fallback if API fails
    setArticles([])
    setLoading(false)
  }

  function timeAgo(dt: string) {
    if (!dt) return ''
    const diff = (Date.now() - new Date(dt).getTime()) / 1000
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 2592000)}mo ago`
  }

  const validArticles = articles.filter(a => {
    if (!a.published_at) return true
    const date = new Date(a.published_at)
    if (isNaN(date.getTime())) return true // Show it anyway if date is weird
    const diffDays = (Date.now() - date.getTime()) / (1000 * 86400)
    return diffDays <= 200 // Relaxed 6-month check
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Finance News</h1><p className="text-slate-500 text-sm">India markets, economy & personal finance</p></div>
        <button onClick={fetchNews} className="btn-secondary"><RefreshCw size={14} /> Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {validArticles.length > 0 ? (
            validArticles.map((a: any, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="card-hover group block flex flex-col h-full">
                {a.image && (
                  <div className="w-full h-44 rounded-xl overflow-hidden mb-4 relative bg-[#0f0f1a] border border-slate-800/30">
                    <img src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-80"></div>
                  </div>
                )}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-blue text-[10px]">{a.source}</span>
                    {a.published_at && <span className="text-xs text-slate-600">{timeAgo(a.published_at)}</span>}
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm leading-snug mb-2 group-hover:text-white transition-colors line-clamp-3">{a.title}</h3>
                  {a.description && <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mt-auto">{a.description}</p>}
                  <div className="flex items-center gap-1 mt-4 text-indigo-400 text-xs font-semibold">
                    <ExternalLink size={11} /> Read Article
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-slate-500 mb-4">No recent news articles found.</p>
              <button onClick={fetchNews} className="btn-secondary mx-auto">Try Refreshing</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

