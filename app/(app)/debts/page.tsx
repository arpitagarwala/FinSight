'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type Debt = { id: string; name: string; type: string; principal: number; outstanding: number; interest_rate: number; emi: number; due_date: number }

export default function DebtsPage() {
  const supabase = createClient()
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'loan', principal: '', outstanding: '', interest_rate: '', emi: '', due_date: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id)
    setDebts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('debts').insert({ user_id: user.id, name: form.name, type: form.type, principal: parseFloat(form.principal), outstanding: parseFloat(form.outstanding), interest_rate: parseFloat(form.interest_rate), emi: form.emi ? parseFloat(form.emi) : null, due_date: form.due_date ? parseInt(form.due_date) : null })
    setSaving(false); setShowModal(false)
    setForm({ name: '', type: 'loan', principal: '', outstanding: '', interest_rate: '', emi: '', due_date: '' })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this debt?')) return
    await supabase.from('debts').delete().eq('id', id)
    setDebts(debts.filter(d => d.id !== id))
  }

  const totalOutstanding = debts.reduce((s, d) => s + Number(d.outstanding), 0)
  const totalPrincipal = debts.reduce((s, d) => s + Number(d.principal), 0)
  const totalEMI = debts.reduce((s, d) => s + Number(d.emi || 0), 0)

  function monthsLeft(d: Debt) {
    if (!d.emi || !d.outstanding) return null
    return Math.ceil(d.outstanding / d.emi)
  }

  const typeEmoji: Record<string, string> = { loan: '🏦', credit_card: '💳', other: '📋' }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Debt Tracker</h1><p className="text-slate-500 text-sm">{debts.length} debts tracked</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Debt</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Total Outstanding</span>
          <span className="stat-value text-red-400">{formatCurrency(totalOutstanding)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Monthly EMI</span>
          <span className="stat-value text-orange-400">{formatCurrency(totalEMI)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Paid off</span>
          <span className="stat-value text-emerald-400">{totalPrincipal > 0 ? `${(((totalPrincipal - totalOutstanding) / totalPrincipal) * 100).toFixed(0)}%` : '0%'}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : debts.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-slate-400 font-medium mb-1">No debts tracked</p>
          <p className="text-slate-600 text-sm mb-4">Track loans, credit cards, and get a payoff plan</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Add Debt</button>
        </div>
      ) : (
        <div className="space-y-4">
          {debts.map(d => {
            const paid = Number(d.principal) - Number(d.outstanding)
            const pct = Math.min((paid / Number(d.principal)) * 100, 100)
            const ml = monthsLeft(d)
            return (
              <div key={d.id} className="card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center text-xl">{typeEmoji[d.type] || '📋'}</div>
                    <div>
                      <h3 className="font-semibold text-white">{d.name}</h3>
                      <span className="badge badge-red text-[10px]">{d.interest_rate}% p.a.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-400">{formatCurrency(d.outstanding)}</p>
                      <p className="text-xs text-slate-500">outstanding</p>
                    </div>
                    <button onClick={() => handleDelete(d.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                  </div>
                </div>
                <div className="w-full bg-[#1e1e2e] rounded-full h-2 mb-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>Paid: {formatCurrency(paid)}</span>
                  <span>{pct.toFixed(0)}% complete</span>
                  <span>Principal: {formatCurrency(d.principal)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 bg-[#0f0f1a] rounded-xl px-3 py-2">
                  {d.emi && <span>EMI: <strong className="text-white">{formatCurrency(d.emi)}/mo</strong></span>}
                  {d.due_date && <span>Due: <strong className="text-white">{d.due_date}th</strong> of month</span>}
                  {ml && <span className="ml-auto">~<strong className="text-orange-400">{ml} months</strong> left</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Add Debt</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. HDFC Home Loan" required />
              </div>
              <div>
                <label className="label">Type</label>
                <div className="flex gap-2">
                  {[['loan','🏦 Loan'],['credit_card','💳 Credit Card'],['other','📋 Other']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type: v }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${form.type === v ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'border-[#2a2a3e] text-slate-500 hover:text-white'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Principal Amount (₹)</label>
                  <input type="number" value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} className="input" placeholder="500000" required />
                </div>
                <div>
                  <label className="label">Outstanding (₹)</label>
                  <input type="number" value={form.outstanding} onChange={e => setForm(f => ({ ...f, outstanding: e.target.value }))} className="input" placeholder="350000" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Interest Rate (%)</label>
                  <input type="number" step="0.1" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} className="input" placeholder="8.5" required />
                </div>
                <div>
                  <label className="label">EMI / month (₹)</label>
                  <input type="number" value={form.emi} onChange={e => setForm(f => ({ ...f, emi: e.target.value }))} className="input" placeholder="15000" />
                </div>
              </div>
              <div>
                <label className="label">EMI Due Day (1–31)</label>
                <input type="number" min="1" max="31" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input" placeholder="5" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

