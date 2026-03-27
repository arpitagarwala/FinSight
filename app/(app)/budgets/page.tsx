'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, TrendingUp, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils'

type Budget = { id: string; category: string; monthly_limit: number; month: string }
type Tx = { category: string; amount: number; type: string; date: string }

function getMonth() { return new Date().toISOString().slice(0, 7) }

export default function BudgetsPage() {
  const supabase = createClient()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [spending, setSpending] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category: 'Food & Dining', monthly_limit: '' })
  const [saving, setSaving] = useState(false)
  const month = getMonth()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [budgetRes, txRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', month),
      supabase.from('transactions').select('category,amount,type,date').eq('user_id', user.id).eq('type', 'expense').gte('date', `${month}-01`).lte('date', `${month}-31`)
    ])
    setBudgets(budgetRes.data ?? [])
    const sp: Record<string, number> = {}
    ;(txRes.data as Tx[] ?? []).forEach(t => { sp[t.category] = (sp[t.category] || 0) + Number(t.amount) })
    setSpending(sp)
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('budgets').upsert({ user_id: user.id, category: form.category, monthly_limit: parseFloat(form.monthly_limit), month }, { onConflict: 'user_id,category,month' })
    setSaving(false)
    setShowModal(false)
    setForm({ category: 'Food & Dining', monthly_limit: '' })
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('budgets').delete().eq('id', id)
    setBudgets(budgets.filter(b => b.id !== id))
  }

  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.category] || 0), 0)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-title">Budgets</h1>
          <p className="text-slate-500 text-sm">{new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Budget</button>
      </div>

      {/* Summary */}
      <div className="card mb-6 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 border-indigo-500/20">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-sm">Total Budget</span>
          <span className="text-slate-400 text-sm">Spent: <span className={totalSpent > totalBudget ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{formatCurrency(totalSpent)}</span></span>
        </div>
        <div className="text-2xl font-bold text-white mb-3">{formatCurrency(totalBudget)}</div>
        <div className="w-full bg-[#1e1e2e] rounded-full h-2.5">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totalSpent / totalBudget) * 100 || 0, 100)}%`, background: totalSpent > totalBudget ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}% used` : 'No budgets set'}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : budgets.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-500 mb-3">No budgets set for this month</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Create Budget</button>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map(b => {
            const spent = spending[b.category] || 0
            const pct = Math.min((spent / b.monthly_limit) * 100, 100)
            const over = spent > b.monthly_limit
            const warn = pct > 80 && !over
            return (
              <div key={b.id} className="card hover:border-[#2a2a3e] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: (CATEGORY_COLORS[b.category] || '#6366f1') + '20' }}>
                      {over ? '🔴' : warn ? '🟡' : '🟢'}
                    </div>
                    <div>
                      <p className="font-medium text-white">{b.category}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(spent)} of {formatCurrency(b.monthly_limit)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(over || warn) && (
                      <AlertTriangle size={16} className={over ? 'text-red-400' : 'text-yellow-400'} />
                    )}
                    <span className={`text-sm font-bold ${over ? 'text-red-400' : 'text-white'}`}>
                      {over ? `-${formatCurrency(spent - b.monthly_limit)}` : formatCurrency(b.monthly_limit - spent)} {over ? 'over' : 'left'}
                    </span>
                    <button onClick={() => handleDelete(b.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1"><X size={14} /></button>
                  </div>
                </div>
                <div className="w-full bg-[#1e1e2e] rounded-full h-2">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: over ? '#ef4444' : warn ? '#f59e0b' : CATEGORY_COLORS[b.category] || '#6366f1' }} />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-slate-600">
                  <span>0</span><span className={over ? 'text-red-400 font-medium' : ''}>{pct.toFixed(0)}%</span><span>{formatCurrency(b.monthly_limit)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Set Budget</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monthly Limit (₹)</label>
                <input type="number" value={form.monthly_limit} onChange={e => setForm(f => ({ ...f, monthly_limit: e.target.value }))} className="input" placeholder="e.g. 5000" required />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

