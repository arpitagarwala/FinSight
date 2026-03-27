'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Loader2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type Goal = { id: string; name: string; target_amount: number; current_amount: number; target_date: string; icon: string }

const ICONS = ['🎯','🏠','🚗','✈️','📚','💍','🛡️','💻','🏖️','🏋️','🐕','👶','🏦','💊']

export default function GoalsPage() {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null)
  const [contribution, setContribution] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', target_date: '', icon: '🎯' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setGoals(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('goals').insert({ user_id: user.id, name: form.name, target_amount: parseFloat(form.target_amount), current_amount: parseFloat(form.current_amount || '0'), target_date: form.target_date || null, icon: form.icon })
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', target_amount: '', current_amount: '', target_date: '', icon: '🎯' })
    load()
  }

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault()
    if (!contributeGoal) return
    const newAmount = Number(contributeGoal.current_amount) + parseFloat(contribution)
    await supabase.from('goals').update({ current_amount: newAmount }).eq('id', contributeGoal.id)
    setContributeGoal(null)
    setContribution('')
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(g => g.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Savings Goals</h1><p className="text-slate-500 text-sm">{goals.length} goals tracked</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Goal</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-slate-400 font-medium mb-1">No savings goals yet</p>
          <p className="text-slate-600 text-sm mb-4">Set a goal and track your progress towards it</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Create Goal</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {goals.map(g => {
            const pct = Math.min((g.current_amount / g.target_amount) * 100, 100)
            const done = pct >= 100
            const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000) : null
            return (
              <div key={g.id} className="card group relative overflow-hidden">
                {done && <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#0f0f1a] border border-[#1e1e2e] flex items-center justify-center text-2xl">{g.icon}</div>
                    <div>
                      <h3 className="font-semibold text-white">{g.name}</h3>
                      {daysLeft !== null && <p className={`text-xs ${daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-yellow-400' : 'text-slate-500'}`}>{daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(g.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"><X size={14} /></button>
                </div>

                {/* Ring */}
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e2e" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={done ? '#10b981' : '#6366f1'} strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                        strokeLinecap="round" transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{pct.toFixed(0)}%</span>
                      <span className="text-xs text-slate-500">{done ? '✅ Done!' : 'of goal'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-4">
                  <div><p className="text-slate-500 text-xs">Saved</p><p className="font-bold text-emerald-400">{formatCurrency(g.current_amount)}</p></div>
                  <div className="text-right"><p className="text-slate-500 text-xs">Target</p><p className="font-bold text-white">{formatCurrency(g.target_amount)}</p></div>
                </div>

                {!done && (
                  <button onClick={() => setContributeGoal(g)} className="btn-secondary w-full">
                    <Pencil size={14} /> Add Funds
                  </button>
                )}
                {done && <div className="badge badge-green w-full justify-center py-2">🎉 Goal Achieved!</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* New Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">New Savings Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Choose an Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(ic => (
                    <button type="button" key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                      className={`w-10 h-10 text-xl rounded-xl border transition-all ${form.icon === ic ? 'border-indigo-500 bg-indigo-500/20' : 'border-[#2a2a3e] hover:border-[#3a3a4e]'}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Goal Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="e.g. Emergency Fund" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target Amount (₹)</label>
                  <input type="number" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} className="input" placeholder="100000" required />
                </div>
                <div>
                  <label className="label">Already saved (₹)</label>
                  <input type="number" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} className="input" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Target Date (optional)</label>
                <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Add to {contributeGoal.icon} {contributeGoal.name}</h2>
              <button onClick={() => setContributeGoal(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="label">Amount to add (₹)</label>
                <input type="number" value={contribution} onChange={e => setContribution(e.target.value)} className="input" placeholder="e.g. 5000" required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setContributeGoal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Funds</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

