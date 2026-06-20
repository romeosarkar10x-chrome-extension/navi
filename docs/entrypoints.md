# Entrypoints

WXT discovers extension entrypoints by convention under [src/entrypoints/](../src/entrypoints/) (the project sets `srcDir: "src"`). Each file's default export (or HTML page) becomes a manifest entry. WXT provides `defineBackground` and `defineContentScript` as auto-imported globals; `browser` is imported explicitly (`from "wxt/browser"`) where the lib modules use it.

## `background.ts` — service worker

[src/entrypoints/background.ts](../src/entrypoints/background.ts)

```ts
export default defineBackground(() => {
    // Open the Navi side panel when the toolbar action is clicked.
    browser.sidePanel
        ?.setPanelBehavior({ openPanelOnActionClick: true })
        .catch(err => console.error("Failed to set side panel behavior", err));
});
```

- Runs as the MV3 service worker / MV2 background script.
- Sole responsibility: configure the side panel to open when the user clicks the toolbar action (`action: {}` is declared in [wxt.config.ts](../wxt.config.ts)).
- `browser.sidePanel?.` is optional-chained because the API is Chromium-specific; on Firefox it is absent and the call is skipped.
- No message passing or agent logic. (Element-picker messages flow tab → panel directly via `runtime.sendMessage`/`onMessage`, not through the background — see [lib.md](lib.md#element-picker).)

## `content.ts` — content script

[src/entrypoints/content.ts](../src/entrypoints/content.ts)

```ts
export default defineContentScript({
    matches: ["*://*.google.com/*"],
    main() {
        console.log("Hello content.");
    },
});
```

- Injected only into `*.google.com` pages, and a **placeholder** — logs a string and nothing else.
- **The agent does not use it.** Page reading and actions are injected on demand from the panel via `browser.scripting.executeScript` ([page-bridge.ts](../src/lib/page-bridge.ts), [element-picker.ts](../src/lib/element-picker.ts)), which is why the manifest requests `scripting`/`activeTab`/`tabs` rather than a broad content-script match. This file is left as a stub for any future always-on, per-page behavior.

## `sidepanel/` — the panel UI host

The side panel is a normal HTML page that boots the React app.

### `sidepanel/index.html`

[src/entrypoints/sidepanel/index.html](../src/entrypoints/sidepanel/index.html) — the panel document. Sets `data-theme="dark"` on `<html>` (the default theme) and loads `index.tsx` as a module. There is **no static `#root`** node; the script creates one.

### `sidepanel/index.tsx`

[src/entrypoints/sidepanel/index.tsx](../src/entrypoints/sidepanel/index.tsx)

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "./index.css";

const rootElement = document.createElement("div");
rootElement.id = "root";

createRoot(rootElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

document.body.appendChild(rootElement);
```

- Creates the `#root` element, mounts `<App/>` (from [src/app.tsx](../src/app.tsx)) using the React 19 root API, then appends it to `<body>`.
- Wraps in `React.StrictMode` — effects run twice in dev; the async machinery in `App` (abort controllers, picker disposers, cleanup functions) tolerates this.
- Imports `./index.css`, the single Tailwind entry stylesheet that also pulls in the design tokens and webfonts (see [design-system.md](design-system.md)).

### `sidepanel/index.css`

The Tailwind v4 entry + design-token stylesheet. Documented in full in [design-system.md](design-system.md). (This is the file previously located at `assets/tailwind.css`.)

Everything visual downstream is documented in [views.md](views.md) and [components.md](components.md).
