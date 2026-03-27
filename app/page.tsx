'use client'
import Link from 'next/link'
import { useState } from 'react'
import { TrendingUp, Shield, Zap, BarChart3, FileText, Calculator, Brain, Bell, Star, ChevronRight, Menu, X } from 'lucide-react'

const features = [
  { icon: BarChart3, title: 'Smart Dashboard', desc: 'Real-time net worth, spending patterns, and AI-generated daily insights', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { icon: FileText, title: 'Invoice Generator', desc: 'Create professional GST invoices, download as PDF, track payments', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: Calculator, title: '7 Calculators', desc: 'SIP, EMI, FD, PPF, GST, Loan Prepayment & Currency Converter', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { icon: Brain, title: 'AI Financial Advisor', desc: 'Chat with Groq AI about your finances — context-aware, instant answers', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: TrendingUp, title: 'Portfolio Tracker', desc: 'Track stocks, mutual funds & ETFs with live prices and gain/loss', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Bell, title: 'Bill Reminders', desc: 'Never miss a payment — track all recurring bills and due dates', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
]

const audiences = [
  { emoji: '👨‍🎓', title: 'Students', desc: 'Budget tracking, loan management, scholarship logs' },
  { emoji: '💼', title: 'Freelancers', desc: 'Invoice clients, track projects, estimate quarterly tax' },
  { emoji: '🏢', title: 'Small Business', desc: 'P&L view, GST invoices, expense categorization' },
  { emoji: '📈', title: 'Investors', desc: 'Portfolio tracker, SIP/MF calculator, market watchlist' },
  { emoji: '👨‍👩‍👧', title: 'Families', desc: 'Shared budgets, bill reminders, debt payoff planner' },
]

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#1e1e2e] backdrop-blur-xl" style={{ background: 'rgba(10,10,15,0.8)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="gradient-text">FinSight AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#audience" className="hover:text-white transition-colors">Who it's for</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-secondary text-sm px-4 py-2">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">Get Started Free</Link>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#1e1e2e] p-4 flex flex-col gap-3">
            <Link href="/login" className="btn-secondary w-full text-center">Sign In</Link>
            <Link href="/register" className="btn-primary w-full text-center">Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto animate-fade-in">
          <div className="badge badge-blue mb-6 mx-auto">
            <Zap size={12} /> 100% Free Forever — No Credit Card Required
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Your AI-Powered<br />
            <span className="gradient-text">Finance Copilot</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Track expenses, manage budgets, generate invoices, track investments,
            and chat with an AI advisor — all in one beautiful platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3 animate-pulse-glow">
              Start for Free <ChevronRight size={18} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-600">No credit card. No limits. Just better finances.</p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-[#1e1e2e]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { v: '10+', l: 'Features' },
            { v: '5', l: 'User Segments' },
            { v: '7', l: 'Calculators' },
            { v: 'Free', l: 'Forever' },
          ].map(s => (
            <div key={s.l}>
              <div className="text-3xl font-bold gradient-text">{s.v}</div>
              <div className="text-sm text-slate-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to master your finances</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From expense tracking to AI-powered advice — FinSight AI is the only finance app you'll ever need.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="card-hover group">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={f.color} size={22} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section id="audience" className="py-24 px-6 border-t border-[#1e1e2e]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built for <span className="gradient-text">everyone</span></h2>
            <p className="text-slate-400">Whether you're a student, freelancer, or investor — FinSight AI adapts to your needs</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {audiences.map(a => (
              <div key={a.title} className="card-hover flex items-start gap-4">
                <div className="text-3xl">{a.emoji}</div>
                <div>
                  <h3 className="font-bold text-white mb-1">{a.title}</h3>
                  <p className="text-slate-500 text-sm">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-[#1e1e2e]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600" />
            <div className="badge badge-green mx-auto mb-4">
              <Star size={12} /> Always Free
            </div>
            <h2 className="text-4xl font-bold mb-3">₹0 <span className="text-slate-500 text-xl font-normal">/ month</span></h2>
            <p className="text-slate-400 mb-8">No hidden fees. No premium plan. No limits.</p>
            <ul className="text-left space-y-3 mb-8 text-sm text-slate-300">
              {['Unlimited transactions', 'AI Advisor (Groq powered)', 'Invoice Generator + PDF', 'All 7 calculators', 'Portfolio tracker', 'Budget & goal management', 'Bill reminders', 'Financial Wealth Score'].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-primary w-full justify-center py-3 text-base">
              Get Started for Free <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-[#1e1e2e] text-center text-slate-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <TrendingUp size={12} className="text-white" />
          </div>
          <span className="text-white font-semibold">FinSight AI</span>
        </div>
        <p>© 2025 FinSight AI. Built with Next.js + Supabase. Hosted free on Vercel.</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <a href="#features" className="hover:text-slate-400 transition-colors">Features</a>
          <Link href="/login" className="hover:text-slate-400 transition-colors">Login</Link>
          <Link href="/register" className="hover:text-slate-400 transition-colors">Register</Link>
        </div>
        <div className="mt-4 flex items-center justify-center gap-1 text-slate-600">
          <Shield size={12} />
          <span>Your data is private and secured by Supabase RLS</span>
        </div>
      </footer>
    </div>
  )
}
