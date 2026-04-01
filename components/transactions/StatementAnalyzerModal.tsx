'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Upload, FileText, Sparkles, CheckCircle2, 
  Loader2, AlertCircle, ArrowRight, Save, 
  History, Calendar, Info
} from 'lucide-react'
import { SpatialParser, Transaction } from '@/lib/data/parser'
import { distillTransactions } from '@/lib/data/cleaner'
import { autoCategorize } from '@/lib/data/categorizer'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type Step = 'upload' | 'review' | 'success'

export default function StatementAnalyzerModal({ isOpen, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ transactions: Transaction[], summary: any } | null>(null)
  const [password, setPassword] = useState('')
  const [needPassword, setNeedPassword] = useState(false)
  const [useClean, setUseClean] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)
  const supabase = createClient()

  const reset = () => {
    setStep('upload')
    setIsProcessing(false)
    setError(null)
    setData(null)
    setPassword('')
    setNeedPassword(false)
    setUseClean(false)
    fileRef.current = null
  }

  const handleFile = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    fileRef.current = file
    try {
      const buffer = await file.arrayBuffer()
      const parser = new SpatialParser()
      const result = await parser.parse(new Uint8Array(buffer), password)
      
      // Auto-categorize immediately
      const categorized = autoCategorize(result.transactions)
      setData({ transactions: categorized, summary: result.summary })
      setStep('review')
    } catch (err: any) {
      if (err.message === 'PASSWORD_REQUIRED') {
        setNeedPassword(true)
      } else {
        setError(err.message || 'Failed to process PDF')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSmartClean = async () => {
    if (!data) return
    setIsCleaning(true)
    try {
      // Get key from settings or environment (demo uses env)
      const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '' 
      const cleaned = await distillTransactions(data.transactions, apiKey)
      const categorized = autoCategorize(cleaned)
      setData({ ...data, transactions: categorized })
      setUseClean(true)
    } catch (err: any) {
      setError(`Smart Clean failed: ${err.message}`)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleSave = async () => {
    if (!data) return
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const toInsert = data.transactions.map(t => ({
        user_id: user.id,
        amount: t.amount,
        type: t.type === 'debit' ? 'expense' : 'income',
        category: t.category || 'Other',
        description: t.cleanDescription || t.description,
        date: new Date(t.date).toISOString().split('T')[0]
      }))

      const { error } = await supabase.from('transactions').insert(toInsert)
      if (error) throw error

      setStep('success')
      setTimeout(() => {
        onComplete()
        onClose()
        reset()
      }, 2500) // Slightly longer to allow DB to settle
    } catch (err: any) {
      setError(`Save failed: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file && file.type === 'application/pdf') handleFile(file);
        }}
        className="bg-[#0f0f1a] border border-[#1e1e2e] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center justify-between bg-[#13131f]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Sparkles className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Magic Statement Analyzer</h2>
              <p className="text-xs text-slate-500">AI-powered bank statement import</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col items-center justify-center py-12"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-lg aspect-video border-2 border-dashed border-[#1e1e2e] hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#1a1a2e] flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isProcessing ? <Loader2 className="animate-spin text-indigo-400" size={32} /> : <Upload className="text-slate-400 group-hover:text-indigo-400" size={32} />}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Drop your bank statement here</p>
                    <p className="text-sm text-slate-500 mt-1">Supports SBI, HDFC, Axis & major Indian banks (PDF only)</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                    className="hidden" 
                    accept=".pdf"
                  />
                </div>

                {needPassword && (
                    <div className="mt-8 w-full max-w-sm animate-fade-in">
                        <label className="label">Encryption Password</label>
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="input" 
                                placeholder="Enter PDF password..."
                            />
                            <button onClick={() => fileRef.current && handleFile(fileRef.current)} className="btn-primary">
                                Unlock
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                  <div className="mt-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-lg">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'review' && data && (
              <motion.div 
                key="review"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#13131f] p-4 rounded-2xl border border-[#1e1e2e]">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Inflow</p>
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(data.summary.totalIn)}</p>
                    </div>
                    <div className="bg-[#13131f] p-4 rounded-2xl border border-[#1e1e2e]">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Total Outflow</p>
                        <p className="text-xl font-bold text-red-400">{formatCurrency(data.summary.totalOut)}</p>
                    </div>
                    <div className="bg-[#13131f] p-4 rounded-2xl border border-[#1e1e2e]">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Transaction Count</p>
                        <p className="text-xl font-bold text-white">{data.transactions.length}</p>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-[#13131f] border border-[#1e1e2e] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-[#1a1a2e] text-slate-400 border-b border-[#1e1e2e] text-left text-sm">
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Balance</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e2e]">
                        {data.transactions.slice(0, 100).map((t, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{t.date}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <p className="text-white font-medium truncate max-w-[200px]">{t.cleanDescription || t.description}</p>
                              {useClean && <span className="text-[8px] text-indigo-400 uppercase font-bold flex items-center gap-1"><Sparkles size={8} /> AI Cleaned</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-slate-400 font-mono text-sm">
                              {t.balance > 0 ? formatCurrency(t.balance) : '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <CheckCircle2 className="text-emerald-400" size={48} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                <p className="text-slate-400 max-w-xs mx-auto">
                    Successfully imported {data?.transactions.length} transactions into your FinSight account.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'review' && (
          <div className="px-6 py-4 bg-[#13131f]/80 border-t border-[#1e1e2e] flex items-center justify-between">
            <button 
              onClick={reset}
              className="btn-secondary"
              disabled={isSaving || isCleaning}
            >
              Reset
            </button>
            <div className="flex gap-3">
              <button 
                onClick={handleSmartClean}
                className={`btn-secondary ${useClean ? 'bg-indigo-500/20 text-indigo-400' : ''}`}
                disabled={isCleaning || useClean || isSaving}
              >
                {isCleaning ? <Loader2 className="animate-spin" size={16} /> : (useClean ? <CheckCircle2 size={16} /> : <Sparkles size={16} />)}
                {useClean ? 'AI Distilled' : 'Smart Clean'}
              </button>
              <button 
                onClick={handleSave}
                className="btn-primary"
                disabled={isSaving || isCleaning}
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Import {data?.transactions.length} Transactions
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
