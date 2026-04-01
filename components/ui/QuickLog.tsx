'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, Check, X, ArrowRight, Mic } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

type ParsedTransaction = {
  amount: number
  type: 'income' | 'expense'
  category: string
  description: string
  date: string
}

export default function QuickLog({ onSaved }: { onSaved?: () => void }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleParse = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setError('')
    setParsed(null)

    try {
      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input })
      })
      const data = await res.json()
      if (data.parsed) {
        setParsed(data.parsed)
      } else {
        setError(data.error || 'Could not parse. Try being more specific.')
      }
    } catch (e) {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsed) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: parsed.amount,
        type: parsed.type === 'income' ? 'income' : 'expense',
        category: parsed.category,
        description: parsed.description,
        date: parsed.date
      })
      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        setInput('')
        setParsed(null)
        setSuccess(false)
        onSaved?.()
      }, 1500)
    } catch (e: any) {
      setError(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (parsed) handleConfirm()
      else handleParse()
    }
    if (e.key === 'Escape') {
      setParsed(null)
      setError('')
    }
  }

  const examples = [
    'spent 450 on lunch at starbucks',
    'received 50000 salary',
    'paid 1200 for uber ride',
    'bought groceries for 2500',
  ]

  return (
    <div className="relative">
      {/* Main Input */}
      <div className={`bg-[#13131f] border rounded-2xl transition-all duration-300 ${focused ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-[#1e1e2e]'}`}>
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Type a transaction... e.g. 'spent 450 on lunch'"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none"
            disabled={loading || saving}
          />
          <button
            onClick={parsed ? handleConfirm : handleParse}
            disabled={!input.trim() || loading || saving}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center gap-2 ${
              parsed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> :
             saving ? <Loader2 size={16} className="animate-spin" /> :
             success ? <><Check size={16} /> Saved!</> :
             parsed ? <><Check size={16} /> Confirm</> :
             <><ArrowRight size={16} /> Log</>}
          </button>
        </div>

        {/* Preview Card */}
        <AnimatePresence>
          {parsed && !success && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-[#1e1e2e]">
                <div className="flex items-center justify-between flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl`}>{parsed.type === 'income' ? '💰' : '💸'}</div>
                    <div>
                      <p className="text-white font-bold text-sm">{parsed.description}</p>
                      <p className="text-slate-500 text-xs">{parsed.category} · {parsed.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${parsed.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {parsed.type === 'income' ? '+' : '-'}{formatCurrency(parsed.amount)}
                    </span>
                    <button onClick={() => setParsed(null)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">Press Enter to confirm · Esc to cancel</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="px-4 pb-3 pt-1">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </div>

      {/* Example chips - only show when focused and empty */}
      <AnimatePresence>
        {focused && !input && !parsed && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-wrap gap-2 mt-3"
          >
            {examples.map(ex => (
              <button
                key={ex}
                onMouseDown={e => { e.preventDefault(); setInput(ex) }}
                className="text-xs px-3 py-1.5 rounded-full border border-[#1e1e2e] text-slate-500 hover:border-indigo-500/40 hover:text-indigo-400 transition-all bg-[#0f0f1a]"
              >
                "{ex}"
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
