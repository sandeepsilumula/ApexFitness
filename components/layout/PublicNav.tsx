import Link from 'next/link'

interface PublicNavProps {
  signedIn?: boolean
}

export function PublicNav({ signedIn = false }: PublicNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-navy-800 px-8 py-4">
      <Link href="/" className="focus-ring flex min-tap items-center font-display text-xl text-white">
        Apex<span className="text-gold-400">Fitness</span>
      </Link>
      <nav className="flex items-center gap-4 text-caption">
        {signedIn ? (
          <Link href="/dashboard" className="focus-ring flex min-tap items-center text-slate-300 hover:text-white">
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login" className="focus-ring flex min-tap items-center text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="focus-ring flex min-tap items-center rounded-md bg-gold-600 px-4 py-2.5 font-medium text-navy-950 hover:bg-gold-500"
            >
              Start free
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
