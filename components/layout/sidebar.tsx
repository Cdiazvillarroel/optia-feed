'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Users, ClipboardList, Tag, Database, Package, FlaskConical, Radio,
  BarChart3, Globe, Settings, Sparkles
} from 'lucide-react'
import { useState } from 'react'
import { useAiStore } from '@/lib/utils/store'

const navItems = [
  { href: '/workspace', label: 'Workspace', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/crm', label: 'CRM', icon: ClipboardList },
  { href: '/animals', label: 'Animals', icon: Tag },
  { href: '/ingredients', label: 'Ingredients', icon: Database },
  { href: '/premixes', label: 'Premixes', icon: Package },
  { href: '/formulas', label: 'Formulas', icon: FlaskConical },
  { href: '/hub', label: 'Hub', icon: Radio },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/community', label: 'Community', icon: Globe },
]

interface SidebarProps {
  user: { name: string; plan: string; initials: string }
}

function HexLogo({ size = 36 }: { size?: number }) {
  if (size <= 36) {
    return (
      <svg viewBox="0 0 128 128" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" rx="28" fill="#BE5529"/>
        <polygon points="64,22 102,42 102,86 64,106 26,86 26,42" fill="none" stroke="#fff" strokeWidth="9" strokeLinejoin="round"/>
        <circle cx="64" cy="40" r="8" fill="#fff"/>
        <circle cx="46" cy="78" r="8" fill="#fff"/>
        <circle cx="82" cy="78" r="8" fill="#fff"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="24" fill="#BE5529"/>
      <polygon points="64,18 106,40 106,88 64,110 22,88 22,40" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinejoin="round"/>
      <line x1="64" y1="38" x2="44" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
      <line x1="64" y1="38" x2="84" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
      <line x1="44" y1="78" x2="84" y2="78" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
      <circle cx="64" cy="38" r="5.5" fill="#fff"/>
      <circle cx="44" cy="78" r="5.5" fill="#fff"/>
      <circle cx="84" cy="78" r="5.5" fill="#fff"/>
      <circle cx="64" cy="64" r="3" fill="rgba(255,255,255,0.6)"/>
    </svg>
  )
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
        <HexLogo size={36} />
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold tracking-tight leading-tight">
              <span className="text-text">Optia</span>
              <span className="text-brand ml-0.5">Feed</span>
            </div>
            <div className="text-2xs text-text-faint font-medium uppercase tracking-widest">by Agrometrics</div>
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
                ${active ? 'bg-brand/12 text-brand' : 'text-text-muted hover:bg-surface-hover hover:text-text-dim'}`}
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
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded border border-brand/25
            bg-brand/5 text-brand text-base font-semibold cursor-pointer transition-all hover:bg-brand/15"
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
            hover:bg-surface-hover transition-all no-underline ${pathname === '/settings' ? 'bg-brand/12 text-brand' : ''}`}
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
              <div className="text-2xs text-text-faint capitalize">{user.plan} Plan</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
