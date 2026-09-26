# Design System

Apex Fitness is a dark, premium fitness product. This document records the tokens and the
rules that hold them together, because every one of them lives in exactly one place —
`styles/globals.css` — and a second definition in a component is always a bug.

## Direction

Deep navy surfaces, a mint-green brand ramp for actions, and a cool gold reserved for
emphasis. The read is "at the gym at 6am", not "consumer app". Nothing in the palette is
stock Tailwind emerald; the ramp is tuned toward jade so the app does not read as a
default component library.

## Colour

### Navy surfaces

The app is a four-step ladder. Three steps was not enough: a resting card on `navy-800`
matched the page value, so the card had no edge.

| Token | Value | Used for |
| --- | --- | --- |
| `navy-950` | `#0a1128` | Page background |
| `navy-900` | `#0f172a` | Alternating page bands |
| `navy-850` | `#16203a` | Resting card |
| `navy-800` | `#1e293b` | Raised or hover surface |

### Brand (emerald-to-jade)

| Token | Value | Used for |
| --- | --- | --- |
| `brand-200` | `#6ee7c8` | Text emphasis |
| `brand-300` | `#4bd6b2` | Primary action: buttons, active tab, links |
| `brand-400` | `#2fb894` | Hover or pressed state of a `brand-300` action |
| `brand-500` | `#23a884` | Brand fill at rest, large text |
| `brand-700` | `#1c8f70` | Background, border, subtle fill only |

`brand-200/300/400/500` clear 4.5:1 on all four navy surfaces. `brand-700` clears 3:1 and
is therefore background-only — never body text.

### Gold

Gold is emphasis, not a brand colour. `gold-450` is the primary accent and the focus ring
colour; `gold-550` is for borders and subtle fills; `gold-300` is champagne, for gold text
on navy.

| Token | Value | Used for |
| --- | --- | --- |
| `gold-300` | `#e8d9a0` | Gold text on navy |
| `gold-400` | `#fbbf24` | Focus ring (stock amber, kept for existing references) |
| `gold-450` | `#c9a227` | Primary gold accent, key emphasis |
| `gold-550` | `#a8842a` | Borders and subtle fills |
| `gold-500` / `gold-600` | `#f59e0b` / `#d97706` | Stock amber steps, retained for existing code |

New work uses `gold-300`, `gold-450` and `gold-550`. Stock amber reads cheap against navy;
the cooler, less saturated gold reads as metal.

### Elevation

A pure black shadow at high opacity reads as a smudge on a near-black surface, so every
layer is a low-alpha, slightly warm navy built from a tight contact shadow plus one diffuse
layer.

| Token | Used for |
| --- | --- |
| `elevation-1` | Resting card |
| `elevation-2` | Hover or otherwise raised surface |
| `elevation-3` | Overlay: sheet, modal, drawer |

## Typography

Two faces, and they never share a size.

- **Inter** (`font-sans`) carries everything at `text-caption` and below.
- **Playfair Display** (`font-display`) is reserved for headings at `text-section` and
  above, so the display face keeps doing work.

### Scale

Six steps and nothing else. They are declared as `--text-*` tokens rather than left as
ad-hoc `text-sm` / `text-lg` utilities so the scale is a nameable contract: a reviewer can
grep `text-[` and see the one-off sizes that escaped, and a new step has to be argued for
here instead of appearing on one page.

| Token | Size | Used for |
| --- | --- | --- |
| `text-meta` | 12 | Uppercase eyebrows, axis ticks, unit chips, avatars |
| `text-caption` | 14 | Supporting copy: card bodies, stat rows, table cells |
| `text-body` | 16 | Running prose and every form control |
| `text-section` | 20 | Section headings and card titles (display face) |
| `text-page` | 30 | Page headings (display face) |
| `text-display` | 44 | The single hero word on the landing page |

Two rules ride on top of the ladder:

1. `text-body` is the floor for anything the user can type into or read as a paragraph.
   iOS Safari zooms any form control under 16px on focus, so no `text-caption` on an
   `<input>` or `<select>`.
2. `text-meta` uppercase metadata takes `tracking-[0.06em]`, which keeps capitals legible at
   12px without the loose 0.25em tracking that made small caps look airy. Nothing else is
   tracked.

## Components

The primitive set lives in `components/ui` and is deliberately small: `Button`, `Card`,
`Input`, `Modal`, `Toast`, `Icon`. Layout shells are `AppShell`, `Sidebar`, `BottomNav` and
`PublicNav`; `AuthForm` and `HeroSessionPicker` are the two feature components.

Every interactive primitive is held to the same three rules, defined once in
`styles/globals.css` and applied by the component:

- `focus-ring` — the single focus treatment for the whole app. A 2px navy offset ring plus
  a 4px gold ring, drawn entirely outside the border box, so a gold-filled button does not
  need a separate variant. One definition means a nav link, a button and a text input cannot
  drift apart.
- `min-tap` — 44px minimum in the smallest axis (WCAG 2.5.8), carried by padding and
  min-height so no control has to grow visually to satisfy it.
- `tap-target-expand` — for inline or icon-only controls that must not change size. An
  invisible 44px pseudo-element extends the hit area. Requires `position: relative` on the
  element.

## Layout

### Responsive model

Mobile-first. The phone is the primary surface, not an afterthought — the app is installed
as a PWA and most sessions are one-handed.

### Navigation

Three shells, one per context:

- `PublicNav` — marketing and auth pages.
- `Sidebar` — persistent left rail, desktop and tablet.
- `BottomNav` — primary tab bar, phones only.

The bottom bar's geometry is defined once in `:root` so the bar and the content padding that
clears it cannot drift apart:

```css
--safe-bottom: env(safe-area-inset-bottom, 0px);
--bottom-nav-height: 4.25rem;
--bottom-nav-total: calc(var(--bottom-nav-height) + var(--safe-bottom));
```

`--safe-bottom` is the iOS home indicator / Android gesture bar inset and resolves to 0px on
desktop, so one value works in both the bar's own padding and `<main>`'s reserve.

## Texture and motion

Two fixed, `aria-hidden`, `pointer-events: none` overlays add depth without cost: `.grain`
(2.5% SVG fractal noise) and `.glow` (4% radial gold wash from the top centre). Both are
suppressed under `forced-colors: active`.

Loading states use `.animate-shimmer`, a 1.5s linear sweep across a slate gradient. It
collapses to a flat fill under `prefers-reduced-motion: reduce`, and so does every other
animation and transition in the app.

## Accessibility

The design system is built to be audited, not just looked at.

- `scripts/design-audit.mjs` checks token conformance and contrast.
- `scripts/audit.js` checks structural and accessibility rules.
- `lib/contrast.ts` implements the WCAG contrast maths and is unit-tested
  (`tests/unit/contrast.test.ts`).
- `e2e/mobile.spec.ts` runs at a real phone viewport (Pixel 5, `isMobile: true`) to catch the
  horizontal-overflow regressions that only appear on narrow screens.

A colour token that clears 4.5:1 on all four navy surfaces is documented as such above. A new
colour is not finished until it is measured and added to that list.

## PWA surface

`manifest.webmanifest` declares standalone display, `#0A1028` theme colour and four icons
including a maskable 512. `sw.js` precaches the shell — manifest, icons, offline fallback —
and deliberately does not precache Next's hashed build output, whose filenames are only known
after `next build`; those are picked up by the runtime handlers instead. `offline.html` is
the fallback page. The worker registers in production only, so dev HMR and the e2e suite's
second dev server stay worker-free.
