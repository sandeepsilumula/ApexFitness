import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { ToastProvider } from '@/components/ui/Toast'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Production only. In dev the worker would intercept Next's HMR asset and
    // page requests, serving stale chunks and breaking hot reload; the e2e
    // suite also boots a second dev server, which must stay worker-free.
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // The registration itself is not a subscription, so there is nothing to
    // tear down; the flag just prevents a duplicate register if this effect
    // ever runs more than once.
    let cancelled = false

    const register = () => {
      if (cancelled) return
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failure is non-fatal: the app works without offline
        // support. Swallow rather than surface an unhandled rejection.
      })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', register)
    }
  }, [])

  return (
    <ToastProvider>
      <Head>
        <title>Apex Fitness</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </ToastProvider>
  )
}
