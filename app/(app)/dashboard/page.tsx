'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Target, Brain, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getMonthRange, CATEGORY_COLORS, getFinancialYearRange } from '@/lib/utils'
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ income: 0, expenses: 0, netWorth: 0, savings: 0 })
  const [fyLabel, setFyLabel] = useState('')
  const [recent, setRecent] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [aiInsight, setAiInsight] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [userName, setUserName] = useState('there')
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserName(user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there')

    const { start, end } = getMonthRange()

    const [txRes, billRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('bills').select('*').eq('user_id', user.id).eq('is_paid', false).order('due_day').limit(5),
    ])

    const txs = txRes.data ?? []
    const bills = billRes.data ?? []
    setUpcomingBills(bills)
    setRecent(txs.slice(0, 6))

    // Determine target Financial Year (Smart Lookback)
    let fy = getFinancialYearRange()
    const currentFYTxs = txs.filter(t => t.date >= fy.start && t.date <= fy.end)
    
    // If current FY is empty, find the latest year with data
    if (currentFYTxs.length === 0 && txs.length > 0) {
      const latestDate = new Date(txs[0].date)
      fy = getFinancialYearRange(latestDate)
    }
    setFyLabel(fy.label)

    // Stats (Include all transactions for cash flow accuracy in the selected FY)
    const fyTxs = txs.filter(t => t.date >= fy.start && t.date <= fy.end)
    const income = fyTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = fyTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    setStats({ income, expenses, netWorth: income - expenses, savings: income > 0 ? ((income - expenses) / income) * 100 : 0 })

    // Category breakdown (Exclude 'Imported' from the pie chart)
    const cats: Record<string, number> = {}
    fyTxs.filter(t => t.type === 'expense' && t.category !== 'Imported').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
    })
    setCategoryData(Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6))

    // Monthly trend (6 months ending at the end of the selected FY or current date)
    const trendEndDate = new Date(fy.end) < new Date() ? new Date(fy.end) : new Date()
    const months: any[] = []
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(trendEndDate.getFullYear(), trendEndDate.getMonth() - i, 1)
      const me = new Date(trendEndDate.getFullYear(), trendEndDate.getMonth() - i + 1, 0)
      const rangeStart = ms.toISOString().split('T')[0]
      const rangeEnd = me.toISOString().split('T')[0]
      
      const mTxs = txs.filter(t => t.date >= rangeStart && t.date <= rangeEnd)
      const mLabel = ms.toLocaleString('en-IN', { month: 'short' })
      months.push({
        month: mLabel,
        income: mTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expenses: mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      })
    }
    setMonthlyData(months)
    setLoading(false)
    generateInsight(income, expenses, cats)
  }

  async function generateInsight(income: number, expenses: number, cats: Record<string, number>) {
    setInsightLoading(true)
    try {
      const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Give a single, actionable personal finance insight (2-3 sentences, friendly tone, no markdown) for someone who earned ${formatCurrency(income)} and spent ${formatCurrency(expenses)} this month. ${topCat ? `Their biggest expense was ${topCat[0]} at ${formatCurrency(topCat[1])}.` : ''} Focus on a specific actionable tip.`,
          cacheKey: `daily-insight-${new Date().toISOString().split('T')[0]}-${Math.round(income)}-${Math.round(expenses)}`
        })
      })
      const data = await res.json()
      setAiInsight(data.response || getFallbackInsight(income, expenses, cats))
    } catch {
      setAiInsight(getFallbackInsight(income, expenses, cats))
    }
    setInsightLoading(false)
  }

  function getFallbackInsight(income: number, expenses: number, cats: Record<string, number>) {
    if (income === 0) return "Start by logging your income and expenses to get personalized financial insights!"
    const savingsRate = ((income - expenses) / income) * 100
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
    if (savingsRate < 20) return `You're saving ${savingsRate.toFixed(0)}% this month — below the recommended 20%. Try trimming ${topCat?.[0] || 'discretionary'} spending by 10% to boost your savings.`
    return `Great work! You're saving ${savingsRate.toFixed(0)}% this month. Consider directing the surplus into an SIP or emergency fund.`
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
        <p className="text-slate-500 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}, {userName}! 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's your financial snapshot for {fyLabel}</p>
        </div>
        <Link href="/transactions" className="btn-primary hidden sm:flex">Add Transaction</Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Income', value: stats.income, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', positive: true },
          { label: 'Expenses', value: stats.expenses, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', positive: false },
          { label: 'Net Savings', value: stats.netWorth, icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10', positive: stats.netWorth >= 0 },
          { label: 'Savings Rate', value: null, icon: Target, color: 'text-purple-400', bg: 'bg-purple-500/10', positive: stats.savings >= 20 },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <span className="stat-label">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={s.color} size={18} />
              </div>
            </div>
            <div className="stat-value">
              {s.value !== null ? formatCurrency(s.value) : `${stats.savings.toFixed(0)}%`}
            </div>
            <div className={`flex items-center gap-1 text-xs ${s.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {s.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              <span>This FY</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight */}
      <div className="card border-indigo-500/20 bg-gradient-to-r from-indigo-600/5 to-purple-600/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Brain size={20} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-white">AI Insight</span>
              <span className="badge badge-blue text-[10px]">Groq AI</span>
            </div>
            {insightLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Generating your personalized insight...
              </div>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed">{aiInsight}</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-white mb-4">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12 }} labelStyle={{ color: '#f1f5f9' }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#gIncome)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#6366f1" fill="url(#gExpenses)" strokeWidth={2} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-0.5 bg-emerald-500 rounded" /> Income</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500"><div className="w-3 h-0.5 bg-indigo-500 rounded" /> Expenses</div>
          </div>
        </div>

        {/* Category Pie */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4">Spending Breakdown</h3>
          {categoryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-sm">
              <p>No expenses yet</p>
              <Link href="/transactions" className="text-indigo-400 text-xs mt-1">Add one →</Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#13131f', border: '1px solid #1e1e2e', borderRadius: 12 }} formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat.name] || '#6366f1' }} />
                      <span className="text-slate-400 truncate max-w-24">{cat.name}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Recent Transactions</h3>
            <Link href="/transactions" className="text-indigo-400 text-xs hover:text-indigo-300">View all →</Link>
          </div>
          <div className="space-y-1">
            {recent.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                <p>No transactions yet</p>
                <Link href="/transactions" className="text-indigo-400 text-xs mt-1 block">Add your first →</Link>
              </div>
            ) : recent.map(tx => (
              <div key={tx.id} className="table-row">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: (CATEGORY_COLORS[tx.category] || '#6366f1') + '20' }}>
                  {tx.type === 'income' ? '💰' : '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tx.description || tx.category}</p>
                  <p className="text-xs text-slate-500">{tx.category} · {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Bills */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Upcoming Bills</h3>
            <Link href="/bills" className="text-indigo-400 text-xs hover:text-indigo-300">Manage →</Link>
          </div>
          <div className="space-y-1">
            {upcomingBills.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-sm">
                <p>No pending bills</p>
                <Link href="/bills" className="text-indigo-400 text-xs mt-1 block">Add bills to track →</Link>
              </div>
            ) : upcomingBills.map(bill => {
              const today = new Date().getDate()
              const daysLeft = bill.due_day >= today ? bill.due_day - today : 31 - today + bill.due_day
              return (
                <div key={bill.id} className="table-row">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center text-lg flex-shrink-0">🔔</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{bill.name}</p>
                    <p className="text-xs text-slate-500">
                      Due in <span className={daysLeft <= 3 ? 'text-red-400 font-semibold' : 'text-yellow-400'}>{daysLeft}d</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatCurrency(bill.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

