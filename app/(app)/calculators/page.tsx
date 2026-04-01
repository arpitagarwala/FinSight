'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Calculator, TrendingUp, Percent, RefreshCw, Building } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type CalcTab = 'income_tax' | 'sip' | 'emi' | 'fd' | 'ppf' | 'gst' | 'currency' | 'loan_prepay'

export default function CalculatorsPage() {
  const [tab, setTab] = useState<CalcTab>('income_tax')

  const tabs: { id: CalcTab; label: string; icon: string }[] = [
    { id: 'income_tax', label: 'Income Tax', icon: '🏛️' },
    { id: 'sip', label: 'SIP', icon: '📈' },
    { id: 'emi', label: 'EMI', icon: '🏦' },
    { id: 'fd', label: 'FD / RD', icon: '💰' },
    { id: 'ppf', label: 'PPF', icon: '🛡️' },
    { id: 'gst', label: 'GST', icon: '🧾' },
    { id: 'currency', label: 'Currency', icon: '💱' },
    { id: 'loan_prepay', label: 'Prepayment', icon: '⚡' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div><h1 className="section-title">Financial Calculators</h1><p className="text-slate-500 text-sm">8 calculators for smart financial planning</p></div>
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${tab === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#13131f] border-[#1e1e2e] text-slate-400 hover:text-white hover:border-[#2a2a3e]'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="animate-fade-in">
        {tab === 'income_tax' && <IncomeTaxCalc />}
        {tab === 'sip' && <SIPCalc />}
        {tab === 'emi' && <EMICalc />}
        {tab === 'fd' && <FDCalc />}
        {tab === 'ppf' && <PPFCalc />}
        {tab === 'gst' && <GSTCalc />}
        {tab === 'currency' && <CurrencyCalc />}
        {tab === 'loan_prepay' && <LoanPrepayCalc />}
      </div>
    </div>
  )
}

function ResultCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-[#0f0f1a] border border-[#1e1e2e]">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function SIPCalc() {
  const [monthly, setMonthly] = useState('5000')
  const [rate, setRate] = useState('12')
  const [years, setYears] = useState('10')
  const r = parseFloat(rate) / 100 / 12
  const n = parseFloat(years) * 12
  const invested = parseFloat(monthly) * n
  const maturity = parseFloat(monthly) * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
  const gains = maturity - invested
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white flex items-center gap-2">📈 SIP Return Calculator</h2>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="label">Monthly SIP (₹)</label><input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className="input" /></div>
        <div><label className="label">Expected Return (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input" /></div>
        <div><label className="label">Duration (Years)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} className="input" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard label="Invested" value={formatCurrency(invested)} />
        <ResultCard label="Est. Returns" value={formatCurrency(gains)} sub="Wealth gained" />
        <ResultCard label="Maturity Value" value={formatCurrency(maturity)} sub={`${((gains / invested) * 100).toFixed(0)}% returns`} />
      </div>
    </div>
  )
}

function EMICalc() {
  const [principal, setPrincipal] = useState('1000000')
  const [rate, setRate] = useState('8.5')
  const [years, setYears] = useState('20')
  const r = parseFloat(rate) / 100 / 12
  const n = parseFloat(years) * 12
  const emi = (parseFloat(principal) * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const totalPay = emi * n
  const interest = totalPay - parseFloat(principal)
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">🏦 EMI Calculator</h2>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="label">Loan Amount (₹)</label><input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="input" /></div>
        <div><label className="label">Interest Rate (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input" step="0.1" /></div>
        <div><label className="label">Tenure (Years)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} className="input" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard label="Monthly EMI" value={formatCurrency(emi)} />
        <ResultCard label="Total Interest" value={formatCurrency(interest)} />
        <ResultCard label="Total Payment" value={formatCurrency(totalPay)} />
      </div>
    </div>
  )
}

function FDCalc() {
  const [principal, setPrincipal] = useState('100000')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('3')
  const [compound, setCompound] = useState('4')
  const n = parseFloat(compound)
  const t = parseFloat(years)
  const r = parseFloat(rate) / 100
  const maturity = parseFloat(principal) * Math.pow(1 + r / n, n * t)
  const interest = maturity - parseFloat(principal)
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">💰 FD / RD Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Principal (₹)</label><input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} className="input" /></div>
        <div><label className="label">Annual Rate (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input" step="0.1" /></div>
        <div><label className="label">Duration (Years)</label><input type="number" value={years} onChange={e => setYears(e.target.value)} className="input" /></div>
        <div><label className="label">Compounding</label>
          <select value={compound} onChange={e => setCompound(e.target.value)} className="input">
            <option value="1">Yearly</option><option value="2">Half-yearly</option><option value="4">Quarterly</option><option value="12">Monthly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard label="Principal" value={formatCurrency(parseFloat(principal))} />
        <ResultCard label="Interest Earned" value={formatCurrency(interest)} />
        <ResultCard label="Maturity Amount" value={formatCurrency(maturity)} sub={`${((interest / parseFloat(principal)) * 100).toFixed(1)}% total return`} />
      </div>
    </div>
  )
}

function PPFCalc() {
  const [yearly, setYearly] = useState('150000')
  const rate = 0.071
  const years = 15
  let balance = 0
  let totalInvested = 0
  for (let y = 0; y < years; y++) { balance = (balance + parseFloat(yearly)) * (1 + rate); totalInvested += parseFloat(yearly) }
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">🛡️ PPF Calculator</h2>
      <p className="text-xs text-slate-500">Fixed 15-year tenure at current rate of 7.1% p.a.</p>
      <div><label className="label">Yearly Investment (₹) <span className="text-slate-600">Max ₹1,50,000</span></label>
        <input type="number" value={yearly} onChange={e => setYearly(Math.min(parseFloat(e.target.value), 150000).toString())} className="input" max="150000" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard label="Total Invested" value={formatCurrency(totalInvested)} />
        <ResultCard label="Interest Earned" value={formatCurrency(balance - totalInvested)} sub="Tax-free!" />
        <ResultCard label="Maturity (15 yr)" value={formatCurrency(balance)} />
      </div>
      <div className="badge badge-green w-full justify-center py-2 text-sm">✅ 80C deduction eligible — save up to ₹46,800 tax/year</div>
    </div>
  )
}

function GSTCalc() {
  const [amount, setAmount] = useState('10000')
  const [gst, setGst] = useState('18')
  const [mode, setMode] = useState<'exclusive' | 'inclusive'>('exclusive')
  let base = 0, tax = 0, total = 0
  if (mode === 'exclusive') { base = parseFloat(amount); tax = base * (parseFloat(gst) / 100); total = base + tax }
  else { total = parseFloat(amount); base = total / (1 + parseFloat(gst) / 100); tax = total - base }
  const cgst = tax / 2, sgst = tax / 2
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">🧾 GST Calculator</h2>
      <div className="flex gap-2">
        {(['exclusive', 'inclusive'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${mode === m ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'border-[#2a2a3e] text-slate-500 hover:text-white'}`}>
            {m === 'exclusive' ? '+ Add GST' : 'Remove GST'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">{mode === 'exclusive' ? 'Base Amount (₹)' : 'Total Amount incl. GST (₹)'}</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" /></div>
        <div><label className="label">GST Rate (%)</label>
          <select value={gst} onChange={e => setGst(e.target.value)} className="input">
            {['0','5','12','18','28'].map(r => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
      </div>
      <div className="bg-[#0f0f1a] rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">Base Amount</span><span className="text-white font-medium">{formatCurrency(base)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">CGST ({parseFloat(gst) / 2}%)</span><span className="text-white">{formatCurrency(cgst)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">SGST ({parseFloat(gst) / 2}%)</span><span className="text-white">{formatCurrency(sgst)}</span></div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-[#1e1e2e]"><span className="text-white">Total</span><span className="text-indigo-400">{formatCurrency(total)}</span></div>
      </div>
    </div>
  )
}

function CurrencyCalc() {
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('INR')
  const [to, setTo] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  const CURRENCIES = ['INR','USD','EUR','GBP','JPY','AED','SGD','AUD','CAD','CHF']

  async function convert() {
    setLoading(true)
    try {
      const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`)
      const data = await res.json()
      setResult(data.rates[to])
      setRate(data.rates[to] / parseFloat(amount))
    } catch {
      setResult(null)
    }
    setLoading(false)
  }

  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">💱 Currency Converter</h2>
      <div className="grid grid-cols-3 gap-4 items-end">
        <div><label className="label">Amount</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" /></div>
        <div><label className="label">From</label><select value={from} onChange={e => setFrom(e.target.value)} className="input">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">To</label><select value={to} onChange={e => setTo(e.target.value)} className="input">{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
      </div>
      <button onClick={convert} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : '🔄 Convert (Live Rate)'}
      </button>
      {result !== null && (
        <div className="bg-[#0f0f1a] rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm mb-1">{amount} {from} =</p>
          <p className="text-3xl font-bold text-indigo-400">{result.toFixed(4)} {to}</p>
          {rate && <p className="text-xs text-slate-600 mt-2">1 {from} = {rate.toFixed(6)} {to} · Live rate</p>}
        </div>
      )}
    </div>
  )
}

function LoanPrepayCalc() {
  const [outstanding, setOutstanding] = useState('500000')
  const [rate, setRate] = useState('8.5')
  const [emi, setEmi] = useState('15000')
  const [prepay, setPrepay] = useState('100000')
  function calcMonths(bal: number) {
    const r = parseFloat(rate) / 100 / 12, e = parseFloat(emi)
    let b = bal, m = 0
    while (b > 0 && m < 1200) { b = b * (1 + r) - e; m++ }
    return m
  }
  const monthsWithout = calcMonths(parseFloat(outstanding))
  const monthsWith = calcMonths(parseFloat(outstanding) - parseFloat(prepay))
  const saved = monthsWithout - monthsWith
  const interestSaved = saved * parseFloat(emi) - parseFloat(prepay)
  return (
    <div className="card space-y-5">
      <h2 className="font-bold text-white">⚡ Loan Prepayment Savings</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label">Outstanding Balance (₹)</label><input type="number" value={outstanding} onChange={e => setOutstanding(e.target.value)} className="input" /></div>
        <div><label className="label">Interest Rate (%)</label><input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input" step="0.1" /></div>
        <div><label className="label">Monthly EMI (₹)</label><input type="number" value={emi} onChange={e => setEmi(e.target.value)} className="input" /></div>
        <div><label className="label">Prepayment Amount (₹)</label><input type="number" value={prepay} onChange={e => setPrepay(e.target.value)} className="input" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <ResultCard label="Without Prepay" value={`${monthsWithout} mo`} sub={`${(monthsWithout / 12).toFixed(1)} years`} />
        <ResultCard label="With Prepay" value={`${monthsWith} mo`} sub={`${(monthsWith / 12).toFixed(1)} years`} />
        <ResultCard label="Months Saved" value={`${saved} mo`} sub={interestSaved > 0 ? `Save ${formatCurrency(interestSaved)}` : 'Net interest'} />
      </div>
    </div>
  )
}

function IncomeTaxCalc() {
  const [income, setIncome] = useState('1200000')
  const [sec80c, setSec80c] = useState('150000')
  const [sec80d, setSec80d] = useState('25000')
  const [hra, setHra] = useState('0')
  const [otherDeductions, setOtherDeductions] = useState('0')
  const [age, setAge] = useState<'below60' | '60to80' | 'above80'>('below60')
  const grossIncome = parseFloat(income) || 0
  function calcOldRegime() {
    const totalDeductions = Math.min(parseFloat(sec80c) || 0, 150000) + (parseFloat(sec80d) || 0) + (parseFloat(hra) || 0) + (parseFloat(otherDeductions) || 0) + 50000
    const taxableIncome = Math.max(grossIncome - totalDeductions, 0)
    let tax = 0
    if (age === 'below60') {
      if (taxableIncome > 250000) tax += Math.min(taxableIncome - 250000, 250000) * 0.05
      if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.20
      if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30
    } else if (age === '60to80') {
      if (taxableIncome > 300000) tax += Math.min(taxableIncome - 300000, 200000) * 0.05
      if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.20
      if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30
    } else {
      if (taxableIncome > 500000) tax += Math.min(taxableIncome - 500000, 500000) * 0.20
      if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30
    }
    if (taxableIncome <= 500000) tax = 0
    const cess = tax * 0.04
    return { taxableIncome, tax, cess, total: tax + cess, deductions: totalDeductions }
  }
  function calcNewRegime() {
    const standardDeduction = 75000
    const taxableIncome = Math.max(grossIncome - standardDeduction, 0)
    let tax = 0
    const slabs = [{ limit: 400000, rate: 0 }, { limit: 800000, rate: 0.05 }, { limit: 1200000, rate: 0.10 }, { limit: 1600000, rate: 0.15 }, { limit: 2000000, rate: 0.20 }, { limit: 2400000, rate: 0.25 }, { limit: Infinity, rate: 0.30 }]
    let remaining = taxableIncome, prevLimit = 0
    for (const slab of slabs) { const slabWidth = slab.limit - prevLimit; const taxable = Math.min(remaining, slabWidth); tax += taxable * slab.rate; remaining -= taxable; prevLimit = slab.limit; if (remaining <= 0) break }
    if (taxableIncome <= 1200000) tax = 0
    const cess = tax * 0.04
    return { taxableIncome, tax, cess, total: tax + cess, deductions: standardDeduction }
  }
  const oldRegime = calcOldRegime()
  const newRegime = calcNewRegime()
  const savings = oldRegime.total - newRegime.total
  const recommended = savings > 0 ? 'New Regime' : savings < 0 ? 'Old Regime' : 'Either'
  return (
    <div className="space-y-6">
      <div className="card space-y-5">
        <h2 className="font-bold text-white flex items-center gap-2">🏛️ Income Tax Planner <span className="badge badge-blue text-[10px]">FY 2025-26</span></h2>
        <div><label className="label">Gross Annual Income (₹)</label><input type="number" value={income} onChange={e => setIncome(e.target.value)} className="input" placeholder="e.g. 1200000" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Section 80C (₹) <span className="text-slate-600 text-[10px]">Max ₹1.5L</span></label><input type="number" value={sec80c} onChange={e => setSec80c(e.target.value)} className="input" placeholder="PPF, ELSS, LIC..." /></div>
          <div><label className="label">Section 80D (₹) <span className="text-slate-600 text-[10px]">Health Insurance</span></label><input type="number" value={sec80d} onChange={e => setSec80d(e.target.value)} className="input" placeholder="25000" /></div>
          <div><label className="label">HRA Exemption (₹)</label><input type="number" value={hra} onChange={e => setHra(e.target.value)} className="input" placeholder="0" /></div>
          <div><label className="label">Other Deductions (₹)</label><input type="number" value={otherDeductions} onChange={e => setOtherDeductions(e.target.value)} className="input" placeholder="NPS, 80E, etc." /></div>
        </div>
        <div><label className="label">Age Group</label>
          <div className="flex gap-2">
            {([['below60', 'Below 60'], ['60to80', '60-80'], ['above80', 'Above 80']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setAge(val)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${age === val ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'border-[#2a2a3e] text-slate-500 hover:text-white'}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={`card border-2 ${savings > 0 ? 'border-emerald-500/30 bg-emerald-500/5' : savings < 0 ? 'border-purple-500/30 bg-purple-500/5' : 'border-indigo-500/30 bg-indigo-500/5'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Recommended</p><p className="text-xl font-bold text-white">{recommended} {savings !== 0 ? `saves you ${formatCurrency(Math.abs(savings))}` : ''}</p></div>
          <div className="text-4xl">{savings > 0 ? '🟢' : savings < 0 ? '🟣' : '⚪'}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`card ${savings < 0 ? 'ring-2 ring-purple-500/30' : ''}`}>
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-white text-sm">Old Regime</h3>{savings < 0 && <span className="badge badge-purple text-[10px]">Better</span>}</div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Gross Income</span><span className="text-white">{formatCurrency(grossIncome)}</span></div>
            <div className="flex justify-between"><span className="text-emerald-400">Deductions</span><span className="text-emerald-400">-{formatCurrency(oldRegime.deductions)}</span></div>
            <div className="h-px bg-[#1e1e2e]" /><div className="flex justify-between"><span className="text-slate-400">Taxable Income</span><span className="text-white font-medium">{formatCurrency(oldRegime.taxableIncome)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Income Tax</span><span className="text-white">{formatCurrency(oldRegime.tax)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Cess (4%)</span><span className="text-white">{formatCurrency(oldRegime.cess)}</span></div>
            <div className="h-px bg-[#1e1e2e]" /><div className="flex justify-between font-bold text-base"><span className="text-white">Total Tax</span><span className="text-red-400">{formatCurrency(oldRegime.total)}</span></div>
          </div>
        </div>
        <div className={`card ${savings > 0 ? 'ring-2 ring-emerald-500/30' : ''}`}>
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-white text-sm">New Regime</h3>{savings > 0 && <span className="badge badge-green text-[10px]">Better</span>}</div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Gross Income</span><span className="text-white">{formatCurrency(grossIncome)}</span></div>
            <div className="flex justify-between"><span className="text-emerald-400">Std. Deduction</span><span className="text-emerald-400">-{formatCurrency(newRegime.deductions)}</span></div>
            <div className="h-px bg-[#1e1e2e]" /><div className="flex justify-between"><span className="text-slate-400">Taxable Income</span><span className="text-white font-medium">{formatCurrency(newRegime.taxableIncome)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Income Tax</span><span className="text-white">{formatCurrency(newRegime.tax)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Cess (4%)</span><span className="text-white">{formatCurrency(newRegime.cess)}</span></div>
            <div className="h-px bg-[#1e1e2e]" /><div className="flex justify-between font-bold text-base"><span className="text-white">Total Tax</span><span className="text-red-400">{formatCurrency(newRegime.total)}</span></div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600 text-center">Tax calculations are approximate. Consult a CA for exact figures. Based on Union Budget 2025 slabs.</p>
    </div>
  )
}

