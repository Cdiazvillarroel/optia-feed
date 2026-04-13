'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Users, Beef, Database, FlaskConical, Radio,
  BarChart3, Settings, Sparkles, ChevronLeft
} from 'lucide-react'
import { useState } from 'react'
import { useAiStore } from '@/lib/utils/store'

const navItems = [
  { href: '/workspace', label: 'Workspace', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/animals', label: 'Animals', icon: Beef },
  { href: '/ingredients', label: 'Ingredients', icon: Database },
  { href: '/formulas', label: 'Formulas', icon: FlaskConical },
  { href: '/hub', label: 'Hub', icon: Radio },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

interface SidebarProps {
  user: { name: string; plan: string; initials: string }
}

export function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const toggleAi = useAiStore((s) => s.toggle)

  return (
    <aside
      className={`${collapsed ? 'w-[60px] min-w-[60px]' : 'w-[232px] min-w-[232px]'}
        h-screen bg-surface-sidebar flex flex-col border-r border-border
        transition-all duration-300 relative z-20`}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-3 cursor-pointer ${collapsed ? 'px-3 py-5' : 'px-5 py-5'}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-[15px]">OF</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold text-text tracking-tight leading-tight">Optia Feed</div>
            <div className="text-2xs text-text-ghost font-medium uppercase tracking-widest">by Agrometrics</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-base font-semibold transition-all duration-150 no-underline
                ${active ? 'bg-brand/10 text-brand' : 'text-text-muted hover:bg-white/5 hover:text-text-dim'}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* AI Button */}
      <div className="px-2 mb-0">
        <button
          onClick={toggleAi}
          className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded border border-brand/25
            bg-brand/5 text-brand text-base font-semibold cursor-pointer transition-all hover:bg-brand/15`}
        >
          <Sparkles size={18} />
          {!collapsed && <span>AI Assistant</span>}
        </button>
      </div>

      {/* Bottom */}
      <div className="px-2 pb-4 mt-3">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded text-base font-semibold text-text-muted
            hover:bg-white/5 transition-all no-underline ${pathname === '/settings' ? 'bg-brand/10 text-brand' : ''}`}
        >
          <Settings size={18} />
          {!collapsed && <span>Settings</span>}
        </Link>

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-t border-border mt-1">
            <div className="w-[30px] h-[30px] rounded-full bg-brand-dark flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {user.initials}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-dim">{user.name}</div>
              <div className="text-2xs text-text-ghost capitalize">{user.plan} Plan</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
