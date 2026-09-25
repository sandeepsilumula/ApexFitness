import type { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const BASE =
  'inline-flex items-center justify-center rounded-md font-medium transition-colors ' +
  'focus-ring min-tap disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-gold-600 text-navy-950 hover:bg-gold-500',
  secondary: 'border border-navy-800 bg-navy-900 text-slate-200 hover:border-gold-600',
  ghost: 'text-slate-300 hover:bg-navy-800 hover:text-white',
  success: 'bg-emerald-600 text-navy-950 hover:bg-emerald-500',
}

// Sizes are padding, not fixed heights: the `min-tap` floor in BASE carries
// every button to 44px, so `sm` and `md` differ only in breathing room. The
// label is `text-caption` at the two small steps and `text-body` at `lg`, so
// no control on the scale ever renders under 14px and a primary call to
// action gets the 16px that reads as the important one.
const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-2 text-caption',
  md: 'px-4 py-2.5 text-caption',
  lg: 'px-8 py-3 text-body',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
