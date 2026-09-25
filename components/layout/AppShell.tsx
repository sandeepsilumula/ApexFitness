import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export type CurrentUser = {
  id: string
  email: string
  name: string
  goal: string | null
  subscriptionTier: string
}

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiFetch<CurrentUser>('/api/auth/me')
      .then((me) => {
        if (active) setUser(me)
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error('Could not load the current user')
        }
        if (active) router.replace('/login')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [router])

  const signOut = useCallback(() => {
    void apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }).finally(() => {
      router.push('/login')
    })
  }, [router])

  if (loading) {
    return <div className="p-8 text-caption text-slate-400">Loading your dashboard…</div>
  }

  if (!user) return null

  return (
    // Columns on `lg` and up, single column below it. Below `lg` the sidebar
    // renders nothing and the fixed BottomNav owns navigation, so the column
    // pairs with the reserved bottom padding instead of a second nav strip.
    <div className="flex min-h-screen min-w-0 flex-col lg:flex-row">
      {/* First tab stop: invisible until focused, then pinned to the top-left
          so a keyboard user can bypass the six-item nav on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4
                   focus:z-50 focus:rounded-md focus:bg-gold-500 focus:px-4
                   focus:py-2 focus:text-caption focus:font-medium focus:text-navy-950"
      >
        Skip to main content
      </a>
      <Sidebar tier={user.subscriptionTier} onSignOut={signOut} />
      <main
        id="main-content"
        className="min-w-0 flex-1 px-4 py-6 pb-[calc(var(--bottom-nav-total)+1.5rem)]
                   sm:px-6 lg:px-8 lg:pb-6"
      >
        <h1 className="mb-6 font-display text-page text-white">Welcome back, {user.name}</h1>
        {children}
      </main>
      <BottomNav tier={user.subscriptionTier} onSignOut={signOut} />
    </div>
  )
}
