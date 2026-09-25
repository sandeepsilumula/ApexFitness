import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      submitLabel="Sign in"
      endpoint="/api/auth/login"
      buildPayload={(values) => ({ email: values.email ?? '', password: values.password ?? '' })}
      fields={(context) => (
        <>
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={context.value('email')}
            onChange={(event) => context.onChange('email', event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={context.value('password')}
            onChange={(event) => context.onChange('password', event.target.value)}
          />
        </>
      )}
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="focus-ring tap-target-expand relative text-emerald-500 hover:text-emerald-400">
            Create a free account
          </Link>
        </>
      }
    />
  )
}
