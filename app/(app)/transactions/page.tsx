'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Filter, Download, Trash2, Edit, X, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_COLORS } from '@/lib/utils'
import StatementAnalyzerModal from '@/components/transactions/StatementAnalyzerModal'
import { Sparkles } from 'lucide-react'

type Tx = { id: string; amount: number; type: string; category: string; description: string; date: string }

export default function TransactionsPage() {
  const supabase = createClient()
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Tx | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [form, setForm] = useState({ amount: '', type: 'expense', category: 'Food & Dining', description: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [showAnalyzer, setShowAnalyzer] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
    setTxs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = txs.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (search && !t.description?.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { user_id: user.id, amount: parseFloat(form.amount), type: form.type, category: form.category, description: form.description, date: form.date }
    if (editing) await supabase.from('transactions').update(payload).eq('id', editing.id)
    else await supabase.from('transactions').insert(payload)
    setSaving(false)
    setShowModal(false)
    setEditing(null)
    setForm({ amount: '', type: 'expense', category: 'Food & Dining', description: '', date: new Date().toISOString().split('T')[0] })
    load()
  }

  function openEdit(tx: Tx) {
    setEditing(tx)
    setForm({ amount: String(tx.amount), type: tx.type, category: tx.category, description: tx.description || '', date: tx.date })
    setShowModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    setTxs(txs.filter(t => t.id !== id))
  }

  function exportCSV() {
    const headers = 'Date,Type,Category,Description,Amount\n'
    const rows = filtered.map(t => `${t.date},${t.type},${t.category},"${t.description}",${t.amount}`).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'transactions.csv'
    a.click()
  }

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="section-title">Transactions</h1>
          <p className="text-slate-500 text-sm">{txs.length} total transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAnalyzer(true)} 
            className="btn-secondary border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
          >
            <Sparkles size={16} /> Magic Import
          </button>
          <button onClick={exportCSV} className="btn-secondary"><Download size={15} /> CSV</button>
          <button onClick={() => { setEditing(null); setForm({ amount: '', type: 'expense', category: 'Food & Dining', description: '', date: new Date().toISOString().split('T')[0] }); setShowModal(true) }} className="btn-primary"><Plus size={16} /> Add</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-emerald-400"><ArrowUpCircle size={18} /><span className="stat-label">Income</span></div>
          <div className="stat-value text-emerald-400">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-red-400"><ArrowDownCircle size={18} /><span className="stat-label">Expenses</span></div>
          <div className="stat-value text-red-400">{formatCurrency(totalExpenses)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Search by description or category..." />
        </div>
        <div className="flex gap-2">
          {['all', 'income', 'expense'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${typeFilter === f ? 'bg-indigo-600 text-white' : 'bg-[#13131f] border border-[#1e1e2e] text-slate-400 hover:text-white'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card p-2">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500 mb-2">No transactions found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto"><Plus size={16} /> Add Transaction</button>
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e2e]">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#1a1a2e] transition-colors group rounded-xl">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: (CATEGORY_COLORS[tx.category] || '#6366f1') + '20' }}>
                  {tx.type === 'income' ? '💰' : '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tx.description || tx.category}</p>
                  <p className="text-xs text-slate-500">{tx.category} · {formatDate(tx.date)}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-colors"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit' : 'Add'} Transaction</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex gap-3">
                {['expense', 'income'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: t === 'income' ? 'Salary' : 'Food & Dining' }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${form.type === t ? (t === 'income' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400') : 'border-[#2a2a3e] text-slate-500 hover:text-white'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="e.g. Grocery run" />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : (editing ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Analyzer Modal */}
      <StatementAnalyzerModal 
        isOpen={showAnalyzer} 
        onClose={() => setShowAnalyzer(false)} 
        onComplete={() => {
          load()
          setShowAnalyzer(false)
        }} 
      />
    </div>
  )
}

