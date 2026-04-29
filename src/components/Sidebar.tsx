'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Activity,
  DollarSign,
  LayoutList,
  Calendar,
  MessageSquare,
  Heart,
  Zap,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Activity', icon: Activity },
  { href: '/costs', label: 'Costs', icon: DollarSign },
  { href: '/tasks', label: 'Tasks', icon: LayoutList },
  { href: '/actions', label: 'Actions', icon: Zap },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/health', label: 'Health', icon: Heart },
]

export function Sidebar() {
  const pathname = usePathname()

  const handleLogout = async () => {
    document.cookie = 'session=; Max-Age=0; path=/'
    window.location.href = '/login'
  }

  return (
    <aside className="hidden md:flex w-64 flex-col bg-zinc-900 border-r border-zinc-800 h-screen">
      <div className="p-6">
        <h1 className="text-lg font-bold text-white">Lupe Command Center</h1>
        <p className="text-xs text-zinc-500 mt-1">AI Assistant Dashboard</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors w-full"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}
