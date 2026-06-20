# Navi — Documentation

Exhaustive reference for the Navi codebase. For a short orientation, see the root [README.md](../README.md); for agent/contributor conventions, see [CLAUDE.md](../CLAUDE.md). This `docs/` tree goes deeper: every entrypoint, view, library module, component, and design token.

> **Project status.** The chat/agent flow is **live**. Navi talks to any OpenAI-compatible chat endpoint (via the `openai` SDK), captures a pruned DOM snapshot of the active tab, and runs a real read-act-observe agent loop with optional per-action approval. Provider config and agent settings persist to `browser.storage.local`. The legacy timer-driven `TaskView` is the one remaining simulation and is currently unreachable. See [architecture.md](architecture.md).

## Contents

| Page                                         | Covers                                                                                                            |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)           | High-level shape, runtime, the agent loop, state model, providers, the `@/` alias.                                |
| [entrypoints.md](entrypoints.md)             | `background.ts`, `content.ts`, and the `sidepanel/` host.                                                         |
| [lib.md](lib.md)                             | The non-UI core: providers, chat client, agent loop, page bridge, element picker, storage, markdown parser, `cn`. |
| [views.md](views.md)                         | `App` view router and every view module (welcome, connect, chat, task, settings, model sheet, shell).             |
| [components.md](components.md)               | The design-system library — every component, its props, and behavior.                                             |
| [design-system.md](design-system.md)         | Tailwind v4 setup, CSS design tokens, themes, type scale, animations, the irreducible CSS.                        |
| [build-and-tooling.md](build-and-tooling.md) | WXT, scripts, TypeScript, ESLint, Prettier, CI workflows, repo config.                                            |

## Repository map

Everything ships from `src/` (`srcDir: "src"` in [wxt.config.ts](../wxt.config.ts)); the `@/` alias maps to `src/`.

```
navi/
├─ src/
│  ├─ app.tsx                 → views.md (root component + view router + agent wiring)
│  ├─ types.ts                → views.md (ViewKey, ChatTurn)
│  ├─ entrypoints/            → entrypoints.md
│  │  ├─ background.ts
│  │  ├─ content.ts
│  │  └─ sidepanel/ (index.html, index.tsx, index.css)
│  ├─ lib/                    → lib.md
│  │  ├─ providers.ts, chat-client.ts, agent.ts
│  │  ├─ page-bridge.ts, element-picker.ts
│  │  ├─ storage.ts, markdown.ts, cn.ts
│  ├─ views/                  → views.md
│  │  ├─ shell.tsx, welcome-view.tsx, connect-view.tsx,
│  │  │  chat-view.tsx, task-view.tsx, settings-view.tsx
│  └─ components/             → components.md
│     ├─ core/    (icon, button, icon-button, badge, card, avatar, kbd)
│     ├─ forms/   (input, api-key-input, select, switch, slider, prompt-input)
│     ├─ feedback/(status-dot, streaming-indicator, banner, toast, tooltip)
│     ├─ chat/    (chat-message, markdown, agent-action-card, context-pill, quick-actions, step-timeline)
│     └─ index.ts (barrel)
├─ public/icon/              → static extension icons (16/32/48/96/128 px) + wxt.svg
├─ wxt.config.ts             → build-and-tooling.md
├─ eslint.config.ts, prettier.config.ts, tsconfig.json
└─ .github/workflows/        → build-and-tooling.md (ci, check-formatting, lint, type-check, unit-test)
```

> **Maintenance note.** These docs describe code that changes. When you edit a component's props, a token, a provider preset, or a workflow, update the matching page here. Treat drift between code and docs as a bug.
