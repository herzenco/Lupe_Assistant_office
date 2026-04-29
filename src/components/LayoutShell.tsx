'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login'

  if (isLogin) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
