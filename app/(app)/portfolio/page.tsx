'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type Holding = { id: string; symbol: string; name: string; type: string; quantity: number; buy_price: number }
type LivePrice = { price: number; change: number }

export default function PortfolioPage() {
  const supabase = createClient()
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [prices, setPrices] = useState<Record<string, LivePrice>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showInsufficientModal, setShowInsufficientModal] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ symbol: '', name: '', type: 'stock', quantity: '', buy_price: '' })
  const [depositForm, setDepositForm] = useState({ amount: '', description: 'Funds added for investment' })
  const [availableBalance, setAvailableBalance] = useState(0)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [holdRes, txRes] = await Promise.all([
      supabase.from('holdings').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('type, amount').eq('user_id', user.id)
    ])
    setHoldings(holdRes.data ?? [])
    
    // Calculate net worth
    const income = txRes.data?.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0) || 0
    const expenses = txRes.data?.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0) || 0
    setAvailableBalance(income - expenses)
    
    setLoading(false)
    if (holdRes.data && holdRes.data.length > 0) fetchPrices(holdRes.data)
  }, [])

  useEffect(() => { load() }, [load])

  async function fetchPrices(hs: Holding[]) {
    setRefreshing(true)
    const symbols = hs.filter(h => h.type === 'stock').map(h => h.symbol).join(',')
    if (!symbols) { setRefreshing(false); return }
    try {
      const res = await fetch(`/api/stocks?symbols=${symbols}`)
      if (res.ok) {
        const data = await res.json()
        setPrices(data)
      }
    } catch (err) {}
    setRefreshing(false)
  }

  function handleSaveAttempt(e: React.FormEvent) {
    e.preventDefault()
    const totalCost = parseFloat(form.quantity) * parseFloat(form.buy_price)
    if (totalCost > availableBalance) {
      setShowInsufficientModal(true)
    } else {
      insertHolding()
    }
  }

  async function insertHolding() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Also insert an expense transaction representing the investment
    const totalCost = parseFloat(form.quantity) * parseFloat(form.buy_price)
    await supabase.from('transactions').insert({ 
      user_id: user.id, type: 'expense', amount: totalCost, 
      category: 'Investments', description: `Bought ${form.quantity} ${form.symbol}`, 
      date: new Date().toISOString() 
    })
    
    await supabase.from('holdings').insert({ 
      user_id: user.id, symbol: form.symbol.toUpperCase(), name: form.name, 
      type: form.type, quantity: parseFloat(form.quantity), buy_price: parseFloat(form.buy_price) 
    })
    setSaving(false)
    setShowModal(false)
    setShowInsufficientModal(false)
    setShowDepositModal(false)
    setForm({ symbol: '', name: '', type: 'stock', quantity: '', buy_price: '' })
    load()
  }

  async function autoAddDeposit() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const totalCost = parseFloat(form.quantity) * parseFloat(form.buy_price)
    await supabase.from('transactions').insert({ 
      user_id: user.id, type: 'income', amount: totalCost, 
      category: 'Other', description: 'Miscellaneous Deposit for Investment', 
      date: new Date().toISOString() 
    })
    await insertHolding()
  }

  async function handleManualDeposit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({ 
      user_id: user.id, type: 'income', amount: parseFloat(depositForm.amount), 
      category: 'Other', description: depositForm.description, 
      date: new Date().toISOString() 
    })
    
    // Recalculate if it's enough now, but for simplicity, we just proceed
    // since insertHolding will deduct the actual investment amount anyway.
    await insertHolding()
  }

  async function handleDelete(h: Holding) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('holdings').delete().eq('id', h.id)
    
    // Return money back to available balance by adding an income transaction
    const returnAmount = Number(h.quantity) * (prices[h.symbol]?.price || Number(h.buy_price))
    await supabase.from('transactions').insert({ 
      user_id: user?.id, type: 'income', amount: returnAmount, 
      category: 'Investments', description: `Sold ${h.quantity} ${h.symbol}`, 
      date: new Date().toISOString() 
    })
    
    setHoldings(hs => hs.filter(item => item.id !== h.id))
    load() // Reload to update available balance
  }

  const totalInvested = holdings.reduce((s, h) => s + Number(h.quantity) * Number(h.buy_price), 0)
  const totalCurrent = holdings.reduce((s, h) => {
    const p = prices[h.symbol]?.price || Number(h.buy_price)
    return s + Number(h.quantity) * p
  }, 0)
  const totalGain = totalCurrent - totalInvested
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  const typeColor: Record<string, string> = { stock: 'badge-blue', mutual_fund: 'badge-purple', etf: 'badge-green', crypto: 'badge-yellow' }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Portfolio Tracker</h1><p className="text-slate-500 text-sm">Balance: <span className="text-emerald-400 font-medium">{formatCurrency(availableBalance)}</span></p></div>
        <div className="flex gap-2">
          <button onClick={() => fetchPrices(holdings)} disabled={refreshing} className="btn-secondary">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Holding</button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><span className="stat-label">Invested</span><span className="stat-value">{formatCurrency(totalInvested)}</span></div>
        <div className="stat-card"><span className="stat-label">Current Value</span><span className="stat-value text-indigo-400">{formatCurrency(totalCurrent)}</span></div>
        <div className="stat-card"><span className="stat-label">Total Gain/Loss</span><span className={`stat-value ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}</span></div>
        <div className="stat-card"><span className="stat-label">Returns</span><span className={`stat-value ${gainPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%</span></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : holdings.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📈</p>
          <p className="text-slate-400 font-medium mb-1">No holdings added</p>
          <p className="text-slate-600 text-sm mb-4">Track your stocks, mutual funds, ETFs, and crypto</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Add Holding</button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#1e1e2e]">
                {['Symbol', 'Name', 'Type', 'Qty', 'Buy Price', 'Curr. Price', 'Invested', 'Current', 'Gain/Loss', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#1e1e2e]">
                {holdings.map(h => {
                  const lp = prices[h.symbol]
                  const currPrice = lp?.price || Number(h.buy_price)
                  const invested = Number(h.quantity) * Number(h.buy_price)
                  const current = Number(h.quantity) * currPrice
                  const gain = current - invested
                  const gainP = ((gain / invested) * 100)
                  return (
                    <tr key={h.id} className="hover:bg-[#1a1a2e] transition-colors group">
                      <td className="px-4 py-3.5 font-bold text-indigo-400">{h.symbol}</td>
                      <td className="px-4 py-3.5 text-white max-w-32 truncate">{h.name}</td>
                      <td className="px-4 py-3.5"><span className={`badge ${typeColor[h.type] || 'badge-blue'} text-[10px]`}>{h.type}</span></td>
                      <td className="px-4 py-3.5 text-slate-300">{h.quantity}</td>
                      <td className="px-4 py-3.5 text-slate-400">{formatCurrency(h.buy_price)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-white font-medium">{formatCurrency(currPrice)}</span>
                        {lp && <span className={`text-xs ml-1 ${lp.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{lp.change >= 0 ? '▲' : '▼'}{Math.abs(lp.change).toFixed(1)}%</span>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{formatCurrency(invested)}</td>
                      <td className="px-4 py-3.5 font-medium text-white">{formatCurrency(current)}</td>
                      <td className="px-4 py-3.5">
                        <div className={gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          <p className="font-medium">{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</p>
                          <p className="text-xs">{gainP >= 0 ? '+' : ''}{gainP.toFixed(1)}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => handleDelete(h)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Sell Holding"><X size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#1e1e2e] text-xs text-slate-600 flex items-center gap-1">
            Data sourced live via public market APIs. Selling a holding returns its current value to your available transaction balance.
          </div>
        </div>
      )}

      {/* Main Add Modal */}
      {showModal && !showInsufficientModal && !showDepositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Add Holding</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAttempt} className="space-y-4">
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {[['stock','📊 Stock'],['mutual_fund','💼 Mutual Fund'],['etf','🏦 ETF'],['crypto','🪙 Crypto']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.type === v ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'border-[#2a2a3e] text-slate-500 hover:text-white'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Ticker Symbol</label><input type="text" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} className="input" placeholder="e.g. RELIANCE" required /></div>
                <div><label className="label">Full Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Reliance Industries" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Quantity / Units</label><input type="number" step="0.001" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="input" placeholder="100" required /></div>
                <div><label className="label">Buy Price (₹)</label><input type="number" step="0.01" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} className="input" placeholder="2500" required /></div>
              </div>
              
              <div className="bg-[#0f0f1a] rounded-xl p-3 text-xs space-y-1.5 mt-2 border border-[#1e1e2e]">
                <div className="flex justify-between text-slate-400"><span>Available Balance</span><span className="text-white">{formatCurrency(availableBalance)}</span></div>
                <div className="flex justify-between text-slate-400"><span>Investment Cost</span><span className="text-white">{formatCurrency(parseFloat(form.quantity || '0') * parseFloat(form.buy_price || '0'))}</span></div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Continue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Insufficient Funds Modal */}
      {showInsufficientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in border-yellow-500/30">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-yellow-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Insufficient Balance</h2>
              <p className="text-slate-400 text-sm mb-6">
                You are trying to invest <strong className="text-white">{formatCurrency(parseFloat(form.quantity) * parseFloat(form.buy_price))}</strong>, but your available balance is only <strong className="text-white">{formatCurrency(availableBalance)}</strong>. 
                <br/><br/>Would you like to manually add a deposit for these funds, or auto-add a miscellaneous deposit to proceed?
              </p>
              
              <div className="flex flex-col gap-2 w-full">
                <button onClick={() => { setShowInsufficientModal(false); setShowDepositModal(true); 
                  setDepositForm({ amount: (parseFloat(form.quantity) * parseFloat(form.buy_price)).toString(), description: 'Funds added for investment' }) 
                }} className="btn-primary w-full justify-center">Edit Deposit Details</button>
                
                <button onClick={autoAddDeposit} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#2a2a3e] bg-[#1a1a2e] hover:bg-[#252538] text-slate-300 text-sm font-medium transition-colors">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Auto-add Misc Deposit & Proceed'}
                </button>
                
                <button onClick={() => { setShowInsufficientModal(false) }} className="btn-secondary w-full justify-center mt-2">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="card w-full max-w-sm animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Add Deposit</h2>
              <button onClick={() => { setShowDepositModal(false); setShowInsufficientModal(true) }} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleManualDeposit} className="space-y-4">
              <div><label className="label">Deposit Amount (₹)</label><input type="number" step="0.01" value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} className="input" required /></div>
              <div><label className="label">Description</label><input type="text" value={depositForm.description} onChange={e => setDepositForm(f => ({ ...f, description: e.target.value }))} className="input" required /></div>
              
              <div className="flex gap-3 pt-1 mt-6">
                <button type="button" onClick={() => { setShowDepositModal(false); setShowInsufficientModal(true) }} className="btn-secondary flex-1">Back</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save & Proceed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
