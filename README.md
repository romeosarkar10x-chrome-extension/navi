# Navi

> AI-powered browser copilot sidebar.

Navi is a browser extension that adds a persistent side panel to your browser. It acts as an
AI copilot that can chat with you, read and understand the current page, and take autonomous
actions on your behalf — forming a full agent loop. Think of it as a smart assistant that lives
in your browser and can actually *do* things, not just talk.

Navi is designed to support multiple LLM providers:

- **Cloud** — Claude via the Anthropic API.
- **Local** — local models via LM Studio's OpenAI-compatible endpoint on `localhost`.

You can switch between providers from the model picker.

> **Status:** The UI and design system are in place. The chat/agent flow currently runs against
> simulated responses (see [`screens/app.tsx`](screens/app.tsx)) while the live provider
> integrations are wired up.

## Features

- **See the page** — summarize, extract, and answer questions in the context of what you're looking at.
- **Take action** — click, fill forms, and navigate one step at a time.
- **You stay in control** — review every agent action before it runs.
- **Multi-provider** — switch between cloud (Claude) and local models.

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

- **Chrome** — open `chrome://extensions`, enable *Developer mode*, click *Load unpacked*, and
  select `.output/chrome-mv3`.
- **Firefox** — open `about:debugging` → *This Firefox* → *Load Temporary Add-on*, and select the
  manifest in `.output/firefox-mv2`.

Once loaded, click the Navi toolbar icon to open the side panel.

## Scripts

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `pnpm run dev`          | Start the WXT dev server (Chrome).           |
| `pnpm run dev:firefox`  | Start the WXT dev server (Firefox).          |
| `pnpm run build`        | Build the extension for production (Chrome). |
| `pnpm run build:firefox`| Build the extension for production (Firefox).|
| `pnpm run zip`          | Build and package a distributable zip.       |
| `pnpm run zip:firefox`  | Build and package a Firefox zip.             |
| `pnpm run compile`      | Type-check the project (`tsc --noEmit`).     |

## Project structure

```
navi/
├─ entrypoints/         # Extension entrypoints
│  ├─ background.ts      #   Service worker — opens the side panel on toolbar click
│  ├─ content.ts         #   Content script injected into pages
│  └─ sidepanel/         #   Side panel UI host (HTML + React root)
├─ screens/             # Top-level views (welcome, chat, settings, task, …)
├─ components/          # Design-system components, re-exported from components/index.ts
│  ├─ core/              #   Buttons, icons, badges, cards, …
│  ├─ forms/             #   Inputs, selects, switches, sliders, …
│  ├─ feedback/          #   Toasts, banners, tooltips, status indicators
│  └─ chat/              #   Chat messages, agent-action cards, step timelines
├─ lib/                 # Shared utilities (e.g. cn.ts)
├─ assets/              # Tailwind entry stylesheet
├─ public/              # Static assets (extension icons)
└─ wxt.config.ts        # WXT + manifest configuration
```

The `@/` path alias maps to the project root (e.g. `@/components`, `@/screens/app`).

## License

Private / unpublished.
