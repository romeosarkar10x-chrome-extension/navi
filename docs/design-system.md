# Design system

All styling lives in one stylesheet: [src/entrypoints/sidepanel/index.css](../src/entrypoints/sidepanel/index.css). It is Tailwind v4 (CSS-first, no `tailwind.config.js`) plus a layer of semantic CSS variables that make theming and the type/spacing scale consistent across components. This file is imported once, in [src/entrypoints/sidepanel/index.tsx](../src/entrypoints/sidepanel/index.tsx) (as `./index.css`).

Tailwind is wired into the build via `@tailwindcss/vite` in [wxt.config.ts](../wxt.config.ts).

## Structure of `index.css`

1. **Webfont import** (must precede other rules) — Google Fonts: Space Grotesk, Hanken Grotesk, JetBrains Mono.
2. `@import "tailwindcss";`
3. **Palette + semantic aliases** in `:root`, then theme blocks.
4. `@theme inline { … }` — re-exports the theme-switchable color vars as Tailwind color utilities.
5. `@theme { … }` — static tokens (fonts, type scale, radii, animations).
6. `@layer base` — element defaults.
7. `@keyframes` — animation definitions.
8. **Irreducible CSS** — scrollbars, slider thumb, pulse/streaming dots (things with no utility form).

## Color tokens

The raw palette is defined once in `:root`:

- **Beacon** (brand accent, aurora teal): `--beacon-100…700`, plus `--beacon-rgb: 34, 221, 208` for `rgba()` tints.
- **Ink** (cool near-black ramp): `--ink-0…5`.
- **Paper** (light ramp): `--paper-0…4`.
- **Signal** (status, shared across themes): `--signal-success`, `--signal-progress`, `--signal-error`, `--signal-info` (plus `*-rgb` variants).

Semantic aliases are then assigned **per theme** so the same utility class adapts:

| Semantic group | Vars                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Surfaces       | `--surface-base`, `-sunken`, `-card`, `-raised`, `-overlay`, `-agent` |
| Lines          | `--line`, `--line-strong`, `--line-faint`                             |
| Text           | `--text-strong`, `-body`, `-muted`, `-faint`, `-on-accent`            |
| Accent         | `--accent`, `-hover`, `-press`, `-soft`, `-line`, `-text`             |
| Control        | `--control`, `-hover`, `-line`                                        |

### Themes

- **Dark** is the default (`:root, [data-theme="dark"]`, `color-scheme: dark`), built on the ink ramp.
- **Light** (`[data-theme="light"]`, `color-scheme: light`) remaps the same aliases onto the paper ramp.
- Switch by setting `data-theme` on an ancestor element. [sidepanel/index.html](../src/entrypoints/sidepanel/index.html) hardcodes `data-theme="dark"` on `<html>`; the settings Theme select is currently cosmetic (see [views.md](views.md)), so nothing toggles this attribute at runtime yet.

### Exposing colors as utilities

`@theme inline { --color-*: var(--…) }` maps semantics to Tailwind color utilities. Because it is `inline`, utilities reference the **live** variable, so they re-resolve when the theme changes. This yields classes like `bg-surface-card`, `text-muted`, `border-line-strong`, `bg-accent-soft`, `text-accent-text`, `text-success`/`progress`/`error`, `bg-beacon-400`, etc.

## Static tokens (`@theme`)

- **Fonts:** `--font-display` (Space Grotesk → Hanken fallback), `--font-ui` (Hanken Grotesk), `--font-mono` (JetBrains Mono). Utilities: `font-display`, `font-ui`, `font-mono`.
- **Type scale** (px): `text-2xs` 10, `text-xs` 11, `text-sm` 12, `text-base` 13, `text-md` 14, `text-lg` 16, `text-xl` 20, `text-2xl` 26, `text-3xl` 34. Note `base` is 13 px (compact UI), not the Tailwind default 16.
- **Radii:** `--radius-xs` 5, `sm` 8, `md` 10, `lg` 14, `xl` 20 → `rounded-xs…xl`.
- **Animations:** `animate-msg-in`, `animate-toast-in`, `animate-fade`, `animate-sheet-up`, `animate-spin-fast` (mapped from the keyframes below).

## Effects & motion (`:root`)

- **Shadows:** `--shadow-sm`, `--shadow-card`, `--shadow-pop` (popovers/sheets/toasts), `--shadow-rail` (the side panel's left edge).
- **Glows:** `--glow-focus` (focus ring — used by every focusable control's `focus-visible:shadow-[var(--glow-focus)]`), `--glow-soft`, `--glow-dot`, and per-status `--glow-success`/`-progress`/`-error`.
- **Motion:** `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` — the standard easing referenced throughout as `ease-[var(--ease-out)]`. `--blur-veil` for backdrops.

These are consumed via arbitrary-value utilities, e.g. `shadow-[var(--glow-focus)]`, `ease-[var(--ease-out)]`.

## Base layer

`html, body, #root` are full-height, zero-margin. `body` sets the UI font/`text-body`/`surface-base` background, antialiasing, and legible text rendering. `::selection` is tinted beacon.

## Keyframes

`navi-spin`, `navi-msg-in` (fade+rise, message entrance), `navi-toast-in`, `navi-fade`, `navi-sheet-up` (bottom-sheet slide), `navi-status-pulse` (expanding halo), `navi-streaming-b` (bouncing thinking dot).

## <a id="irreducible-css"></a>Irreducible CSS

Pseudo-element / vendor selectors that have no Tailwind utility form, applied via class hooks:

- **`.navi-scroll`** — quiet custom webkit scrollbars over the dark rail. Applied to every scroll region (chat list, settings, welcome, etc.).
- **`.navi-noscroll`** — hides the scrollbar for the horizontal `QuickActions` strip.
- **`.navi-pulse::after`** — the expanding halo behind a pulsing `StatusDot`.
- **`.navi-streaming-dot`** — the bouncing dots in `StreamingIndicator` (children 2 and 3 get staggered `animation-delay`).
- **`.navi-slider`** — the range input: 4 px track, 15 px beacon thumb with `--glow-dot`, focus ring, active scale. Used by the `Slider` component.
- **`prefers-reduced-motion`** — collapses all animation/transition durations to ~0.

## Working with the tokens

- Prefer semantic utilities (`bg-surface-card`, `text-muted`, `border-line`) over raw palette values so theming holds.
- For one-off tints, reference the `*-rgb` vars: `bg-[rgba(var(--signal-success-rgb),0.14)]` (the pattern the `Badge`/`StepTimeline` use).
- Reuse `ease-[var(--ease-out)]` and `duration-[120ms]` to match the existing motion feel.
- Focusable controls should carry `focus-visible:shadow-[var(--glow-focus)]`.
