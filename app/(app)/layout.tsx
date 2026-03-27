'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, Target, PiggyBank, CreditCard,
  FileText, Calculator, TrendingUp, Bell, Brain, BarChart2,
  Newspaper, Settings, LogOut, TrendingUpIcon, Menu, X, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { href: '/budgets', icon: Target, label: 'Budgets' },
  { href: '/goals', icon: PiggyBank, label: 'Goals' },
  { href: '/debts', icon: CreditCard, label: 'Debts' },
  null, // divider
  { href: '/invoices', icon: FileText, label: 'Invoices' },
  { href: '/calculators', icon: Calculator, label: 'Calculators' },
  { href: '/portfolio', icon: TrendingUp, label: 'Portfolio' },
  { href: '/bills', icon: Bell, label: 'Bills' },
  null, // divider
  { href: '/ai-advisor', icon: Brain, label: 'AI Advisor' },
  { href: '/wealth-score', icon: BarChart2, label: 'Wealth Score' },
  { href: '/news', icon: Newspaper, label: 'Finance News' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? '')
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
      }
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-[#1e1e2e]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <TrendingUpIcon size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg block leading-none">FinSight</span>
            <span className="text-indigo-400 text-xs font-medium">AI</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (!item) return <div key={i} className="my-3 h-px bg-[#1e1e2e]" />
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              onClick={() => setSidebarOpen(false)}>
              <item.icon size={17} />
              <span>{item.label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto text-indigo-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings, Contact, User */}
      <div className="p-3 border-t border-[#1e1e2e] space-y-1">
        <Link href="/settings" className={pathname === '/settings' ? 'sidebar-link-active' : 'sidebar-link'}>
          <Settings size={17} /><span>Settings</span>
        </Link>

        <div className="p-4 border-t border-[#1e1e2e] space-y-1">
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-2">Connect with Developer</p>
          <a href="mailto:contact@arpitagarwala.online" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            Email Feedback
          </a>
          <a href="https://wa.me/919999999999?text=Hi%20Arpit,%20I%20saw%20your%20FinSight%20App%20and%20wanted%20to%20connect!" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            WhatsApp
          </a>

          <div className="mt-4 pt-4 border-t border-[#1e1e2e]">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mb-2">
              <LogOut size={18} />
              Sign Out
            </button>
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{userName}</p>
                <p className="text-xs text-slate-500">Free Plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#1e1e2e] flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 flex-col border-r border-[#1e1e2e] z-10 flex" style={{ background: 'var(--bg-secondary)' }}>
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-[#1e1e2e] flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="font-bold gradient-text text-lg">FinSight AI</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
