import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/lib/http'
import { Button } from '@/components/ui/Button'

/** The value map and the setter handed to the field renderer. */
export type AuthFieldContext = {
  value: (name: string) => string
  onChange: (name: string, value: string) => void
}

type AuthFormProps = {
  title: string
  subtitle: string
  submitLabel: string
  /** Renders the inputs. A function rather than nodes so each field can bind. */
  fields: (context: AuthFieldContext) => ReactNode
  buildPayload: (values: Record<string, string>) => Record<string, string>
  endpoint: string
  footer: ReactNode
}

function messageFor(error: unknown): string {
  // ApiError carries the server's own message, which is written to be safe to
  // show. Anything else is an unexpected shape and gets a generic line.
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  fields,
  buildPayload,
  endpoint,
  footer,
}: AuthFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(name: string, value: string) {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    try {
      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(buildPayload(values)),
      })
      // The response set the session cookie, so the app shell can read the user
      // on the next page without the token ever touching the client.
      await router.push('/dashboard')
    } catch (error) {
      setFormError(messageFor(error))
      setIsSubmitting(false)
    }
  }

  const context: AuthFieldContext = {
    value: (name) => values[name] ?? '',
    onChange: (name, value) => handleChange(name, value),
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy-800 px-8 py-4">
        <Link href="/" className="focus-ring flex min-tap w-fit items-center font-display text-xl text-white">
          Apex<span className="text-gold-400">Fitness</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-md rounded-xl border border-navy-800 bg-navy-900 p-8">
          <h1 className="font-display text-page text-white">{title}</h1>
          <p className="mt-2 text-caption text-slate-400">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
            {fields(context)}

            {formError ? (
              <p
                role="alert"
                className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-caption text-red-300"
              >
                {formError}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Just a moment…' : submitLabel}
            </Button>
          </form>

          <div className="mt-6 text-caption text-slate-400">{footer}</div>
        </div>
      </main>
    </div>
  )
}
