import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useState } from 'react'
import type { ComponentType } from 'react'
import { Modal } from '@/components/ui/Modal'
import { CrownIcon, LogOutIcon, MoreIcon } from '@/components/ui/Icon'
import type { IconProps } from '@/components/ui/Icon'
import { NAV_ITEMS, NAV_ICON_SIZE } from './Sidebar'

/** The destinations that earn a permanent slot on the bar. Anything past the
 *  fourth is reachable through More, because five is the most that stays
 *  legible at 44px without the labels truncating on a 320px screen. */
const PRIMARY_TABS = NAV_ITEMS.slice(0, 4)

/** Routes the More tab owns. Anything not on the bar but inside the shell is
 *  reachable only through the sheet, so More must read as selected on them. */
const MORE_ROUTES = ['/coach', '/settings', '/checkout']

/** The bar's own label size. 11px is the smallest step in the app and exists
 *  only here: five labels plus a five-item icon row have to fit a 320px
 *  viewport, and this is the single place that constraint applies. */
const TAB_LABEL_SIZE = 'text-[0.6875rem] leading-none'

interface BottomNavProps {
  tier: string
  onSignOut: () => void
}

export function BottomNav({ tier, onSignOut }: BottomNavProps) {
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const closeMore = useCallback(() => setMoreOpen(false), [])
  const moreActive = MORE_ROUTES.includes(router.pathname)

  return (
    <>
      {/* The bar is fixed, so `<main>` reserves `--bottom-nav-total` (height
          plus the safe-area inset) to keep the last card scrollable into view. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-800 bg-navy-900
                   pb-[var(--safe-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch gap-2 px-2" style={{ height: 'var(--bottom-nav-height)' }}>
          {PRIMARY_TABS.map((item) => {
            const active = router.pathname === item.href
            return (
              <li key={item.href} className="flex-1">
                <TabLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                />
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-current={moreActive ? 'page' : undefined}
              className={`focus-ring relative flex h-full min-h-11 w-full flex-col items-center
                          justify-center gap-1 rounded-md ${
                            moreActive ? 'text-emerald-300' : 'text-slate-400'
                          }`}
            >
              {moreActive ? <ActiveRule /> : null}
              <MoreIcon aria-hidden="true" className={NAV_ICON_SIZE} />
              <span className={TAB_LABEL_SIZE}>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} title="More" onClose={closeMore}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.slice(4).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={closeMore}
                aria-current={router.pathname === item.href ? 'page' : undefined}
                className="focus-ring flex min-tap items-center gap-3 rounded-md px-3 py-2.5 text-caption
                           text-slate-300 hover:bg-navy-800 hover:text-white"
              >
                <item.icon aria-hidden="true" className={NAV_ICON_SIZE} />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {tier !== 'premium' ? (
          <Link
            href="/checkout"
            onClick={closeMore}
            className="focus-ring mt-4 flex min-tap items-center justify-center gap-2 rounded-md
                       bg-gold-500 px-3 py-2.5 text-caption font-medium text-navy-950"
          >
            <CrownIcon aria-hidden="true" className="size-4" />
            Go premium
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            closeMore()
            onSignOut()
          }}
          className="focus-ring mt-2 flex min-tap w-full items-center gap-3 rounded-md px-3 py-2.5
                     text-left text-caption text-slate-400 hover:bg-navy-800 hover:text-white"
        >
          <LogOutIcon aria-hidden="true" className={NAV_ICON_SIZE} />
          Sign out
        </button>
      </Modal>
    </>
  )
}

interface TabLinkProps {
  href: string
  label: string
  icon: ComponentType<IconProps>
  active: boolean
}

function TabLink({ href, label, icon: Icon, active }: TabLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring relative flex h-full min-h-11 w-full flex-col items-center
                  justify-center gap-1 rounded-md ${
                    active ? 'text-emerald-300' : 'text-slate-400'
                  }`}
    >
      {active ? <ActiveRule /> : null}
      <Icon aria-hidden="true" className={NAV_ICON_SIZE} />
      <span className={TAB_LABEL_SIZE}>{label}</span>
    </Link>
  )
}

/**
 * The 2px rule is what makes the active tab legible without relying on colour,
 * so it pairs with the emerald step rather than duplicating it.
 */
function ActiveRule() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-emerald-300"
    />
  )
}
