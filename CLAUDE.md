# CLAUDE.md

Guidance for working in this repository.

## What this is

**Navi** is an AI-powered browser copilot delivered as a WXT browser extension (Chrome MV3 + Firefox MV2). It adds a persistent side panel that chats with the user, reads the current page (as a pruned DOM snapshot), and runs a real read-act-observe agent loop to take actions on their behalf with optional per-action approval. It talks to **any OpenAI-compatible chat endpoint** via the `openai` SDK — a provider is just `{ baseURL, model, apiKey }` (key optional), with presets for a cloud and a self-hosted model.

**Status:** The chat/agent flow is **live** ([src/app.tsx](src/app.tsx) `send()` → [src/lib/agent.ts](src/lib/agent.ts) `runAgent`). Page capture/actions go through [src/lib/page-bridge.ts](src/lib/page-bridge.ts) (`browser.scripting.executeScript`); provider config + agent settings persist to `browser.storage.local`. The only remaining stub is the legacy timer-driven `TaskView`, which nothing navigates to. Deeper reference lives in [docs/](docs/).

## Tech stack

- [WXT](https://wxt.dev/) — browser-extension framework. Owns the manifest, entrypoints, build, and dev server.
- React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- [`openai`](https://www.npmjs.com/package/openai) — SDK for any OpenAI-compatible chat endpoint (runs with `dangerouslyAllowBrowser`)
- react-icons
- Package manager: **pnpm** (see rules below)

## Commands

Run scripts with `pnpm run <script>` (not the `pnpm <script>` shorthand).

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install deps; `postinstall` runs `wxt prepare` (generates `.wxt/`). |
| `pnpm run dev` / `pnpm run dev:firefox` | Dev server. Does **not** auto-launch a browser — load `.output/` manually. |
| `pnpm run build` / `pnpm run build:firefox` | Production build. |
| `pnpm run zip` / `pnpm run zip:firefox` | Build + package a distributable zip. |
| `pnpm run type-check` / `pnpm run compile` | `tsc` type-check (`compile` uses `--noEmit`). |
| `pnpm run lint` | ESLint (needs the `unstable_native_nodejs_ts_config` flag). |
| `pnpm run format` / `pnpm run format:check` | Prettier write / check. |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on push to `main`, chaining reusable workflows **in order**: check-formatting → lint → type-check (each `needs` the previous). A `unit-test` job exists but is commented out (no tests yet).

## Code style

Match existing files — these are enforced by tooling:

- **Prettier** ([prettier.config.ts](prettier.config.ts)): 4-space tabs, `printWidth` 120, semicolons, `arrowParens: "avoid"` (`x => ...`, not `(x) => ...`), `bracketSameLine: true`, `singleAttributePerLine: true` (JSX), `trailingComma: "all"`, LF line endings.
- **ESLint** ([eslint.config.ts](eslint.config.ts)): JS + typescript-eslint recommended. Unused vars are errors unless prefixed `_` (`argsIgnorePattern`/`varsIgnorePattern: "^_"`); empty catch blocks are allowed. Ignores `.wxt`, `coverage`, `tmp`.

## Project structure

All code lives under `src/` (`srcDir: "src"`); the `@/` alias maps to `src/`.

```
navi/
├─ src/
│  ├─ app.tsx            # Root component + view router + agent wiring (the real send() loop)
│  ├─ types.ts           # ViewKey, ChatTurn
│  ├─ entrypoints/       # WXT extension entrypoints
│  │  ├─ background.ts    #   Service worker — opens side panel on toolbar click
│  │  ├─ content.ts       #   Content script (placeholder; agent uses scripting.executeScript instead)
│  │  └─ sidepanel/       #   Side panel host: index.html + index.tsx (React root → <App/>) + index.css
│  ├─ lib/              # Non-UI core (no React)
│  │  ├─ providers.ts     #   ProviderConfig, presets, readiness
│  │  ├─ chat-client.ts   #   openai SDK wrapper (stream/complete/list/test)
│  │  ├─ agent.ts         #   runAgent loop + JSON action protocol
│  │  ├─ page-bridge.ts   #   capture DOM snapshot, run actions (injected into the tab)
│  │  ├─ element-picker.ts#   devtools-style inspector to attach elements
│  │  ├─ storage.ts       #   persist config + agent settings (browser.storage.local)
│  │  ├─ markdown.ts      #   dependency-free markdown → AST parser
│  │  └─ cn.ts            #   classname helper
│  ├─ views/            # Top-level screens, switched by useState in app.tsx
│  │  ├─ shell.tsx        #   NaviLogo + TopBar
│  │  ├─ welcome-view.tsx #   WelcomeView
│  │  ├─ connect-view.tsx #   ConnectView (provider setup)
│  │  ├─ chat-view.tsx    #   ChatView
│  │  ├─ task-view.tsx    #   TaskView (legacy, simulated, unreachable)
│  │  └─ settings-view.tsx#   SettingsView, ModelSheet
│  └─ components/       # Design-system components, barrel-exported from components/index.ts
│     ├─ core/           #   Button, Icon, Badge, Card, Avatar, Kbd, IconButton
│     ├─ forms/          #   Input, Select, Switch, Slider, PromptInput, APIKeyInput
│     ├─ feedback/       #   StatusDot, StreamingIndicator, Banner, Toast, Tooltip
│     └─ chat/           #   ChatMessage, Markdown, AgentActionCard, ContextPill, QuickActions, StepTimeline
├─ public/              # Static assets (extension icons)
└─ wxt.config.ts        # WXT + manifest config (srcDir, permissions, host_permissions)
```

### Conventions

- **Import alias:** `@/` maps to `src/` (via `paths` in tsconfig) — `@/components/index`, `@/lib/agent`, `@/app`. Sibling modules in `app.tsx`/views use relative paths (`./views/...`, `../types`).
- **Components** are consumed via the `components/index.ts` barrel, not deep imports.
- **Navigation** is local React state (`ViewKey` in app.tsx), not a router.
- **Providers** are generic OpenAI-compatible endpoints (`ProviderConfig`); there is no cloud/local enum. The API key is optional.
- WXT globals (`defineBackground`, `defineContentScript`) are auto-imported; `browser` is imported from `wxt/browser` in lib modules.

## Repository rules (from `.claude/rules/`)

- **Package manager** — use `pnpm` only; always `pnpm run <script>`.
- **Naming** — files are kebab-case. Identifiers follow TS casing (camelCase / PascalCase), and abbreviations are a single cased unit: `apiURL`, `userID`, `APIClient`, `HTTPRequest` — never `Api`, `Url`, `Id`.
- **Git commits** — small, focused, one logical change each. Author Claude's commits as Claude using **per-command** flags (never change repo git config):
  ```
  git -c commit.gpgsign=false -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -m "..."
  ```
  Disable GPG signing on Claude's commits via the `-c commit.gpgsign=false` flag above.
