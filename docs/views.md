# Views

The [src/views/](../src/views/) directory holds the top-level screens and the shared chrome, one component per file. [src/app.tsx](../src/app.tsx) is the root: every view it renders or overlays it mounts. There is no router — `App` switches on a `view` state value. Views are presentational + local-state; the agent/provider machinery lives in [lib/](lib.md) and is wired in by `App`.

```
app.tsx          ── root component, view router, agent wiring
types.ts         ── ViewKey, ChatTurn
views/shell.tsx        ── NaviLogo + TopBar
views/welcome-view.tsx ── WelcomeView (first run)
views/connect-view.tsx ── ConnectView (provider setup)
views/chat-view.tsx    ── ChatView (the conversation)
views/task-view.tsx    ── TaskView (legacy, simulated, unreachable)
views/settings-view.tsx── SettingsView + ModelSheet
```

## Types — `src/types.ts`

[src/types.ts](../src/types.ts)

```ts
export type ViewKey = "welcome" | "connect" | "chat" | "settings" | "task" | "history" | "recipes";

export interface ChatTurn {
    kind?: "action"; // when "action", render an AgentActionCard
    id?: string; // stable id so an action card can update in place
    role?: "user" | "assistant"; // otherwise render a ChatMessage
    meta?: ReactNode; // small caption under a message (e.g. model id)
    body?: ReactNode; // rendered message content
    text?: string; // plain-text mirror of body — builds model history + renders markdown
    // action-card fields (kind === "action"):
    type?: ActionType;
    label?: ReactNode;
    status?: ActionStatus;
    detail?: ActionDetail[];
    open?: boolean;
}
```

`ChatTurn` is one transcript entry. The `ActionType` / `ActionStatus` / `ActionDetail` types come from `@/components/index` (the agent-action-card; see [components.md](components.md#agentactioncard)). The old `Provider` and `ModelID` types are gone — a provider is now `ProviderConfig` from [providers.ts](../src/lib/providers.ts).

## `App` — `src/app.tsx`

[src/app.tsx](../src/app.tsx) — the root component, view router, and the glue between the UI and [lib/](lib.md).

**State** — see the [state table in architecture.md](architecture.md#state-model). In short: `view`, `config`, `agentSettings`, `sheet`, `messages`, `draft`, `busy`, `activeTab`, `attachPage`, `attachments`, `picking`, `pendingApproval`, plus the `abortRef` / `approvalRef` / `pickerDisposeRef` refs.

**Effects:** on mount, load `config` + `agentSettings` from storage (and dispose the picker on unmount); on entering `chat`, fetch the active tab.

**Constants / helpers:**

- `GREETING` — the seeded assistant `ChatTurn[]`.
- `actionLabel(action)`, `ACTION_TYPE`, `ACTION_STATUS`, `actionCard(...)` — map an `ExecutableAction` + `ActionPhase` to a `ChatTurn` action card (icon, label, status, detail rows including any error).
- `persistConfig` / `persistAgentSettings` — set state **and** write to `browser.storage.local`.
- `togglePicker` — start/stop the element picker on the active tab.
- `requestApproval` / `handleApprove` — promise-based gate for non-auto actions (resolved by the chat view's Run/Skip buttons).
- `handleStop` — abort the run and reject any pending approval.

**`send(text)`** — the live agent entry point. It builds the wire `history` from prior turns, appends the user turn, captures the page snapshot (if `attachPage`), then calls `runAgent` with callbacks that stream action cards (`onAction`, updating in place by `id`) and the final answer (`onAnswer`) into `messages`. Cancellable via an `AbortController`. Full walkthrough in [architecture.md](architecture.md#the-agent-loop).

**View routing** — a `let main: ReactNode` assigned by checking `view`:

| `view`                | Renders                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `welcome`             | `<WelcomeView onConnect=… />` (picks a preset → `connect`)                          |
| `connect`             | `<ConnectView initialConfig onBack onDone />` (persists config → `chat`)            |
| `settings`            | `<SettingsView config agentSettings onConfigChange onAgentSettingsChange onBack />` |
| `task`                | `<TaskView onStop />` — **unreachable** (nothing sets `view = "task"`)              |
| `history` / `recipes` | `<EmptyView kind onBack />` (local helper)                                          |
| _default_ (`chat`)    | `<ChatView … />` with the full agent prop set                                       |

**Chrome.** `showChrome = view !== "welcome" && view !== "connect"`. When true the `TopBar` is rendered above `main`. The `ModelSheet` overlay mounts at the end when `sheet` is true.

**`EmptyView`** (local to this file) — centered empty-state for `history` ("No history yet") and `recipes` ("No recipes yet"), each with icon, title, description, and a "Back to chat" button.

## `shell.tsx` — top bar + logo

[src/views/shell.tsx](../src/views/shell.tsx)

- **`NaviLogo({ size })`** — inline SVG logomark (rounded rect + divider + teal beacon dot). Renders in `currentColor` except the beacon, fixed `#22DDD0`.
- **`TopBar`** — the persistent header. Props: `model`, `view`, `onOpenModel`, `onOpenSettings`, `onNav`.
    - Left: logo + "navi" wordmark.
    - Center: a model pill (success dot + the current `model` string) that opens the model sheet.
    - Right: `IconButton`s in `Tooltip`s — History, Recipes, Settings (each `active` when `view` matches), and a Collapse button (tooltip shows `⌘⇧N`; not yet wired).

## `welcome-view.tsx` — onboarding

[src/views/welcome-view.tsx](../src/views/welcome-view.tsx)

- **`WelcomeView({ onConnect })`** — first-run splash. Large logo, headline "Hey, I'm Navi", a three-point value list (`POINTS`: See the page / Take action / You stay in control), and two CTAs that hand a **preset** up to `App`: "Connect a cloud model" → `onConnect(PRESETS[0])`, "Use a self-hosted model" → `onConnect(PRESETS[1])`. `App` seeds the config from that preset and moves to `connect`.

## `connect-view.tsx` — provider setup

[src/views/connect-view.tsx](../src/views/connect-view.tsx)

- **`ConnectView({ initialConfig, onBack, onDone })`** — the real connection form, working on a local copy of `ProviderConfig`.
    - **Presets row** — clicking a preset applies its endpoint + model (keeping the typed key) and resets the test state.
    - **Endpoint URL** — an `Input` bound to `baseURL`.
    - **Model** — auto-fetches the endpoint's model list (`listModels`, debounced 350 ms on endpoint/key change, abortable). On success shows a `Select` of real model IDs (defaulting to the first if the current one isn't offered); otherwise falls back to a free-text `Input`. A Refresh button re-fetches; errors show a hint to type one manually.
    - **API key** — an `APIKeyInput`, explicitly **optional**.
    - **Test connection** — runs `testConnection`; shows a success `StatusDot` ("Connected · {model}") or an error with the message. A provider-specific `Banner` (e.g. where to get a Gemini key) shows before testing.
    - **Start using Navi** — disabled until `isConfigReady`; calls `onDone(config)`, which persists the config and moves to `chat`.

## `chat-view.tsx` — the conversation

[src/views/chat-view.tsx](../src/views/chat-view.tsx)

- **`ChatView`** — the main screen. Props: `messages`, `draft`, `setDraft`, `onSend`, `model`, `onOpenModel`, `busy`, `onStop`, `activeTab`, `attachPage`, `onToggleAttach`, `attachments`, `onRemoveAttachment`, `picking`, `onTogglePicker`, `pendingApproval`, `onApprove`.
    - **Transcript** — maps `messages` → `AgentActionCard` (`kind === "action"`) or `ChatMessage`. Assistant turns render their `text` through `<Markdown>`; user turns render `body`. Auto-scrolls on `[messages, busy]`. While `busy` and not awaiting approval, shows `StreamingIndicator` ("Navi is working…").
    - **Approval bar** — when `pendingApproval` is set, an inline row describes the proposed action with **Run** / **Skip** buttons wired to `onApprove`.
    - **Context row** — the page context pill (host of `activeTab.url`, removable → detaches the page) or an "Attach page" chip when detached; one removable `ContextPill` per element attachment; a **Stop** chip while busy.
    - **Quick actions** — Summarize page / Extract data / What can I click? — each calls `onSend` with a canned prompt.
    - **Composer** — `PromptInput`, disabled while busy, with the element-picker toggle (`picking` / `onTogglePicker`).

## `task-view.tsx` — task progress (legacy)

[src/views/task-view.tsx](../src/views/task-view.tsx)

- **`TaskView({ onStop })`** — a timer-driven, hardcoded job-application demo: local `steps: Step[]`, a `useEffect` that advances the `running` step every 2200 ms unless `paused`, a header `Card`, a `StepTimeline`, and Pause/Resume + Stop controls.
- **Status: unreachable.** It is still wired into `App`'s router for `view === "task"`, but nothing sets that view since the live agent renders progress inline as `AgentActionCard`s in `ChatView`. Treat it as a holdover pending a redesign around real runs.

## `settings-view.tsx` — settings + model sheet

[src/views/settings-view.tsx](../src/views/settings-view.tsx)

- Local helpers **`Section`** (titled card group) and **`Row`** (a settings line with label + hint + control).
- **`SettingsView`** — props `config`, `onConfigChange`, `agentSettings`, `onAgentSettingsChange`, `onBack`. Sections:
    - **Provider** (live, persisted via `onConfigChange`) — a **Preset** `Select` (presets + "Custom"), an **Endpoint** `Input`, a **Model** `Input`, and an optional **API key** `APIKeyInput`.
    - **Agent** (live, persisted via `onAgentSettingsChange`) — "Auto-execute actions" `Switch` (`autoExecute`) and "Max autonomous steps" `Slider` 1–50 (`maxSteps`). "Action speed" `Select` is **cosmetic** local state.
    - **General** — Theme and Sidebar position `Select`s — **cosmetic** local state, not applied.
    - **Data & privacy** — "Save conversation history" `Switch` (cosmetic) plus danger "Clear all history" / ghost "Export data" buttons (inert).
- **`ModelSheet({ currentModel, onPick, onClose })`** — bottom-sheet overlay (backdrop + `animate-sheet-up`) listing `PRESETS` with icon + subtitle and a check on the one whose `model` matches `currentModel`. Clicking a row calls `onPick(preset)` (App switches endpoint + model); backdrop click calls `onClose`.

## Cross-reference

Views consume the component library heavily (props/behavior in [components.md](components.md)) and the lib layer for all real work ([lib.md](lib.md)). Styling tokens (colors, type scale, animations like `animate-sheet-up`) are in [design-system.md](design-system.md).
