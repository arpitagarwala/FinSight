'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react'

type Article = { title: string; description: string; url: string; source: string; publishedAt: string }



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
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`
    return `${Math.floor(diff / 2592000)}mo ago`
  }

  const validArticles = articles.filter(a => {
    if (!a.publishedAt) return true
    const diffDays = (Date.now() - new Date(a.publishedAt).getTime()) / (1000 * 86400)
    return diffDays <= 180 // Max 6 months
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
          {validArticles.map((a: any, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="card-hover group block flex flex-col h-full">
              {a.image && (
                <div className="w-full h-40 rounded-xl overflow-hidden mb-4 relative bg-[#0f0f1a]">
                  <img src={a.image} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13131f] to-transparent"></div>
                </div>
              )}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-blue text-[10px]">{a.source}</span>
                  {a.publishedAt && <span className="text-xs text-slate-600">{timeAgo(a.publishedAt)}</span>}
                </div>
                <h3 className="font-semibold text-slate-200 text-sm leading-snug mb-2 group-hover:text-white transition-colors line-clamp-3">{a.title}</h3>
                {a.description && <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mt-auto">{a.description}</p>}
                <div className="flex items-center gap-1 mt-4 text-indigo-400 text-xs font-semibold">
                  <ExternalLink size={11} /> Read Article
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const STATIC_NEWS: Article[] = [
  { title: 'Sensex and Nifty close higher amid positive global cues', description: 'Indian benchmark indices ended with gains as IT and FMCG stocks led the recovery.', url: 'https://economictimes.indiatimes.com/markets', source: 'Economic Times', publishedAt: new Date(Date.now() - 3600000).toISOString() },
  { title: 'RBI keeps repo rate unchanged at 6.5% — what it means for your EMIs', description: "The Reserve Bank of India's Monetary Policy Committee held rates steady, providing relief to home and auto loan borrowers.", url: 'https://www.moneycontrol.com', source: 'Moneycontrol', publishedAt: new Date(Date.now() - 7200000).toISOString() },
  { title: 'Mutual fund SIP flows cross ₹26,000 crore in February 2025', description: 'Retail investors continue to pour money into equity mutual funds through SIPs despite market volatility.', url: 'https://www.amfiindia.com', source: 'AMFI India', publishedAt: new Date(Date.now() - 86400000).toISOString() },
  { title: 'How to maximise tax savings before March 31 deadline', description: 'With the financial year end approaching, here are the best last-minute tax-saving investments under Section 80C.', url: 'https://cleartax.in', source: 'ClearTax', publishedAt: new Date(Date.now() - 172800000).toISOString() },
  { title: 'Gold prices surge to all-time high — should you invest?', description: 'Gold has crossed ₹75,000 per 10 grams. Experts weigh in on whether now is the right time to allocate to the yellow metal.', url: 'https://www.moneycontrol.com', source: 'Moneycontrol', publishedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { title: 'PPF interest rate kept at 7.1% for Q1 FY2025-26', description: 'The government maintained small savings scheme rates, keeping PPF attractive for long-term tax-free savings.', url: 'https://economictimes.indiatimes.com', source: 'Economic Times', publishedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { title: 'New Income Tax regime vs Old regime: Which is better in 2025?', description: 'A detailed comparison of the new and old tax regimes for salaried employees and self-employed individuals.', url: 'https://cleartax.in', source: 'ClearTax', publishedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { title: 'FD rates: Top banks offering above 8% interest on fixed deposits', description: 'Several small finance banks and NBFCs are currently offering competitive FD rates above 8% per annum.', url: 'https://www.bankbazaar.com', source: 'BankBazaar', publishedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
]

