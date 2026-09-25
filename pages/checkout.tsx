import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CheckIcon } from '@/components/ui/Icon'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'

type PremiumPlan = {
  tier: 'premium'
  priceLabel: string | null
  simulated: boolean
}

type Me = { subscriptionTier: string; stripeCustomerId: string | null }

type Action = 'checkout' | 'portal' | null

const PREMIUM_FEATURES = [
  'Every premium workout and programme unlocked',
  'Full premium diet plan library',
  'Advanced progress analytics and volume trends',
  'Unlimited coach conversations',
]

/**
 * Only follow redirect targets we produced: a relative app path (simulated
 * provider) or an absolute https URL (Stripe Checkout / billing portal).
 */
function safeRedirectUrl(raw: string): string | null {
  if (raw.startsWith('/')) return raw
  try {
    return new URL(raw).protocol === 'https:' ? raw : null
  } catch {
    return null
  }
}

/** The simulated provider marks its own URLs rather than a real payment page. */
function isSimulatedUrl(url: string): boolean {
  return url.includes('simulated=1') || !url.startsWith('https://')
}

function messageFor(error: unknown, action: Exclude<Action, null>): string {
  if (error instanceof ApiError) {
    if (error.code === 'NO_CUSTOMER') {
      return 'There is no billing account on file for this user yet, so there is nothing to manage.'
    }
    // /api/auth/me and /api/auth/login use the American spelling; the billing
    // routes use the British one. Both are handled so an expired session always
    // produces the same "sign in again" message regardless of which call failed.
    if (error.code === 'UNAUTHORISED' || error.code === 'UNAUTHORIZED') {
      return 'Your session has expired. Sign in again to continue.'
    }
    if (error.code === 'NETWORK') {
      return 'We could not reach the billing service. Check your connection and try again.'
    }
  }
  return action === 'checkout'
    ? 'We could not start checkout just now. Please try again.'
    : 'We could not open the billing portal just now. Please try again.'
}

export default function CheckoutPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<PremiumPlan | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [hasCustomer, setHasCustomer] = useState(false)
  const [loading, setLoading] = useState(true)
  /** True when we could not establish the caller's tier, so no action is safe. */
  const [profileFailed, setProfileFailed] = useState(false)
  const [pending, setPending] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // The price and the simulated/live flag both come from the billing service,
  // never from a literal in this file. See pages/api/billing/plan.ts.
  useEffect(() => {
    let active = true
    apiFetch<PremiumPlan>('/api/billing/plan')
      .then((data) => {
        if (active) setPlan(data)
      })
      .catch(() => {
        if (active) setError('We could not load the current premium pricing. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    apiFetch<Me>('/api/auth/me')
      .then((me) => {
        if (!active) return
        setIsPremium(me.subscriptionTier === 'premium')
        setHasCustomer(Boolean(me.stripeCustomerId))
      })
      .catch((err: unknown) => {
        if (!active) return
        setProfileFailed(true)
        setError(messageFor(err, 'checkout'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // A simulated checkout can land back here with ?simulated=1; explain it
  // instead of leaving the user on a page that looks like a payment screen.
  useEffect(() => {
    if (router.query.simulated === '1') {
      setNotice('Simulated billing: your premium access is active. No payment was taken.')
    }
  }, [router.query.simulated])

  const handleCheckout = useCallback(async () => {
    setPending('checkout')
    setError(null)
    setNotice(null)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'premium' }),
      })
      const safeUrl = safeRedirectUrl(url)
      if (!safeUrl) {
        setError('The billing service returned an unusable checkout link. Please try again.')
        return
      }
      if (isSimulatedUrl(safeUrl)) {
        // The simulated provider did write premium to the database. Re-read it
        // rather than asserting the new tier locally, so the UI never claims a
        // subscription the server did not actually record.
        const me = await apiFetch<Me>('/api/auth/me')
        setIsPremium(me.subscriptionTier === 'premium')
        setNotice(
          isPremium
            ? 'Simulated billing: you already have premium access. No payment was taken.'
            : 'Simulated billing: your premium access is active. No payment was taken.',
        )
        return
      }
      window.location.assign(safeUrl)
    } catch (err) {
      setError(messageFor(err, 'checkout'))
    } finally {
      setPending(null)
    }
  }, [isPremium])

  const handlePortal = useCallback(async () => {
    setPending('portal')
    setError(null)
    setNotice(null)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/portal')
      const safeUrl = safeRedirectUrl(url)
      if (!safeUrl || isSimulatedUrl(safeUrl)) {
        setNotice('The billing portal is only available once real billing is configured.')
        return
      }
      window.location.assign(safeUrl)
    } catch (err) {
      setError(messageFor(err, 'portal'))
    } finally {
      setPending(null)
    }
  }, [])

  const isBusy = pending !== null
  // Without a confirmed tier we must not offer "Subscribe" — it would start a
  // real Stripe checkout for somebody who is already paying.
  const canOfferCheckout = isPremium === false && !profileFailed

  const priceLabel = plan?.priceLabel ?? null

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="font-display text-page text-white">Premium membership</h2>
          <p className="mt-1 text-caption text-slate-400">
            One plan, everything unlocked. Cancel any time from the billing portal.
          </p>
        </div>

        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>Premium</CardTitle>
            <p className="font-display text-page text-gold-400">
              {priceLabel ?? 'Price shown at checkout'}
            </p>
          </div>

          {priceLabel ? null : (
            <p className="mt-2 text-caption text-slate-400">
              Display pricing is not configured for this environment.
            </p>
          )}

          {plan?.simulated ? (
            <p className="mt-2 text-caption text-slate-400">
              No payment provider is configured, so checkout runs in simulation and no card is
              charged.
            </p>
          ) : null}

          <CardBody>
            <ul className="mt-2 space-y-2">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2 text-slate-200">
                  <CheckIcon className="size-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {loading ? (
          <p className="text-slate-400">Checking your subscription…</p>
        ) : profileFailed ? (
          <p role="alert" className="text-red-300">
            We could not confirm your current subscription, so checkout is unavailable. Reload the
            page or sign in again to continue.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            {isPremium ? (
              <p className="text-emerald-500">You are on Premium. Manage it below.</p>
            ) : null}

            {canOfferCheckout ? (
              <Button size="lg" onClick={handleCheckout} disabled={isBusy}>
                {pending === 'checkout' ? 'Starting checkout…' : 'Subscribe to Premium'}
              </Button>
            ) : null}

            {isPremium && hasCustomer ? (
              <Button variant="secondary" onClick={handlePortal} disabled={isBusy}>
                {pending === 'portal' ? 'Opening portal…' : 'Manage subscription'}
              </Button>
            ) : null}

            {isPremium && !hasCustomer ? (
              <p className="text-caption text-slate-400">
                You are on Premium, but there is no billing account on file, so there is no
                subscription to manage here.
              </p>
            ) : null}
          </div>
        )}

        {notice ? (
          <p role="status" className="rounded-md border border-emerald-600 bg-emerald-600/10 p-3 text-caption text-emerald-500">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-md border border-red-900 bg-red-950/40 p-3 text-caption text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    </AppShell>
  )
}
