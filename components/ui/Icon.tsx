import type { SVGProps } from 'react'

/**
 * The app's entire icon set, hand-written because no icon library is
 * installed and adding one was out of scope. There is no emoji anywhere in
 * the UI and no second stroke weight to fall into.
 *
 * One shared visual language, and it is defined once, on `BaseIcon`:
 *
 *   - 24x24 viewBox, so every glyph is drawn on the same grid and scales to
 *     whatever size class the caller gives it
 *   - `fill="none"`, `stroke="currentColor"` — the icon takes the colour of
 *     the text next to it, so it follows a theme change with no extra class
 *   - `strokeWidth={1.5}` and round caps/joins. The single hard rule here is
 *     that 1.5 is the ONLY stroke weight in the app. A 2px icon sitting beside
 *     a 1.5px one reads as two unrelated systems, which is exactly what the
 *     old 1.75px tab bar looked like next to everything else
 *
 * Accessibility: icons are `aria-hidden` by default, because in almost every
 * position they are decorative — a lock beside the word "Premium" needs no
 * announcement. Pass `label` to opt into being named, and use it on every
 * icon-only control, where there is no text for the name to come from.
 *
 *   <LockIcon />                                  // hidden, decorative
 *   <LockIcon label="Locked" />                    // named
 *   <LockIcon className="size-4" label="Locked" /> // 16px inline
 */

export interface IconProps extends SVGProps<SVGSVGElement> {
  /**
   * Accessible name. Omit for a decorative icon (the default, `aria-hidden`);
   * supply it for an icon that carries meaning on its own — above all an
   * icon-only button, which would otherwise have no name at all.
   */
  label?: string
}

function BaseIcon({ label, className = '', children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      focusable="false"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </BaseIcon>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
      <path d="M10 20v-5h4v5" />
    </BaseIcon>
  )
}

export function DumbbellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6" />
      <path d="M7 12h10" />
    </BaseIcon>
  )
}

export function SaladIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3.5 12.5h17a8.5 8.5 0 0 1-8.5 8 8.5 8.5 0 0 1-8.5-8Z" />
      <path d="M9 12.5a3 3 0 0 1 3-3M13.5 12.5a4.5 4.5 0 0 1 4.5-4.5" />
    </BaseIcon>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16.5v-4M12.5 16.5v-8M16.5 16.5v-5.5" />
    </BaseIcon>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m10 4 1.9 4.6L16.5 10.5l-4.6 1.9L10 17l-1.9-4.6L3.5 10.5l4.6-1.9Z" />
      <path d="m17.5 14.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
    </BaseIcon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5" />
      <path d="m18.3 5.7-1.8 1.8M7.5 16.5l-1.8 1.8M18.3 18.3l-1.8-1.8M7.5 7.5 5.7 5.7" />
    </BaseIcon>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </BaseIcon>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 4.5h-8a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h8" />
      <path d="M17.5 8.5 21 12l-3.5 3.5" />
      <path d="M21 12h-9" />
    </BaseIcon>
  )
}

export function CrownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m3.5 7.5 3.5 3 5-6.5 5 6.5 3.5-3-1.5 11h-14Z" />
    </BaseIcon>
  )
}

export function XIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </BaseIcon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </BaseIcon>
  )
}
