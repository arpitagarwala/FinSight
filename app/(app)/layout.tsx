'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, Target, PiggyBank, CreditCard,
  FileText, Calculator, TrendingUp, Bell, Brain, BarChart2,
  Newspaper, Settings, LogOut, TrendingUpIcon, Menu, X, ChevronRight,
  User, Mail, MessageSquare, ExternalLink, Camera
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FilterProvider } from '@/lib/context/FilterContext'
import DateRangeSelector from '@/components/ui/DateRangeSelector'
import { motion, AnimatePresence } from 'framer-motion'


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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? '')
        
        // Fetch full profile including avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserName(profile.name || user.email?.split('@')[0] || 'User')
          setAvatarUrl(profile.avatar_url)
        } else {
          setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')
        }
      }
    }
    loadUser()
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

      {/* Bottom: User Section with Popover */}
      <div className="p-4 border-t border-[#1e1e2e] mt-auto relative">
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-4 right-4 mb-2 bg-[#0f0f1a] border border-[#1e1e2e] rounded-2xl shadow-2xl overflow-hidden z-50 py-2"
            >
              <div className="px-4 py-2 border-b border-[#1e1e2e] mb-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account</p>
              </div>
              
              <Link href="/settings" 
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                <Settings size={16} className="text-indigo-400" />
                Settings
              </Link>
              
              <div className="h-px bg-[#1e1e2e] my-1" />
              <p className="px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Developer</p>
              
              <a href="mailto:arpitagarwalms@gmail.com" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                <Mail size={16} />
                Email Feedback
              </a>
              <a href="https://wa.me/919957414146" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                <MessageSquare size={16} />
                WhatsApp Connect
              </a>

              <div className="h-px bg-[#1e1e2e] my-1" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={16} />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${userMenuOpen ? 'bg-white/5 border-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">Premium Member</p>
          </div>
          <ChevronRight size={14} className={`ml-auto text-slate-500 transition-transform ${userMenuOpen ? 'rotate-90' : '-rotate-90'}`} />
        </button>
      </div>
    </div>
  );

  return (
    <FilterProvider>
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
          <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e] flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
                <Menu size={22} />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  userName ? userName.charAt(0).toUpperCase() : ''
                )}
              </div>
            </div>
            <DateRangeSelector />
          </header>
          
          {/* Desktop Topbar */}
          <header className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-[#1e1e2e] flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
            <DateRangeSelector />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  )
}
