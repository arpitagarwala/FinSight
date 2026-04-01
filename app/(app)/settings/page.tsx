'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { Loader2, Save, LogOut, User, Key, Camera, Trash2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', monthly_income: '', currency: 'INR', groq_api_key: '', gemini_api_key: '' })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm(f => ({ ...f, name: data.name || '', monthly_income: String(data.monthly_income || ''), currency: data.currency || 'INR' }))
        setAvatarUrl(data.avatar_url)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 400
          const MAX_HEIGHT = 400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas to Blob failed'))
          }, 'image/jpeg', 0.7)
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      // 1. Compress
      const compressedBlob = await compressImage(file)
      
      // 2. Upload to Storage
      const filePath = `${user.id}/${Math.random()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedBlob)

      if (uploadError) throw uploadError

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // 4. Update Profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
    } catch (err: any) {
      alert(`Upload failed: ${err.message}. Make sure 'avatars' bucket exists in Supabase Storage.`)
    } finally {
      setUploading(false)
    }
  }

  async function removeAvatar() {
    if (!confirm('Remove profile picture?')) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
      setAvatarUrl(null)
    } finally {
      setUploading(false)
    }
  }

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
          <h2 className="font-semibold text-white mb-6 flex items-center gap-2"><User size={17} className="text-indigo-400" /> Profile Settings</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-2xl overflow-hidden ring-4 ring-[#13131f]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  form.name?.charAt(0).toUpperCase() || '?'
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-white font-bold text-lg">{form.name || 'Your Profile'}</h3>
              <p className="text-slate-500 text-xs mb-3">Upload a clean profile picture (max 5MB, will be auto-compressed)</p>
              {avatarUrl && (
                <button onClick={removeAvatar} className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 mx-auto sm:mx-0">
                  <Trash2 size={12} /> Remove custom photo
                </button>
              )}
            </div>
          </div>

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
            <button type="submit" disabled={saving} className={`btn-primary w-full ${saved ? '!bg-emerald-600' : ''}`}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? '✓ Settings Saved' : <><Save size={15} /> Update Profile</>}
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

