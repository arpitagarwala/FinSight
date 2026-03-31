'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getMonthRange } from '@/lib/utils'

type ScoreCategory = { name: string; score: number; max: number; feedback: string; icon: string }

export default function HealthScorePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [totalScore, setTotalScore] = useState(0)
  const [categories, setCategories] = useState<ScoreCategory[]>([])
  const [insight, setInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => { calcScore() }, [])

  async function calcScore() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { start, end } = getMonthRange()
    const [txRes, goalRes, debtRes, billRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('goals').select('*').eq('user_id', user.id),
      supabase.from('debts').select('*').eq('user_id', user.id),
      supabase.from('bills').select('*').eq('user_id', user.id),
    ])
    const txs = (txRes.data ?? []).filter(t => t.category !== 'Imported')
    const goals = goalRes.data ?? []
    const debts = debtRes.data ?? []
    const bills = billRes.data ?? []
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
    const totalDebt = debts.reduce((s, d) => s + Number(d.outstanding), 0)
    const debtToIncome = income > 0 ? (totalDebt / (income * 12)) * 100 : 100
    const hasEmergencyFund = goals.some(g => g.name.toLowerCase().includes('emergency') || g.name.toLowerCase().includes('emerg'))
    const hasInvestmentGoal = goals.length > 0
    const paidBillsRate = bills.length > 0 ? (bills.filter(b => b.is_paid).length / bills.length) * 100 : 100

    const cats: ScoreCategory[] = [
      {
        name: 'Savings Rate',
        score: savingsRate >= 30 ? 25 : savingsRate >= 20 ? 20 : savingsRate >= 10 ? 13 : savingsRate > 0 ? 7 : 0,
        max: 25,
        feedback: savingsRate >= 20 ? `Great! You're saving ${savingsRate.toFixed(0)}% of income.` : `Currently saving ${savingsRate.toFixed(0)}%. Aim for at least 20%.`,
        icon: '💰'
      },
      {
        name: 'Debt Health',
        score: totalDebt === 0 ? 25 : debtToIncome < 30 ? 20 : debtToIncome < 50 ? 13 : debtToIncome < 80 ? 7 : 3,
        max: 25,
        feedback: totalDebt === 0 ? 'Excellent! You have no outstanding debt.' : `Debt-to-annual-income ratio: ${debtToIncome.toFixed(0)}%. Keep it below 30%.`,
        icon: '🏦'
      },
      {
        name: 'Emergency Fund',
        score: hasEmergencyFund ? 25 : goals.length > 0 ? 10 : 0,
        max: 25,
        feedback: hasEmergencyFund ? 'You have an emergency fund goal. Keep it at 6 months of expenses.' : 'No emergency fund found. Add a goal to save 6 months of expenses.',
        icon: '🛡️'
      },
      {
        name: 'Bill Management',
        score: Math.round((paidBillsRate / 100) * 15),
        max: 15,
        feedback: paidBillsRate === 100 ? 'All bills paid on time!' : `${paidBillsRate.toFixed(0)}% bills paid. Catch up on overdue bills.`,
        icon: '📋'
      },
      {
        name: 'Financial Planning',
        score: hasInvestmentGoal ? 10 : 0,
        max: 10,
        feedback: hasInvestmentGoal ? `You have ${goals.length} savings goal(s). Great planning!` : 'Set savings goals to improve your financial planning score.',
        icon: '📈'
      },
    ]

    const total = cats.reduce((s, c) => s + c.score, 0)
    setCategories(cats)
    setTotalScore(total)
    setLoading(false)
    generateInsight(total, cats, savingsRate)
  }

  async function generateInsight(score: number, cats: ScoreCategory[], savingsRate: number) {
    setInsightLoading(true)
    const weakest = [...cats].sort((a, b) => (a.score / a.max) - (b.score / b.max))[0]
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `A user has a financial wealth score of ${score}/100. Their weakest area is "${weakest.name}" (${weakest.score}/${weakest.max}). Give 2-3 specific, actionable steps to improve this score. Be concise and practical. Indian context.` })
      })
      const data = await res.json()
      setInsight(data.response || '')
    } catch { setInsight('') }
    setInsightLoading(false)
  }

  function getScoreColor(s: number) {
    if (s >= 80) return { text: 'text-emerald-400', ring: '#10b981', label: 'Excellent', bg: 'bg-emerald-500/10' }
    if (s >= 60) return { text: 'text-indigo-400', ring: '#6366f1', label: 'Good', bg: 'bg-indigo-500/10' }
    if (s >= 40) return { text: 'text-yellow-400', ring: '#f59e0b', label: 'Fair', bg: 'bg-yellow-500/10' }
    return { text: 'text-red-400', ring: '#ef4444', label: 'Needs Work', bg: 'bg-red-500/10' }
  }

  const sc = getScoreColor(totalScore)

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-indigo-400" size={32} /></div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Financial Wealth Score</h1><p className="text-slate-500 text-sm">AI-calculated based on your data</p></div>
        <button onClick={calcScore} className="btn-secondary"><RefreshCw size={14} /> Recalculate</button>
      </div>

      {/* Score Ring */}
      <div className="card mb-6 flex flex-col items-center py-8">
        <div className="relative mb-6">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="75" fill="none" stroke="#1e1e2e" strokeWidth="14" />
            <circle cx="90" cy="90" r="75" fill="none" stroke={sc.ring} strokeWidth="14"
              strokeDasharray={`${2 * Math.PI * 75}`}
              strokeDashoffset={`${2 * Math.PI * 75 * (1 - totalScore / 100)}`}
              strokeLinecap="round" transform="rotate(-90 90 90)"
              style={{ transition: 'stroke-dashoffset 1.5s ease', filter: `drop-shadow(0 0 12px ${sc.ring}80)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-bold ${sc.text}`}>{totalScore}</span>
            <span className="text-slate-500 text-sm">/100</span>
          </div>
        </div>
        <span className={`badge text-sm px-4 py-1.5 ${sc.bg} ${sc.text}`}>{sc.label}</span>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4 mb-6">
        {categories.map(c => (
          <div key={c.name} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.feedback}</p>
                </div>
              </div>
              <span className={`font-bold text-lg ${getScoreColor(c.score / c.max * 100).text}`}>{c.score}/{c.max}</span>
            </div>
            <div className="w-full bg-[#1e1e2e] rounded-full h-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(c.score / c.max) * 100}%`, background: getScoreColor((c.score / c.max) * 100).ring }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI Recommendation */}
      {(insight || insightLoading) && (
        <div className="card border-indigo-500/20 bg-gradient-to-r from-indigo-600/5 to-purple-600/5">
          <h3 className="font-semibold text-white mb-2 flex items-center gap-2">🤖 AI Recommendations</h3>
          {insightLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" /> Generating personalized recommendations...</div>
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{insight}</p>
          )}
        </div>
      )}
    </div>
  )
}

