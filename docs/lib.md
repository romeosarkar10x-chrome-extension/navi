# Library (`src/lib/`)

The non-UI core of Navi. These modules are framework-agnostic (no React) and hold everything the agent needs: provider config, the model client, the agent loop, page reading/acting, the element picker, persistence, the markdown parser, and the `cn` helper. The UI ([app.tsx](../src/app.tsx) + [views/](../src/views/)) orchestrates them.

```
providers.ts   ── config shape + presets + readiness
chat-client.ts ── openai SDK wrapper (tool-call turn / stream / list / test)
agent/         ── the read-act-observe loop + native tool-call protocol
  index.ts     ──   runAgent loop + callbacks
  tools.ts     ──   tool defs (from Zod) + tool-call parsing
page-bridge.ts ── capture the DOM, run actions (injected into the tab)
element-picker.ts ── devtools-style inspector to attach elements
storage.ts     ── persist config + agent settings
markdown.ts    ── dependency-free markdown → AST parser
cn.ts          ── classname joiner
```

## <a id="providers"></a>`providers.ts` — provider config & presets

[src/lib/providers.ts](../src/lib/providers.ts)

```ts
interface ProviderConfig {
    baseURL: string;
    model: string;
    apiKey: string;
}
interface ProviderPreset {
    id;
    label;
    sub;
    icon: IconName;
    baseURL;
    model;
}
```

- A provider is just an **OpenAI-compatible endpoint + model + (optional) key**. There is no "cloud vs local" enum anymore — every provider is the same shape.
- **`PRESETS`** — ready-made starting points the user can pick and then tweak. Currently two: a cloud preset (Gemini via Google's OpenAI-compatible endpoint) and a self-hosted preset (a Qwen server). `WelcomeView` offers `PRESETS[0]` ("Connect a cloud model") and `PRESETS[1]` ("Use a self-hosted model"); `ConnectView` and `ModelSheet` list them all.
- **`DEFAULT_CONFIG`** — `PRESETS[0]`'s endpoint + model, empty key.
- **`matchPreset(config)`** — the preset whose `baseURL` + `model` equal the config (key ignored), or `undefined` (→ "Custom").
- **`isConfigReady(config)`** — true when `baseURL` and `model` are non-empty. The key is **not** required (keyless endpoints are valid).

## `chat-client.ts` — the model client

[src/lib/chat-client.ts](../src/lib/chat-client.ts) wraps the [`openai`](https://www.npmjs.com/package/openai) SDK. `ChatMessage` here is the simple **wire** shape (`{ role: "system"|"user"|"assistant", content: string }`) used for chat history; the agent loop builds richer `ChatCompletionMessageParam`s internally (assistant messages carrying `tool_calls`, and `tool`-role results).

`createClient(config)` builds an `OpenAI` instance with `baseURL`, `apiKey` (falls back to `"not-needed"` so the SDK's auth header is non-empty for keyless servers), and `dangerouslyAllowBrowser: true` (required to run in the panel's browser context).

| Export                                                        | Purpose                                                                                                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `streamAgentTurn(config, messages, tools, handlers, signal?)` | Streams one agent turn with tool calling. Surfaces `content` and `reasoning` deltas live via `handlers` (`onContent`/`onReasoning`), assembles streamed `tool_calls` by index, and resolves with `{ content, reasoning, toolCalls }`. **This is what `runAgent` uses.** |
| `streamChat(config, messages, onToken, signal?)`              | Streaming text completion — calls `onToken` per delta, resolves with the full text. General-purpose; not used by the agent loop.                                                                                        |
| `chatComplete(config, messages, signal?)`                     | Non-streaming completion → full assistant text. Not used by the agent loop.                                                                                                                                             |
| `listModels(config, signal?)`                                 | `GET /models` → sorted model IDs. Powers `ConnectView`'s model dropdown. Throws on failure.                                                                                                                             |
| `testConnection(config)`                                      | Minimal `max_tokens: 1` request to validate endpoint/model/key. Throws on failure.                                                                                                                                      |

`ToolCall` (`{ id, name, arguments }`) is the assembled-from-stream shape; `reasoning` comes from the non-standard `reasoning_content`/`reasoning` delta fields some endpoints emit (e.g. Qwen, DeepSeek) and feeds the UI's thinking block. All exports accept an `AbortSignal` so the UI can cancel in-flight requests.

## <a id="agent"></a>`agent/` — the agent loop

[src/lib/agent/index.ts](../src/lib/agent/index.ts) is the read-act-observe driver, with tool definitions and parsing split into [tools.ts](../src/lib/agent/tools.ts). It depends only on the lib layer and a set of callbacks/injected functions, so it has no React or DOM coupling.

**Types:**

- `ExecutableAction` — every `AgentAction` except `done` (i.e. `click` / `fill` / `select` / `scroll`). The agent no longer produces a `done` action; finishing is just a turn with no tool call.
- `ActionPhase` — `"pending" | "running" | "success" | "failed"` (drives the action card status).
- `AgentCallbacks` — the streaming surface: `onThoughtStart?`/`onThoughtToken?`/`onThought?` (the reasoning/thinking block), `onAction(action, phase, result?)`, and `onAnswerStart?`/`onAnswerToken?`/`onAnswer(text)` (the assistant's spoken text).
- `RunAgentOptions` — config, `userText`, `snapshot`, `attachments`, `history`, callbacks, `maxSteps`, `autoExecute`, `requestApproval`, `runAction`, `recapture`, `signal`.

**The protocol — native tool calls.** Rather than asking the model to emit a JSON action envelope, the loop sends real OpenAI **tools** and lets the model call them. The tools are derived from Zod schemas in [src/schemas/actions.ts](../src/schemas/actions.ts) (the single source of truth) via `z.toJSONSchema`:

| Tool     | Parameters                | Effect                                                  |
| -------- | ------------------------- | ------------------------------------------------------- |
| `click`  | `{ ref }`                 | Click an interactive element.                           |
| `fill`   | `{ ref, value }`          | Type into an input/textarea, replacing its value.       |
| `select` | `{ ref, value }`          | Choose a `<select>` option by its visible text.         |
| `scroll` | `{ ref? }`                | Scroll an element into view, or page down when no `ref`. |

When the model has nothing to act on — chat, questions, summaries, "what can I click" — it simply replies with a normal message and **no** tool call; that text is the final answer.

**Helpers (in `tools.ts`):**

- `AGENT_TOOLS` — the `ChatCompletionTool[]` built from `ACTION_PARAMS` (with `$schema` stripped, since some endpoints reject unknown top-level keys).
- `parseToolCall(name, rawArgs)` — validate a tool call's name + raw JSON arguments against the Zod schema; returns either `{ action }` (a typed `ExecutableAction`) or `{ error }` (a message fed back to the model as the tool result).

**Helpers (in `index.ts`):**

- `snapshotToText(snapshot)` — serialize a `PageSnapshot` to the compact JSON handed to the model (`(no page access …)` when null).

**`runAgent(opts)`** — seeds `[system, ...history, user]` (the user message bundles request + attachments + snapshot via `buildUserMessage`), then loops up to `maxSteps`:

1. `streamAgentTurn(config, messages, AGENT_TOOLS, …)` → on error (and not aborted) emit a `⚠️` answer and stop. `reasoning` deltas stream to the thinking block; `content` deltas stream to the answer.
2. Push the assistant turn onto `messages` (its `content` plus any `tool_calls`).
3. **No tool calls** → `onAnswer(content)`, return. (Any `content` streamed alongside tool calls is finalized as a preamble.)
4. Otherwise, for each tool call: `parseToolCall`; `onAction(action, "pending")`. If `!autoExecute`, await `requestApproval`; a skip emits a `failed` card and queues a "user skipped this action" tool result. Otherwise `onAction(…, "running")` → `runAction` → `onAction(…, "success"|"failed", result)`.
5. `recapture()` **once** after the batch, then push one `tool`-role message per call (keyed by `tool_call_id`); the fresh snapshot is appended only to the last result to save tokens. Loop.

Exhausting `maxSteps` emits a "reached the step limit" answer. Every iteration checks `signal.aborted` and bails.

## <a id="page-bridge"></a>`page-bridge.ts` — reading & acting on the page

[src/lib/page-bridge.ts](../src/lib/page-bridge.ts) is the bridge between the panel and the active tab. It uses `browser.scripting.executeScript` to inject **self-contained** functions into the page's isolated world — they are serialized via `func.toString()`, so they may only use DOM globals, their own nested helpers, and type-erased args.

**Types:** `DOMNode` (one pruned tree node — `ref`, `tag`, `role`, `text`, `href`, `type`, `label`, `value`, `placeholder`, `options`, `clickable`, `editable`, `children`), `PageSnapshot` (`url`, `title`, `selection`, `tree`, `truncated`), `AgentAction` (the union above), `ActionResult` (`{ ok, error? }`), `ElementAttachment` (`{ ref, descriptor, node }`), `ActiveTab` (`{ id, url, title }`).

| Export                     | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `getActiveTab()`           | The active tab in the current window, or `null`.                                                       |
| `capturePage(tabId)`       | Inject `captureFn`, return a `PageSnapshot`. Throws a friendly error on browser/extension/store pages. |
| `runAction(tabId, action)` | Inject `actionFn` to perform one action, return an `ActionResult`.                                     |

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
