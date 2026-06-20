# Architecture

## What Navi is

Navi is a browser extension (Chrome MV3, Firefox MV2) that renders a persistent side panel acting as an AI copilot: it chats with the user, reads the active tab as a pruned DOM snapshot, and runs an agent loop that takes browser actions one step at a time, optionally pausing for user review. It is built with [WXT](https://wxt.dev/), React 19, TypeScript, and Tailwind CSS v4.

**Providers are generic.** Navi talks to any **OpenAI-compatible chat endpoint** through the official [`openai`](https://www.npmjs.com/package/openai) SDK (`dangerouslyAllowBrowser: true`, since it runs in a browser context). A provider is just `{ baseURL, model, apiKey }` — the key is optional, so self-hosted/keyless servers work. Two ready-made presets ship in [src/lib/providers.ts](../src/lib/providers.ts) (a cloud one and a self-hosted one); the user can edit the endpoint/model/key freely. See [lib.md](lib.md#providers).

## Source layout

All code lives under `src/` (`srcDir: "src"` in [wxt.config.ts](../wxt.config.ts)), and the `@/` import alias maps to `src/` (configured in [tsconfig.json](../tsconfig.json), not the WXT base). Three layers:

- **[src/lib/](../src/lib/)** — the non-UI core: provider config, the OpenAI client wrapper, the agent loop, the page bridge (DOM capture + action execution), the element picker, persistence, and a markdown parser. Documented in [lib.md](lib.md).
- **[src/views/](../src/views/)** + **[src/app.tsx](../src/app.tsx)** — the screens and the root component that wires the UI to the lib layer. Documented in [views.md](views.md).
- **[src/components/](../src/components/)** — the stateless/low-state design-system primitives the views compose, consumed through the [components/index.ts](../src/components/index.ts) barrel. Documented in [components.md](components.md).

Styling is Tailwind v4 utility classes plus a token layer in [src/entrypoints/sidepanel/index.css](../src/entrypoints/sidepanel/index.css). See [design-system.md](design-system.md).

## Runtime shape

```
┌──────────────────────────────────────────────────────────┐
│ Browser                                                  │
│                                                          │
│  toolbar action click                                    │
│        │                                                 │
│        ▼                                                 │
│  entrypoints/background.ts (service worker)              │
│    setPanelBehavior({ openPanelOnActionClick })          │
│        │ opens                                           │
│        ▼                                                 │
│  sidepanel/index.html ── index.tsx ── <App/>            │
│        │ (React 19, StrictMode)                          │
│        ▼                                                 │
│  app.tsx ── views/ + components/   (the entire UI)      │
│        │                                                 │
│        │  lib/page-bridge + lib/element-picker          │
│        ▼  (browser.scripting.executeScript)             │
│  active tab ◄── DOM snapshot / click·fill·select·scroll │
│        ▲                                                 │
│        │  lib/chat-client (openai SDK, fetch)           │
│        ▼                                                 │
│  OpenAI-compatible endpoint (user-configured baseURL)    │
└──────────────────────────────────────────────────────────┘
```

- **[entrypoints/background.ts](../src/entrypoints/background.ts)** — service worker. Its only job: open the side panel when the toolbar icon is clicked (`browser.sidePanel.setPanelBehavior`). See [entrypoints.md](entrypoints.md).
- **[entrypoints/sidepanel/](../src/entrypoints/sidepanel/)** — the panel host. `index.html` loads `index.tsx`, which creates a `#root` element, mounts `<App/>` under `React.StrictMode`, and imports `index.css`.
- **[entrypoints/content.ts](../src/entrypoints/content.ts)** — a placeholder content script matching only `*://*.google.com/*`. The agent does **not** rely on it: page reading and actions are injected on demand via `browser.scripting.executeScript` from the panel (see [lib.md](lib.md#page-bridge)).

WXT owns the manifest, generates `.wxt/` (typed globals, base tsconfig) on `wxt prepare`, and produces builds under `.output/`. The manifest now requests `sidePanel`, `storage`, `scripting`, `activeTab`, and `tabs`, plus `host_permissions` for `http://*/*` and `https://*/*` (so the panel can reach any user-configured endpoint cross-origin). Details in [build-and-tooling.md](build-and-tooling.md).

## The agent loop

The heart of Navi is `runAgent` in [src/lib/agent.ts](../src/lib/agent.ts), driven by `App.send` in [src/app.tsx](../src/app.tsx). One send runs this loop up to `maxSteps` times:

1. **Snapshot.** `App` captures the active tab (`capturePage`) into a `PageSnapshot` — a pruned, ref-stamped DOM tree — unless the user has detached the page. Each interactive element gets a numeric `ref` (mirrored to a live `data-navi-ref` attribute).
2. **Ask the model.** `runAgent` sends the system prompt + prior history + a user message bundling the request, any attached elements, and the snapshot JSON to `chatComplete`.
3. **Parse one action.** The model must reply with exactly one JSON object: `click` / `fill` / `select` / `scroll` (with a `ref`), or `done` (with the final answer). `parseAction` extracts it, tolerating code fences and falling back to a `done` answer if parsing fails.
4. **`done` → finish.** The text is emitted via `onAnswer` and rendered as a markdown assistant message.
5. **Otherwise execute.** The proposed action surfaces as a pending `AgentActionCard`. If `autoExecute` is off, `App` shows an inline approve/skip bar and awaits the user (`requestApproval`). On approval, `runAction` re-injects into the tab to perform it; the card updates to running → success/failed.
6. **Observe & loop.** `App` re-captures the page and feeds the result + fresh snapshot back as an observation, then the loop repeats. Hitting `maxSteps` ends with a "reached the step limit" answer.

The whole run is cancellable: `App` holds an `AbortController` (Stop button / `handleStop`), passed into both the model request and the loop.

## State model

There is **no router and no global store.** Navigation and app state are plain React `useState`/`useRef` hooks inside `App` ([src/app.tsx](../src/app.tsx)):

| State             | Type                       | Purpose                                                       |
| ----------------- | -------------------------- | ------------------------------------------------------------- |
| `view`            | `ViewKey`                  | Which screen is shown. Acts as the router.                    |
| `config`          | `ProviderConfig`           | `{ baseURL, model, apiKey }`. Loaded from / saved to storage. |
| `agentSettings`   | `AgentSettings`            | `{ autoExecute, maxSteps }`. Loaded from / saved to storage.  |
| `sheet`           | `boolean`                  | Whether the model-picker sheet is open.                       |
| `messages`        | `ChatTurn[]`               | The chat transcript (messages + inline action cards).         |
| `draft`           | `string`                   | Current composer text.                                        |
| `busy`            | `boolean`                  | Whether an agent run is in flight.                            |
| `activeTab`       | `ActiveTab \| null`        | The tab Navi is acting on (id/url/title).                     |
| `attachPage`      | `boolean`                  | Whether to send the page snapshot with the next message.      |
| `attachments`     | `ElementAttachment[]`      | Elements the user picked via the inspector.                   |
| `picking`         | `boolean`                  | Whether the element picker is active.                         |
| `pendingApproval` | `ExecutableAction \| null` | The action awaiting the user's approve/skip.                  |

Refs back the async machinery: `abortRef` (cancel a run), `approvalRef` (resolve the approval promise), `pickerDisposeRef` (tear down the picker listener).

`ViewKey` and `ChatTurn` are defined in [src/types.ts](../src/types.ts); `ChatTurn` gained an `id` (stable key so an action card can update in place) and a `text` field (plain-text mirror of `body`, used to build model history and to render assistant markdown). `ProviderConfig` lives in [providers.ts](../src/lib/providers.ts), `AgentSettings` in [storage.ts](../src/lib/storage.ts).

Child views never own cross-view state — they receive props and callbacks and call back up into `App`. Provider config and agent settings flow down to `ConnectView`/`SettingsView`/`ModelSheet`; changes are persisted via `persistConfig`/`persistAgentSettings` (state + `browser.storage.local`).

## Persistence

[src/lib/storage.ts](../src/lib/storage.ts) reads/writes two `browser.storage.local` keys: `navi:provider-config` and `navi:agent-settings`. On mount `App` loads both (falling back to defaults for missing fields). The "Save conversation history" toggle, theme, sidebar position, and action speed in `SettingsView` are **not** persisted yet — they are cosmetic local state.

## What's real vs. still stubbed

Live: provider connection (model listing + test), the agent loop, page capture and actions, the element picker, markdown rendering, and config/settings persistence.

Still stubbed:

- **`TaskView`** ([src/views/task-view.tsx](../src/views/task-view.tsx)) — a timer-driven, hardcoded job-application demo. Nothing navigates to it anymore (`App` renders it for `view === "task"`, but no code sets that view), so it is effectively dead code pending a redesign around real runs.
- **`SettingsView`** theme / sidebar-position / action-speed / save-history controls — local state only, not applied or persisted.
- **History / Recipes** views — empty states only.

## Conventions

- **Import alias `@/`** maps to `src/` — `@/components/index`, `@/lib/agent`, `@/app`. Configured via `paths` in [tsconfig.json](../tsconfig.json). Within `src/app.tsx` and the views, sibling modules are imported by relative path (`./views/...`, `../types`).
- **Barrel imports.** Components are imported from `@/components/index`, not deep paths, in view/app code. (Within `components/`, files import siblings by relative path.)
- **WXT auto-imports.** `defineBackground`, `defineContentScript` are globally available in entrypoints without imports. `browser` is imported explicitly from `wxt/browser` in the lib modules.
- **Naming.** kebab-case filenames; abbreviations are single-cased units (`apiKey`/`baseURL`/`apiURL`, `APIKeyInput`, `DOMNode`). See the rules in `.claude/rules/` and [build-and-tooling.md](build-and-tooling.md#conventions).
