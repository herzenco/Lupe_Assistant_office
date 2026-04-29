'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { Activity, DollarSign, LayoutList, Zap, Heart } from 'lucide-react'

const mobileItems = [
  { href: '/', label: 'Activity', icon: Activity },
  { href: '/costs', label: 'Costs', icon: DollarSign },
  { href: '/tasks', label: 'Tasks', icon: LayoutList },
  { href: '/actions', label: 'Actions', icon: Zap },
  { href: '/health', label: 'Health', icon: Heart },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-50">
      {mobileItems.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              isActive ? 'text-indigo-400' : 'text-zinc-500'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
