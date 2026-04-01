'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type Subscription = {
  description: string
  amount: number
  occurrences: number
  monthlyAvg: number
  lastDate: string
  isActive: boolean
}

export default function SubscriptionAudit() {
  const supabase = createClient()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [totalMonthly, setTotalMonthly] = useState(0)

  async function scanSubscriptions() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch last 6 months of expenses
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const { data: txs } = await supabase
        .from('transactions')
        .select('description, amount, date, category')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (!txs || txs.length === 0) {
        setSubs([])
        setScanned(true)
        setLoading(false)
        return
      }

      // Group by description (normalized) and detect recurring
      const groups: Record<string, { amounts: number[]; dates: string[]; count: number }> = {}
      
      for (const tx of txs) {
        const key = tx.description?.toLowerCase().trim().replace(/\s+/g, ' ') || 'unknown'
        if (!groups[key]) groups[key] = { amounts: [], dates: [], count: 0 }
        groups[key].amounts.push(Number(tx.amount))
        groups[key].dates.push(tx.date)
        groups[key].count++
      }

      // A subscription is something that appeared 2+ times in 6 months with similar amounts
      const detected: Subscription[] = []
      
      for (const [desc, data] of Object.entries(groups)) {
        if (data.count < 2) continue
        
        // Check if amounts are roughly consistent (within 30% variance)
        const avg = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length
        const allSimilar = data.amounts.every(a => Math.abs(a - avg) / avg < 0.3)
        
        if (!allSimilar && data.count < 3) continue

        const sortedDates = data.dates.sort()
        const lastDate = sortedDates[sortedDates.length - 1]
        const daysSinceLast = Math.ceil((Date.now() - new Date(lastDate).getTime()) / 86400000)
        const isActive = daysSinceLast < 60

        // Calculate monthly average
        const firstDate = new Date(sortedDates[0])
        const lastDateObj = new Date(lastDate)
        const monthSpan = Math.max(1, (lastDateObj.getTime() - firstDate.getTime()) / (30 * 86400000))
        const monthlyAvg = (data.amounts.reduce((s, a) => s + a, 0)) / Math.max(monthSpan, 1)

        detected.push({
          description: desc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          amount: avg,
          occurrences: data.count,
          monthlyAvg,
          lastDate,
          isActive
        })
      }

      // Sort by monthly cost (highest first)
      detected.sort((a, b) => b.monthlyAvg - a.monthlyAvg)
      setSubs(detected)
      setTotalMonthly(detected.filter(s => s.isActive).reduce((s, sub) => s + sub.monthlyAvg, 0))
      setScanned(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <Search size={15} className="text-indigo-400" /> Subscription Audit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Detect recurring charges from your transactions</p>
        </div>
        <button
          onClick={scanSubscriptions}
          disabled={loading}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          {scanned ? 'Re-scan' : 'Scan Now'}
        </button>
      </div>

      {scanned && subs.length === 0 && (
        <div className="text-center py-6">
          <CheckCircle size={28} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No recurring subscriptions detected!</p>
          <p className="text-xs text-slate-600 mt-1">Import more bank statements for better detection</p>
        </div>
      )}

      {subs.length > 0 && (
        <>
          {/* Monthly total banner */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold">Est. monthly recurring</span>
            </div>
            <span className="text-amber-400 font-bold text-sm">{formatCurrency(totalMonthly)}/mo</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {subs.map((sub, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0f0f1a] border border-[#1e1e2e]">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.isActive ? 'bg-red-400' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{sub.description}</p>
                  <p className="text-xs text-slate-500">
                    {sub.occurrences}x in 6mo · Last: {new Date(sub.lastDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    {!sub.isActive && <span className="text-slate-600 ml-1">(inactive)</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-white">~{formatCurrency(sub.amount)}</p>
                  <p className="text-[10px] text-slate-500">{formatCurrency(sub.monthlyAvg)}/mo</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-600 text-center mt-3">
            Based on pattern analysis of your last 6 months of expenses
          </p>
        </>
      )}

      {!scanned && (
        <div className="text-center py-6">
          <p className="text-xs text-slate-500">Click "Scan Now" to detect recurring subscriptions from your bank data</p>
        </div>
      )}
    </div>
  )
}
