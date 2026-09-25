import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', ...props },
  ref,
) {
  const inputId = id ?? `input-${props.name ?? label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-caption font-medium text-slate-300">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`focus-ring min-tap rounded-md border bg-navy-950 px-3 text-body text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 ${
          error ? 'border-red-500' : 'border-navy-800'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  )
})
