import Link from 'next/link'
import { AuthForm } from '@/components/auth/AuthForm'
import { Input } from '@/components/ui/Input'

const MIN_PASSWORD_LENGTH = 8

export default function SignupPage() {
  return (
    <AuthForm
      title="Create your account"
      subtitle="Free forever, and no card required to get started."
      submitLabel="Create account"
      endpoint="/api/auth/signup"
      buildPayload={(values) => ({
        name: values.name ?? '',
        email: values.email ?? '',
        password: values.password ?? '',
      })}
      fields={(context) => (
        <>
          <Input
            label="Name"
            name="name"
            autoComplete="name"
            required
            value={context.value('name')}
            onChange={(event) => context.onChange('name', event.target.value)}
          />
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
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={context.value('password')}
            onChange={(event) => context.onChange('password', event.target.value)}
          />
          <p className="-mt-2 text-caption text-slate-400">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </>
      )}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="focus-ring tap-target-expand relative text-emerald-500 hover:text-emerald-400">
            Sign in
          </Link>
        </>
      }
    />
  )
}
