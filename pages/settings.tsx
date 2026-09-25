import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'

type Me = { subscriptionTier: string; stripeCustomerId: string | null }

type Action = 'portal' | null

/**
 * Stripe Checkout redirects here on success and on cancel
 * (lib/services/billing/stripe.ts), and the billing portal returns here too.
 * The page re-reads the tier from the server rather than trusting the query
 * string: the webhook that grants premium can land after the redirect, so the
 * query param is a hint, not a fact.
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  )
}

function SettingsContent() {
  const router = useRouter()
  const [isPremium, setIsPremium] = useState(false)
  const [hasCustomer, setHasCustomer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileFailed, setProfileFailed] = useState(false)
  const [pending, setPending] = useState<Action>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
        if (err instanceof ApiError && (err.code === 'UNAUTHORISED' || err.code === 'UNAUTHORIZED')) {
          setError('Your session has expired. Sign in again to continue.')
        } else {
          setError('We could not load your subscription details.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Surface where Stripe sent the user, but describe the outcome in terms of
  // the tier we actually loaded below rather than promising a payment landed.
  const checkoutResult =
    router.query.checkout === 'success' ? 'success' : router.query.checkout === 'canceled' ? 'canceled' : null

  const handlePortal = useCallback(async () => {
    setPending('portal')
    setError(null)
    setNotice(null)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/portal')
      let safeUrl: string | null = null
      try {
        safeUrl = new URL(url).protocol === 'https:' ? url : null
      } catch {
        safeUrl = null
      }
      if (!safeUrl) {
        setNotice('The billing portal is only available once real billing is configured.')
        return
      }
      window.location.assign(safeUrl)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_CUSTOMER') {
        setError('There is no billing account on file for this user yet, so there is nothing to manage.')
        return
      }
      setError('We could not open the billing portal just now. Please try again.')
    } finally {
      setPending(null)
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-page text-white">Settings</h2>
        <p className="mt-1 text-caption text-slate-400">Your plan and billing details.</p>
      </div>

      {checkoutResult && !loading && !profileFailed ? (
        <p
          role="status"
          className={
            checkoutResult === 'success'
              ? 'rounded-md border border-emerald-600 bg-emerald-600/10 p-3 text-caption text-emerald-500'
              : 'rounded-md border border-navy-800 bg-navy-900 p-3 text-caption text-slate-300'
          }
        >
          {checkoutResult === 'success'
            ? isPremium
              ? 'Checkout completed. Premium is active on your account.'
              : 'Checkout completed. Premium can take a moment to activate — refresh in a few seconds if it has not.'
            : 'Checkout was canceled. You have not been charged.'}
        </p>
      ) : null}

      <Card>
        <CardTitle>Subscription</CardTitle>
        <CardBody>
          {loading ? (
            <p className="text-slate-400">Checking your subscription…</p>
          ) : profileFailed ? (
            <p role="alert" className="text-red-300">
              We could not confirm your current subscription.
            </p>
          ) : isPremium ? (
            <div className="space-y-3">
              <p className="text-emerald-500">You are on Premium.</p>
              {hasCustomer ? (
                <Button variant="secondary" onClick={handlePortal} disabled={pending !== null}>
                  {pending === 'portal' ? 'Opening portal…' : 'Manage subscription'}
                </Button>
              ) : (
                <p className="text-caption text-slate-400">
                  There is no billing account on file, so there is no subscription to manage here.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-300">You are on the free plan.</p>
              <a href="/checkout" className="focus-ring rounded-md">
                <Button>Upgrade to Premium</Button>
              </a>
            </div>
          )}
        </CardBody>
      </Card>

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
  )
}
