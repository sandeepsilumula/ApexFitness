import Link from 'next/link'
import { useRouter } from 'next/router'
import type { ComponentType } from 'react'
import {
  ChartIcon,
  CrownIcon,
  DumbbellIcon,
  HomeIcon,
  SaladIcon,
  SettingsIcon,
  SparklesIcon,
  LogOutIcon,
} from '@/components/ui/Icon'
import type { IconProps } from '@/components/ui/Icon'

/** `icon` rides on the item rather than in a parallel lookup so a new
 *  destination cannot be added without also picking its glyph. */
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/workouts', label: 'Workouts', icon: DumbbellIcon },
  { href: '/diet', label: 'Diet', icon: SaladIcon },
  { href: '/progress', label: 'Progress', icon: ChartIcon },
  { href: '/coach', label: 'Coach', icon: SparklesIcon },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
] as const satisfies ReadonlyArray<{
  href: string
  label: string
  icon: ComponentType<IconProps>
}>

/** 20px in the nav rails: big enough to read as a shape at a glance, small
 *  enough to sit beside a 14px label without the row growing. */
export const NAV_ICON_SIZE = 'size-5'

interface SidebarProps {
  tier: string
  onSignOut: () => void
}

export function Sidebar({ tier, onSignOut }: SidebarProps) {
  const router = useRouter()

  return (
    // The `lg`-and-up column only. Below `lg` this whole column is replaced by
    // the fixed bottom tab bar in BottomNav.tsx, which carries Coach and
    // Settings behind a More sheet instead of a horizontally scrolling strip.
    <aside
      className="hidden shrink-0 flex-col border-navy-800 bg-navy-900
                 lg:flex lg:w-60 lg:border-r lg:border-b-0
                 p-4"
    >
      <Link
        href="/dashboard"
        className="focus-ring mb-6 flex min-tap items-center px-2 font-display text-xl text-white"
      >
        Apex<span className="text-gold-400">Fitness</span>
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = router.pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`focus-ring flex min-tap shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-caption transition-colors ${
                active
                  ? 'bg-navy-800 text-emerald-500'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <item.icon className={NAV_ICON_SIZE} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 border-t border-navy-800 pt-4">
        <p className="flex items-center gap-2 px-3 pb-2 text-meta font-medium uppercase tracking-[0.06em] text-slate-400">
          <CrownIcon className={NAV_ICON_SIZE} />
          {tier === 'premium' ? 'Premium member' : 'Free plan'}
        </p>
        {tier !== 'premium' ? (
          <Link
            href="/checkout"
            className="focus-ring mx-3 mb-2 flex min-tap items-center justify-center gap-2 rounded-md bg-gold-500 px-3 py-2.5 text-center text-caption font-medium text-navy-950"
          >
            Go premium
          </Link>
        ) : null}
        <button
          type="button"
          onClick={onSignOut}
          className="focus-ring flex min-tap w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-caption text-slate-400 hover:bg-navy-800 hover:text-white"
        >
          <LogOutIcon className={NAV_ICON_SIZE} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
