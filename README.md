# Navi

> AI-powered browser copilot sidebar.

Navi is a browser extension that adds a persistent side panel to your browser. It acts as an
AI copilot that can chat with you, read and understand the current page, and take autonomous
actions on your behalf — forming a full agent loop. Think of it as a smart assistant that lives
in your browser and can actually _do_ things, not just talk.

Navi talks to **any OpenAI-compatible chat endpoint** (via the [`openai`](https://www.npmjs.com/package/openai)
SDK). A provider is just an endpoint + model + optional API key, so cloud services and self-hosted/local
servers work the same way. Presets ship for a cloud and a self-hosted model, and you can switch or edit
them from the model picker.

> **Status:** The chat/agent flow is **live** — Navi captures the active tab as a pruned DOM snapshot and
> runs a real read-act-observe agent loop (see [`src/lib/agent.ts`](src/lib/agent.ts)) with optional
> per-action approval. Provider config and agent settings persist to `browser.storage.local`. Full
> reference in [`docs/`](docs/).

## Features

- **See the page** — summarize, extract, and answer questions in the context of what you're looking at.
- **Take action** — click, fill forms, and navigate one step at a time.
- **You stay in control** — review every agent action before it runs.
- **Provider-agnostic** — point Navi at any OpenAI-compatible endpoint (cloud or self-hosted).

## Tech stack

- [WXT](https://wxt.dev/) — browser-extension framework (Chrome & Firefox)
- [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [react-icons](https://react-icons.github.io/react-icons/)

## Getting started

This project uses [`pnpm`](https://pnpm.io/).

```bash
# Install dependencies (runs `wxt prepare` via postinstall)
pnpm install

# Start the dev server (Chrome)
pnpm run dev

# Start the dev server (Firefox)
pnpm run dev:firefox
```

The dev server does **not** auto-launch a browser. Load the extension manually from the build
output (`.output/`):

- **Chrome** — open `chrome://extensions`, enable _Developer mode_, click _Load unpacked_, and
  select `.output/chrome-mv3`.
- **Firefox** — open `about:debugging` → _This Firefox_ → _Load Temporary Add-on_, and select the
  manifest in `.output/firefox-mv2`.

Once loaded, click the Navi toolbar icon to open the side panel.

## Scripts

| Script                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| `pnpm run dev`           | Start the WXT dev server (Chrome).            |
| `pnpm run dev:firefox`   | Start the WXT dev server (Firefox).           |
| `pnpm run build`         | Build the extension for production (Chrome).  |
| `pnpm run build:firefox` | Build the extension for production (Firefox). |
| `pnpm run zip`           | Build and package a distributable zip.        |
| `pnpm run zip:firefox`   | Build and package a Firefox zip.              |
| `pnpm run compile`       | Type-check the project (`tsc --noEmit`).      |

## Project structure

```
navi/
├─ src/
│  ├─ app.tsx           # Root component + view router + agent wiring
│  ├─ types.ts          # ViewKey, ChatTurn
│  ├─ entrypoints/      # Extension entrypoints
│  │  ├─ background.ts   #   Service worker — opens the side panel on toolbar click
│  │  ├─ content.ts      #   Content script (placeholder)
│  │  └─ sidepanel/      #   Side panel UI host (index.html + index.tsx + index.css)
│  ├─ lib/             # Non-UI core: providers, chat client, agent loop,
│  │                   #   page bridge, element picker, storage, markdown, cn
│  ├─ views/           # Top-level screens (welcome, connect, chat, settings, task)
│  └─ components/      # Design-system components, re-exported from components/index.ts
│     ├─ core/          #   Buttons, icons, badges, cards, …
│     ├─ forms/         #   Inputs, selects, switches, sliders, …
│     ├─ feedback/      #   Toasts, banners, tooltips, status indicators
│     └─ chat/          #   Chat messages, markdown, agent-action cards, step timelines
├─ public/             # Static assets (extension icons)
├─ docs/               # In-depth documentation
└─ wxt.config.ts       # WXT + manifest configuration
```

The `@/` path alias maps to `src/` (e.g. `@/components/index`, `@/lib/agent`, `@/app`).
See [`docs/`](docs/) for the full reference.

## License

Private / unpublished.
