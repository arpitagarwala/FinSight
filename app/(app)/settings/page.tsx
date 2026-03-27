'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Loader2, Save, LogOut, User, Key } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', monthly_income: '', currency: 'INR', groq_api_key: '', gemini_api_key: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm(f => ({ ...f, name: data.name || '', monthly_income: String(data.monthly_income || ''), currency: data.currency || 'INR' }))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ name: form.name, monthly_income: parseFloat(form.monthly_income) || 0, currency: form.currency }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-indigo-400" size={28} /></div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Settings</h1><p className="text-slate-500 text-sm">Manage your profile and preferences</p></div>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="card">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><User size={17} className="text-indigo-400" /> Profile</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div><label className="label">Display Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Your name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Monthly Income (₹)</label><input type="number" value={form.monthly_income} onChange={e => setForm(f => ({ ...f, monthly_income: e.target.value }))} className="input" placeholder="50000" /></div>
              <div><label className="label">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="input">
                  {['INR','USD','EUR','GBP','AED','SGD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className={`btn-primary ${saved ? '!bg-emerald-600' : ''}`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? '✓ Saved!' : <><Save size={15} /> Save Profile</>}
            </button>
          </form>
        </div>

        {/* BYOK */}
        <div className="card">
          <h2 className="font-semibold text-white mb-2 flex items-center gap-2"><Key size={17} className="text-purple-400" /> Bring Your Own API Keys</h2>
          <p className="text-slate-500 text-sm mb-5">Optionally provide your own API keys to use a dedicated quota for AI features. These keys are stored only in your browser's local storage.</p>
          <div className="space-y-4">
            <div>
              <label className="label">Groq API Key <span className="text-indigo-400 text-xs">(Primary AI — free at groq.com)</span></label>
              <input type="password" value={form.groq_api_key} onChange={e => { setForm(f => ({ ...f, groq_api_key: e.target.value })); localStorage.setItem('groq_key', e.target.value) }} className="input" placeholder="gsk_..." />
            </div>
            <div>
              <label className="label">Gemini API Key <span className="text-slate-600 text-xs">(Fallback — optional)</span></label>
              <input type="password" value={form.gemini_api_key} onChange={e => { setForm(f => ({ ...f, gemini_api_key: e.target.value })); localStorage.setItem('gemini_key', e.target.value) }} className="input" placeholder="AIza..." />
            </div>
            <p className="text-xs text-slate-600">🔒 Keys are stored only in your browser — never sent to any server other than the AI provider directly.</p>
          </div>
        </div>

        {/* Data */}
        <div className="card">
          <h2 className="font-semibold text-white mb-3">Data & Privacy</h2>
          <p className="text-slate-500 text-sm mb-4">All your financial data is stored securely in Supabase with Row Level Security — only you can access it.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleLogout} className="btn-danger"><LogOut size={15} /> Sign Out</button>
          </div>
        </div>

        {/* About */}
        <div className="card text-center">
          <p className="text-slate-600 text-sm">FinSight AI — Open source personal finance platform</p>
          <p className="text-slate-700 text-xs mt-1">Next.js 14 · Supabase · Groq AI · Vercel</p>
        </div>
      </div>
    </div>
  )
}

