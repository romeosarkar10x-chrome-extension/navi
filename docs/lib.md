# Library (`src/lib/`)

The non-UI core of Navi. These modules are framework-agnostic (no React) and hold everything the agent needs: provider config, the model client, the agent loop, page reading/acting, the element picker, persistence, the markdown parser, and the `cn` helper. The UI ([app.tsx](../src/app.tsx) + [views/](../src/views/)) orchestrates them.

```
providers.ts   ── config shape + presets + readiness
chat-client.ts ── openai SDK wrapper (stream / complete / list / test)
agent.ts       ── the read-act-observe loop + JSON action protocol
page-bridge.ts ── capture the DOM, run actions (injected into the tab)
element-picker.ts ── devtools-style inspector to attach elements
storage.ts     ── persist config + agent settings
markdown.ts    ── dependency-free markdown → AST parser
cn.ts          ── classname joiner
```

## <a id="providers"></a>`providers.ts` — provider config & presets

[src/lib/providers.ts](../src/lib/providers.ts)

```ts
interface ProviderConfig { baseURL: string; model: string; apiKey: string }
interface ProviderPreset { id; label; sub; icon: IconName; baseURL; model }
```

- A provider is just an **OpenAI-compatible endpoint + model + (optional) key**. There is no "cloud vs local" enum anymore — every provider is the same shape.
- **`PRESETS`** — ready-made starting points the user can pick and then tweak. Currently two: a cloud preset (Gemini via Google's OpenAI-compatible endpoint) and a self-hosted preset (a Qwen server). `WelcomeView` offers `PRESETS[0]` ("Connect a cloud model") and `PRESETS[1]` ("Use a self-hosted model"); `ConnectView` and `ModelSheet` list them all.
- **`DEFAULT_CONFIG`** — `PRESETS[0]`'s endpoint + model, empty key.
- **`matchPreset(config)`** — the preset whose `baseURL` + `model` equal the config (key ignored), or `undefined` (→ "Custom").
- **`isConfigReady(config)`** — true when `baseURL` and `model` are non-empty. The key is **not** required (keyless endpoints are valid).

## `chat-client.ts` — the model client

[src/lib/chat-client.ts](../src/lib/chat-client.ts) wraps the [`openai`](https://www.npmjs.com/package/openai) SDK. `ChatMessage` here is the **wire** shape (`{ role: "system"|"user"|"assistant", content: string }`), distinct from the UI's `ChatTurn`.

`createClient(config)` builds an `OpenAI` instance with `baseURL`, `apiKey` (falls back to `"not-needed"` so the SDK's auth header is non-empty for keyless servers), and `dangerouslyAllowBrowser: true` (required to run in the panel's browser context).

| Export | Purpose |
| --- | --- |
| `streamChat(config, messages, onToken, signal?)` | Streaming completion — calls `onToken` per delta, resolves with the full text. (Not currently used by the agent loop, which is non-streaming.) |
| `chatComplete(config, messages, signal?)` | Non-streaming completion → full assistant text. Used by `runAgent`. |
| `listModels(config, signal?)` | `GET /models` → sorted model IDs. Powers `ConnectView`'s model dropdown. Throws on failure. |
| `testConnection(config)` | Minimal `max_tokens: 1` request to validate endpoint/model/key. Throws on failure. |

All accept an `AbortSignal` so the UI can cancel in-flight requests.

## <a id="agent"></a>`agent.ts` — the agent loop

[src/lib/agent.ts](../src/lib/agent.ts) is the read-act-observe driver. It depends only on the lib layer and a set of callbacks/injected functions, so it has no React or DOM coupling.

**Types:**
- `ExecutableAction` — every `AgentAction` except `done` (i.e. `click` / `fill` / `select` / `scroll`).
- `ActionPhase` — `"pending" | "running" | "success" | "failed"` (drives the action card status).
- `AgentCallbacks` — `onThought?`, `onAction(action, phase, result?)`, `onAnswer(text)`.
- `RunAgentOptions` — config, `userText`, `snapshot`, `attachments`, `history`, callbacks, `maxSteps`, `autoExecute`, `requestApproval`, `runAction`, `recapture`, `signal`.

**The protocol.** `SYSTEM_PROMPT` instructs the model to reply with exactly one JSON object per turn:

```jsonc
{ "action": "click",  "ref": <n> }
{ "action": "fill",   "ref": <n>, "value": "<text>" }
{ "action": "select", "ref": <n>, "value": "<option text>" }
{ "action": "scroll", "ref": <n optional> }      // omit ref → scroll the page
{ "action": "done",   "text": "<answer to the user>" }
```

with an optional `"thought"` field. Read-only requests (summaries, "what can I click") are expected to answer with `done` on the first step.

**Helpers:**
- `snapshotToText(snapshot)` — serialize a `PageSnapshot` to the compact JSON handed to the model (`(no page access …)` when null).
- `parseAction(raw)` — pull the first balanced top-level JSON object (handling ```` ```json ```` fences), parse it into a typed `AgentAction`, and fall back to a `done` answer carrying the raw text if there's no valid JSON.

**`runAgent(opts)`** — seeds `[system, ...history, user]` (the user message bundles request + attachments + snapshot via `buildUserMessage`), then loops up to `maxSteps`:

1. `chatComplete` → on error (and not aborted) emit a `⚠️` answer and stop.
2. `parseAction`; emit `onThought` if present.
3. `done` → `onAnswer`, return.
4. Otherwise `onAction(action, "pending")`. If `!autoExecute`, await `requestApproval`; a skip emits a `failed` card and feeds "user skipped that action" back to the model.
5. `onAction(…, "running")` → `runAction` → `onAction(…, "success"|"failed", result)`.
6. `recapture()` and push an `observation(result, snapshot)` user message; loop.

Exhausting `maxSteps` emits a "reached the step limit" answer. Every iteration checks `signal.aborted` and bails.

## <a id="page-bridge"></a>`page-bridge.ts` — reading & acting on the page

[src/lib/page-bridge.ts](../src/lib/page-bridge.ts) is the bridge between the panel and the active tab. It uses `browser.scripting.executeScript` to inject **self-contained** functions into the page's isolated world — they are serialized via `func.toString()`, so they may only use DOM globals, their own nested helpers, and type-erased args.

**Types:** `DOMNode` (one pruned tree node — `ref`, `tag`, `role`, `text`, `href`, `type`, `label`, `value`, `placeholder`, `options`, `clickable`, `editable`, `children`), `PageSnapshot` (`url`, `title`, `selection`, `tree`, `truncated`), `AgentAction` (the union above), `ActionResult` (`{ ok, error? }`), `ElementAttachment` (`{ ref, descriptor, node }`), `ActiveTab` (`{ id, url, title }`).

| Export | Purpose |
| --- | --- |
| `getActiveTab()` | The active tab in the current window, or `null`. |
| `capturePage(tabId)` | Inject `captureFn`, return a `PageSnapshot`. Throws a friendly error on browser/extension/store pages. |
| `runAction(tabId, action)` | Inject `actionFn` to perform one action, return an `ActionResult`. |

**`captureFn`** (injected) walks `document.body` building the pruned tree under caps (`MAX_NODES` 1200, `MAX_TEXT` 150, `MAX_JSON` 14000). It clears stale `data-navi-ref` stamps, skips invisible/structural nodes, detects clickable vs editable elements, assigns each interactive element a fresh numeric `ref` (mirrored to `data-navi-ref`), records inputs' type/value/placeholder, selects' options, and labels (aria/`<label>`/placeholder). Empty non-interactive wrappers are dropped and single-child passthroughs flattened. Sets `truncated` when caps are hit. Also captures the current text `selection`.

**`actionFn`** (injected) looks the element up by `data-navi-ref`, scrolls it into view, then: `click` → `.click()`; `fill` → set value via the native setter and dispatch `input` + `change`; `select` → set value and dispatch `change`; `scroll` (no ref) → page down ~80% of the viewport.

## `element-picker.ts` — the inspector

[src/lib/element-picker.ts](../src/lib/element-picker.ts) implements a devtools-style element picker so the user can attach a specific element as chat context.

- **`startPicker(tabId, onPick)`** — registers a `browser.runtime.onMessage` listener for `navi:element-picked`, injects `pickerFn`, and returns a disposer that removes the listener.
- **`stopPicker(tabId)`** — injects a call to the page's `__naviPickerStop` to tear down the in-page UI.
- **`pickerFn`** (injected, self-contained) draws a beacon-colored highlight box + tag overlay that follow the cursor, and on click serializes the element (tag/text/href + up to 4 levels of children) into an `ElementAttachment`, stamps `data-navi-pick`, and posts it back via `chrome.runtime.sendMessage`. `Escape` stops. It uses the global `chrome.runtime` (not the bundled `browser`) because it runs in the page.

In `App`, picked attachments accumulate in `attachments`, render as `ContextPill`s, and are folded into the next user message by `runAgent`.

## `storage.ts` — persistence

[src/lib/storage.ts](../src/lib/storage.ts) reads/writes `browser.storage.local`.

- Keys: `navi:provider-config`, `navi:agent-settings`.
- `AgentSettings` — `{ autoExecute: boolean; maxSteps: number }`; `DEFAULT_AGENT_SETTINGS` is `{ autoExecute: false, maxSteps: 10 }`.
- `loadConfig()` / `saveConfig(config)`, `loadAgentSettings()` / `saveAgentSettings(settings)`. Loads spread the saved value over the defaults, so new fields degrade gracefully.

## `markdown.ts` — the markdown parser

[src/lib/markdown.ts](../src/lib/markdown.ts) is a small, dependency-free Markdown parser. It produces an **AST** of block/inline nodes (rather than an HTML string) so the [`<Markdown>` component](components.md#markdown) can render React elements — model output is never injected as raw HTML.

- **Block nodes:** `heading` (ATX + setext), `paragraph`, `blockquote`, `list` (ordered/unordered, nested, with `- [ ]` / `- [x]` task items), `code` (fenced), `table` (GFM pipe tables with alignment), `hr`.
- **Inline nodes:** `text`, `strong`, `em`, `del`, `code`, `br` (hard breaks), `link`, `image`, plus autolinks and backslash escapes.
- **Entry point:** `parseMarkdown(src)` → `BlockNode[]`. Helpers `parseInline`, `inlineText` (flatten to plain text, used for image alt) are exported too.

XSS safety (URL scheme filtering, no raw HTML) lives in the renderer, not the parser — see [components.md](components.md#markdown).

## `cn.ts` — classname helper

[src/lib/cn.ts](../src/lib/cn.ts)

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(" ");
}
```

A minimal classnames joiner — drops falsy entries and space-joins the rest. No Tailwind merge/dedupe; order matters as written. Used throughout the components and views for conditional classes.
