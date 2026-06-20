# Component library

The [src/components/](../src/components/) directory is Navi's design system. Every component is exported from the barrel [src/components/index.ts](../src/components/index.ts) and imported as `import { Button, Icon } from "@/components/index"`. Components are presentational and mostly stateless; a few hold small local UI state (open/shown/expanded). All styling is Tailwind utility classes referencing the tokens in [design-system.md](design-system.md). Class composition uses the `cn` helper (documented in [lib.md](lib.md#cnts--classname-helper)).

Files are grouped into four folders: **core**, **forms**, **feedback**, **chat**.

---

## core/

### Icon

[components/core/icon.tsx](../src/components/core/icon.tsx) — thin wrapper over **react-icons (Lucide / `Lu*` set)**.

- Maintains a `ICONS` map from kebab-case names → Lucide components, typed `satisfies Record<string, IconType>`. `IconName` is `keyof typeof ICONS`.
- Props: `name: IconName`, `size = 16`, `strokeWidth = 2`, `color = "currentColor"`, `className`, `style`.
- Renders the icon in `currentColor` at a pixel size, `aria-hidden`, `display:block; flex:none`. Unknown names fall back to `LuCircle`.
- **Adding an icon:** import the `Lu*` component and add a kebab-case entry to `ICONS`; `IconName` updates automatically. Current set (41): arrow-left, arrow-right, arrow-up, bookmark, camera, check, check-circle-2, chevron-down, circle, circle-alert, compass, cpu, download, eye, eye-off, file-text, globe, history, info, key-round, keyboard, link, loader, mouse-pointer-click, panel-right-close, pause, play, plug-zap, plus, scan-text, settings-2, shield-check, sparkles, square, table, text-cursor-input, trash-2, triangle-alert, workflow, x, zap.

### Button

[components/core/button.tsx](../src/components/core/button.tsx) — primary action button. Extends `ButtonHTMLAttributes`.

- Props: `variant` (`primary` | `secondary` | `ghost` | `danger`, default `secondary`), `size` (`sm` | `md` | `lg`, default `md`), `icon`, `iconRight` (leading/trailing `IconName`), `loading`, `full` (full width), plus native button attrs.
- `loading` swaps the leading icon for a spinning `loader` and disables the button; `disabled || loading` both disable.
- Sizes set height/padding/text; `ICON_SIZE` scales the icon per size (14/16/18).

### IconButton

[components/core/icon-button.tsx](../src/components/core/icon-button.tsx) — square icon-only button (toolbars, top bar). Extends `ButtonHTMLAttributes` minus `aria-label`.

- Props: `icon: IconName` (required), `size` (`sm`/`md`/`lg`), `variant` (`ghost` default | `solid`), `active` (renders accent-soft highlight), `label` (sets both `aria-label` and `title`).

### Badge

[components/core/badge.tsx](../src/components/core/badge.tsx) — pill status/category chip. Extends `HTMLAttributes<HTMLSpanElement>`.

- Props: `tone` (`neutral` default | `accent` | `success` | `progress` | `error` | `solid`), `icon`, `dot` (leading filled dot in `currentColor`).

### Card

[components/core/card.tsx](../src/components/core/card.tsx) — generic surface container. Extends `HTMLAttributes<HTMLDivElement>`.

- Props: `pad` (default true, `p-4`), `raised` (card shadow), `agent` (agent-tinted surface + accent border), `interactive` (hover/active affordances).

### Avatar

[components/core/avatar.tsx](../src/components/core/avatar.tsx) — chat-author avatar. Extends `HTMLAttributes<HTMLSpanElement>`.

- Props: `kind` (`user` default | `navi` | `neutral`), `initials`, `src`, `size` (`sm`/`md`/`lg` → 22/28/36 px).
- `src` → image; `navi` → sparkles icon on the beacon mark; otherwise the first two `initials`, uppercased. Font size is computed as `~0.42 × px`.

### Kbd

[components/core/kbd.tsx](../src/components/core/kbd.tsx) — keyboard key cap (`<kbd>`) for shortcut hints. Just children + class passthrough.

---

## forms/

### Input

[components/forms/input.tsx](../src/components/forms/input.tsx) — single-line text field with a leading icon and trailing slot. Extends `HTMLAttributes<HTMLDivElement>` minus `onChange`.

- Props: `value`, `onChange` (a real `<input>` change handler), `placeholder`, `type` (default `text`), `icon`, `size` (`sm`/`md`/`lg`), `invalid`, `disabled`, `trailing` (ReactNode slot, e.g. a button), `inputProps` (spread onto the inner `<input>`).
- The wrapper `<div>` gets focus-within glow; the inner input is borderless/transparent.

### APIKeyInput

[components/forms/api-key-input.tsx](../src/components/forms/api-key-input.tsx) — password-style key field. `Omit<InputProps, "type" | "icon" | "trailing">`.

- Composes `Input` with a `key-round` icon and a trailing `IconButton` (eye/eye-off) that toggles a local `shown` state between `password` and `text`. Default placeholder `sk-ant-…`.

### Select

[components/forms/select.tsx](../src/components/forms/select.tsx) — styled wrapper over a native `<select>` (keeps native a11y). Extends `HTMLAttributes<HTMLDivElement>` minus `onChange`.

- Props: `value`, `onChange` (native select handler), `options: Array<string | SelectOption>` (`SelectOption = { value, label }`; bare strings become `{value:o,label:o}`), `size` (`sm`/`md`), `disabled`.
- Renders a chevron-down adornment; the native select is appearance-none and transparent.

### Switch

[components/forms/switch.tsx](../src/components/forms/switch.tsx) — binary toggle. `role="switch"`, `aria-checked`. Extends `ButtonHTMLAttributes` minus `onChange`.

- Props: `checked`, `onChange(checked: boolean)`, `disabled`. The knob translates and recolors on state.

### Slider

[components/forms/slider.tsx](../src/components/forms/slider.tsx) — range slider with a beacon-filled track + glowing thumb (uses the `.navi-slider` CSS, see [design-system.md](design-system.md#irreducible-css)). Extends `InputHTMLAttributes` minus the controlled numeric props.

- Props: `value` (number), `min` (0), `max` (100), `step` (1), `onChange(value: number)`, `disabled`.
- Fill percent is computed inline as a `linear-gradient` background.

### PromptInput

[components/forms/prompt-input.tsx](../src/components/forms/prompt-input.tsx) — the chat composer: auto-growing textarea + attach + model switcher + send.

- Props: `value`, `onChange(value)`, `onSend()`, `onAttach()`, `onModelClick()`, `model` (default `claude-sonnet-4`), `placeholder`, `disabled`, `className`, plus the required `picking: boolean` / `onTogglePicker()` for the element-picker toggle.
- A `useEffect` on `value` resizes the textarea up to a 96 px max. **Enter** sends (when non-empty and enabled); **Shift+Enter** (or an active IME composition) inserts a newline. The send button disables when there is no trimmed text. Footer controls: an attach `IconButton`, the element-picker toggle (`mouse-pointer-click`, highlighted when `picking`), and the model pill (cpu icon + label + chevron) that calls `onModelClick`.

---

## feedback/

### StatusDot

[components/feedback/status-dot.tsx](../src/components/feedback/status-dot.tsx) — colored dot + optional label. Extends `HTMLAttributes<HTMLSpanElement>`.

- Props: `tone` (`success` | `progress` | `error` | `idle` default), `pulse` (adds the `.navi-pulse` halo animation). Children render as the label.

### StreamingIndicator

[components/feedback/streaming-indicator.tsx](../src/components/feedback/streaming-indicator.tsx) — three animated "thinking" dots (`.navi-streaming-dot`, staggered) with an optional `label`. Shown while the assistant is generating.

### Banner

[components/feedback/banner.tsx](../src/components/feedback/banner.tsx) — inline alert (`role="alert"`). Extends `HTMLAttributes<HTMLDivElement>` minus `title`.

- Props: `tone` (`info` default | `warn` | `error`), `title`, `icon` (overrides the tone's default icon: info/triangle-alert/circle-alert), `actions` (ReactNode row below the body). Children are the body text.

### Toast

[components/feedback/toast.tsx](../src/components/feedback/toast.tsx) — transient notification (`role="status"`, `animate-toast-in`). Presentational only — the caller controls placement and timeout.

- Props: `tone` (`success` | `error` | `info` default), `icon` (overrides tone default: check-circle-2/circle-alert/info), `onDismiss` (renders an × button when provided).

### Tooltip

[components/feedback/tooltip.tsx](../src/components/feedback/tooltip.tsx) — hover/focus tooltip wrapper. Wrap the trigger as the child.

- Props: `label`, `kbd` (optional shortcut hint appended), `side` (`top` default | `bottom`), `children` (the trigger). Uses a `group` + `group-hover`/`group-focus-within` reveal; bubble is `pointer-events-none`.

---

## chat/

### ChatMessage

[components/chat/chat-message.tsx](../src/components/chat/chat-message.tsx) — one chat turn bubble.

- Props: `role` (`assistant` default | `user`), `meta` (caption under the bubble, e.g. model id), `initials` (default `JD`). Children are the message body.
- `user` → reversed row, accent bubble, right-aligned meta; `assistant` → Navi avatar + neutral card bubble. The bubble carries an extensive set of descendant (`[&_…]`) styles for **rendered markdown** — headings, paragraphs, inline/fenced `code`, `ul`/`ol`/`li` (including `.navi-md-task` checkbox items), `blockquote`, `a`, `img`, `hr`, and tables — so the `<Markdown>` output is themed without per-element classes.
- In practice `ChatView` renders assistant turns as `<ChatMessage><Markdown source={turn.text} /></ChatMessage>`; user turns render plain `body`.

### Markdown

[components/chat/markdown.tsx](../src/components/chat/markdown.tsx) — renders a markdown string to React elements (no `dangerouslySetInnerHTML`).

- Prop: `source` (raw markdown). Parses via [`parseMarkdown`](lib.md#markdownts--the-markdown-parser) and walks the AST to React nodes.
- **XSS-safe:** model output is never injected as HTML; link/image URLs pass through `safeURL`, which only allows `http`/`https`/`mailto`/`tel` (and `data:` for image `src`), dropping `javascript:` and friends. Links render with `target="_blank" rel="noopener noreferrer"`.
- Visual styling lives on the surrounding `ChatMessage` bubble (above), not here — the component emits semantic elements only.

### AgentActionCard

[components/chat/agent-action-card.tsx](../src/components/chat/agent-action-card.tsx) — inline card for one browser action the agent took. Extends `HTMLAttributes<HTMLDivElement>` minus `type`.

- Exports the action vocabulary used by `ChatTurn`:
  - `ActionType = "click" | "type" | "navigate" | "scrape" | "screenshot" | "fill" | "read"` (each maps to an icon).
  - `ActionStatus = "pending" | "running" | "success" | "failed"` (each maps to an icon + color; `running` spins; `pending` circle, `success` check, `failed` ×).
  - `ActionDetail = { k: ReactNode; v: ReactNode }`.
- Props: `type` (default `click`), `label`, `status` (default `success`), `detail` (rows), `defaultOpen`. When `detail` is non-empty the card is an expand/collapse button (chevron rotates); detail rows render as monospace `k`/`v` pairs.

### ContextPill

[components/chat/context-pill.tsx](../src/components/chat/context-pill.tsx) — chip showing what Navi can currently "see" (page, selection, screenshot). Extends `HTMLAttributes<HTMLSpanElement>`.

- Props: `icon` (default `file-text`), `onRemove` (renders an × button when provided). Children are the label (truncated, max-width 200 px).

### QuickActions

[components/chat/quick-actions.tsx](../src/components/chat/quick-actions.tsx) — horizontally scrollable row of shortcut buttons above the composer (`.navi-noscroll` hides the scrollbar).

- `QuickAction = { icon?: IconName; label: ReactNode; onClick?: () => void }`. Prop: `actions: QuickAction[]`.

### StepTimeline

[components/chat/step-timeline.tsx](../src/components/chat/step-timeline.tsx) — vertical stepper for the task view.

- `Step = { label: ReactNode; status?: StepStatus; detail?: ReactNode }`; `StepStatus = "pending" | "running" | "done" | "failed"`.
- Prop: `steps: Step[]`. Each row shows a status node (number / check / × / spinner) connected by a line (the line tints success-green once `done`), the label (styled by status), and optional monospace detail. Unspecified `status` defaults to `pending`.

---

## Adding a component

1. Create the file in the right folder using kebab-case (e.g. `forms/radio-group.tsx`).
2. Build it with Tailwind utilities + tokens; compose classes with `cn`.
3. Export the component and its prop/variant types from [components/index.ts](../src/components/index.ts) — the barrel is the only public surface screens import from.
4. Document it here.
