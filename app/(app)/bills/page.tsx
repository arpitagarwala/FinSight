'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, Check, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, EXPENSE_CATEGORIES } from '@/lib/utils'

type Bill = { id: string; name: string; amount: number; due_day: number; category: string; is_paid: boolean; autopay: boolean }

export default function BillsPage() {
  const supabase = createClient()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', due_day: '1', category: 'Utilities', autopay: false })
  const [saving, setSaving] = useState(false)
  const today = new Date().getDate()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('bills').select('*').eq('user_id', user.id).order('due_day')
    setBills(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('bills').insert({ user_id: user.id, name: form.name, amount: parseFloat(form.amount), due_day: parseInt(form.due_day), category: form.category, autopay: form.autopay, is_paid: false })
    setSaving(false); setShowModal(false)
    setForm({ name: '', amount: '', due_day: '1', category: 'Utilities', autopay: false })
    load()
  }

  async function togglePaid(b: Bill) {
    const newStatus = !b.is_paid
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('bills').update({ is_paid: newStatus }).eq('id', b.id)
    if (user) {
      if (newStatus) {
        await supabase.from('transactions').insert({ 
          user_id: user.id, type: 'expense', amount: b.amount, 
          category: b.category, description: `Bill Payment: ${b.name}`, 
          date: new Date().toISOString() 
        })
      } else {
        // If marked unpaid, find the most recent transaction for this bill and delete it
        const { data: txs } = await supabase.from('transactions').select('id')
          .eq('user_id', user.id).eq('description', `Bill Payment: ${b.name}`).eq('type', 'expense')
          .order('created_at', { ascending: false }).limit(1)
        if (txs && txs.length > 0) {
          await supabase.from('transactions').delete().eq('id', txs[0].id)
        }
      }
    }
    setBills(bs => bs.map(bill => bill.id === b.id ? { ...bill, is_paid: newStatus } : bill))
  }

  async function handleDelete(id: string) {
    await supabase.from('bills').delete().eq('id', id)
    setBills(bs => bs.filter(b => b.id !== id))
  }

  const totalMonthly = bills.reduce((s, b) => s + Number(b.amount), 0)
  const totalPaid = bills.filter(b => b.is_paid).reduce((s, b) => s + Number(b.amount), 0)

  function urgency(dueDay: number) {
    const diff = dueDay >= today ? dueDay - today : 31 - today + dueDay
    if (diff === 0) return { label: 'Due Today!', class: 'text-red-400', dot: 'bg-red-400 animate-pulse' }
    if (diff <= 3) return { label: `${diff}d left`, class: 'text-red-400', dot: 'bg-red-400' }
    if (diff <= 7) return { label: `${diff}d left`, class: 'text-yellow-400', dot: 'bg-yellow-400' }
    return { label: `${diff}d left`, class: 'text-slate-500', dot: 'bg-slate-600' }
  }

  const BILL_ICONS: Record<string, string> = { Utilities: '💡', 'Housing & Rent': '🏠', 'Loans & EMI': '🏦', Subscriptions: '📱', Insurance: '🛡️', Transport: '🚗', Other: '📋' }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Bill Reminders</h1><p className="text-slate-500 text-sm">{bills.filter(b => !b.is_paid).length} unpaid this month</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Bill</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card"><span className="stat-label">Monthly Total</span><span className="stat-value">{formatCurrency(totalMonthly)}</span></div>
        <div className="stat-card"><span className="stat-label">Paid</span><span className="stat-value text-emerald-400">{formatCurrency(totalPaid)}</span></div>
        <div className="stat-card"><span className="stat-label">Remaining</span><span className="stat-value text-yellow-400">{formatCurrency(totalMonthly - totalPaid)}</span></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : bills.length === 0 ? (
        <div className="card text-center py-16">
          <Bell size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-1">No bills tracked</p>
          <p className="text-slate-600 text-sm mb-4">Add recurring bills to never miss a payment</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Add Bill</button>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(b => {
            const u = urgency(b.due_day)
            const isPaid = b.is_paid
            return (
              <div key={b.id} className={`card group transition-all ${isPaid ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => togglePaid(b)}
                    className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all flex-shrink-0 ${isPaid ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-[#2a2a3e] hover:border-indigo-500/50 text-transparent hover:text-indigo-400'}`}>
                    <Check size={18} />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-[#0f0f1a] border border-[#1e1e2e] flex items-center justify-center text-xl flex-shrink-0">
                    {BILL_ICONS[b.category] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${isPaid ? 'line-through text-slate-500' : 'text-white'}`}>{b.name}</p>
                      {b.autopay && <span className="badge badge-blue text-[10px]">Auto-pay</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-400' : u.dot}`} />
                      <p className={`text-xs ${isPaid ? 'text-emerald-400' : u.class}`}>
                        {isPaid ? 'Paid ✓' : `Due ${b.due_day}th · ${u.label}`}
                      </p>
                      <span className="text-xs text-slate-600">· {b.category}</span>
                    </div>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(b.amount)}</span>
                  <button onClick={() => handleDelete(b.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Add Bill</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="label">Bill Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. Netflix, House Rent" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Amount (₹)</label><input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" placeholder="999" required /></div>
                <div><label className="label">Due Day</label><input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} className="input" /></div>
              </div>
              <div><label className="label">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, autopay: !f.autopay }))}
                  className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.autopay ? 'bg-indigo-600' : 'bg-[#2a2a3e]'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${form.autopay ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-slate-300">Auto-pay enabled</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

