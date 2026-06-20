# Build & tooling

## Package manager

**pnpm only** — never npm or yarn. Always invoke scripts as `pnpm run <script>` (not the `pnpm <script>` shorthand). `pnpm-lock.yaml` is committed. [pnpm-workspace.yaml](../pnpm-workspace.yaml) pins build approvals:

```yaml
allowBuilds:
  esbuild: true
  spawn-sync: false
```

## Dependencies

Runtime deps ([package.json](../package.json)) are deliberately minimal: `react` / `react-dom` (19), `react-icons`, and **`openai`** — the SDK used to talk to any OpenAI-compatible endpoint (see [lib.md](lib.md#chat-clientts--the-model-client)). Markdown rendering is hand-rolled ([markdown.ts](../src/lib/markdown.ts)), so there is no markdown library. Dev deps cover WXT, Tailwind v4, TypeScript, ESLint, and Prettier.

## Scripts

Defined in [package.json](../package.json):

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `wxt` | Dev server, Chrome target. Does **not** auto-launch a browser. |
| `dev:firefox` | `wxt -b firefox` | Dev server, Firefox target. |
| `build` | `wxt build` | Production build (Chrome) → `.output/chrome-mv3`. |
| `build:firefox` | `wxt build -b firefox` | Production build (Firefox) → `.output/firefox-mv2`. |
| `zip` / `zip:firefox` | `wxt zip [-b firefox]` | Build + package a distributable zip. |
| `type-check` | `tsc -p tsconfig.json` | Type-check (used by CI). |
| `compile` | `tsc --noEmit` | Type-check (manual alias). |
| `lint` | `eslint --flag unstable_native_nodejs_ts_config .` | ESLint over the repo. |
| `format` | `prettier "**/*.{ts,tsx,css,json,yml,yaml,md}" --write …` | Format in place. |
| `format:check` | same as above with `--check --debug-check` | Verify formatting (used by CI). |
| `postinstall` | `wxt prepare` | Runs after install — generates `.wxt/` (typed globals + tsconfig base). |

> `lint` needs the `unstable_native_nodejs_ts_config` Node flag because the ESLint config is authored in TypeScript ([eslint.config.ts](../eslint.config.ts)).

## WXT

[wxt.config.ts](../wxt.config.ts) is the single build + manifest source:

```ts
export default defineConfig({
    srcDir: "src",                              // all entrypoints/code live under src/
    modules: ["@wxt-dev/module-react"],
    webExt: { disabled: true },                 // no auto browser launch on `wxt dev`
    manifest: {
        name: "Navi",
        description: "AI-powered browser copilot sidebar",
        permissions: ["sidePanel", "storage", "scripting", "activeTab", "tabs"],
        host_permissions: ["http://*/*", "https://*/*"],
        action: {},
    },
    vite: () => ({ plugins: [tailwindcss()] }),  // Tailwind v4 via @tailwindcss/vite
});
```

- **`srcDir: "src"`** — WXT looks for entrypoints under `src/entrypoints/` and the rest of the code under `src/`.
- **`@wxt-dev/module-react`** wires up React + JSX.
- **`webExt.disabled`** — you load the unpacked build manually (Chrome `chrome://extensions` → Load unpacked → `.output/chrome-mv3`; Firefox `about:debugging` → Load Temporary Add-on → manifest in `.output/firefox-mv2`).
- **Manifest permissions:**
  - `sidePanel` — the panel itself.
  - `storage` — persist provider config + agent settings ([storage.ts](../src/lib/storage.ts)).
  - `scripting` + `activeTab` + `tabs` — read the active tab and inject the page-capture/action/picker functions ([page-bridge.ts](../src/lib/page-bridge.ts), [element-picker.ts](../src/lib/element-picker.ts)).
  - `host_permissions: http://*/*, https://*/*` — let the panel call any user-configured OpenAI-compatible endpoint cross-origin without CORS blocking.
  - Empty `action` — the toolbar button; the side panel opens on click via [background.ts](../src/entrypoints/background.ts).
- WXT generates `.wxt/` (git-ignored) which provides auto-imported globals (`defineBackground`, `defineContentScript`, `browser`) and the base tsconfig.

## TypeScript

[tsconfig.json](../tsconfig.json) extends WXT's generated base:

```jsonc
{
    "extends": "./.wxt/tsconfig.json",
    "compilerOptions": {
        "allowImportingTsExtensions": true,
        "jsx": "react-jsx",
        "paths": { "@/*": ["./src/*"] }
    }
}
```

The `@/` path alias is set here to map to **`src/`** (overriding/augmenting the generated base). Run `pnpm run postinstall` (or any install) if `.wxt/` is missing.

## ESLint

[eslint.config.ts](../eslint.config.ts) — flat config (TypeScript-authored).

- Ignores `.wxt`, `coverage`, `tmp`.
- Applies to `**/*.{ts,tsx}` with `js.configs.recommended` + `tseslint.configs.recommended`, `globals.browser`.
- Custom rules:
  - `@typescript-eslint/no-unused-vars`: error, but ignores names prefixed `_` (`argsIgnorePattern`/`varsIgnorePattern: "^_"`).
  - `no-empty`: error, `allowEmptyCatch: true`.

## Prettier

[prettier.config.ts](../prettier.config.ts):

```ts
{
    tabWidth: 4,
    printWidth: 120,
    semi: true,
    endOfLine: "lf",
    quoteProps: "consistent",
    trailingComma: "all",
    bracketSameLine: true,
    arrowParens: "avoid",            // x => …, not (x) => …
    htmlWhitespaceSensitivity: "strict",
    singleAttributePerLine: true,    // one JSX attribute per line
}
```

These are not optional style preferences — `format:check` gates CI. `.prettierignore` scopes what gets formatted.

## CI

GitHub Actions in [.github/workflows/](../.github/workflows/).

- **[ci.yml](../.github/workflows/ci.yml)** — entrypoint, triggered on **push to `main`**. Calls three reusable workflows **in sequence** (each `needs` the previous), so a failure short-circuits the rest:
  1. `check-formatting` → 2. `lint` → 3. `type-check`.
  - A `unit-test` job is present but **commented out** (no tests exist yet — see commit history). It was scaffolded with `id-token`/`pages` permissions for a future test-report deploy.
- **[check-formatting.yml](../.github/workflows/check-formatting.yml)**, **[lint.yml](../.github/workflows/lint.yml)**, **[type-check.yml](../.github/workflows/type-check.yml)** — reusable (`on: workflow_call`). Each: checkout → setup-node (latest) → setup-pnpm (latest) → `pnpm install` → run the respective script.
- **[unit-test.yml](../.github/workflows/unit-test.yml)** — exists but unused while the `ci.yml` job is commented out.

## <a id="conventions"></a>Repo conventions (`.claude/rules/`)

Enforced expectations for contributors (and Claude):

- **Naming** (`naming-conventions.md`) — kebab-case filenames. Standard TS casing for identifiers, with abbreviations treated as a single cased unit: `apiURL` (not `apiUrl`), `userID`, `parseHTML`, `APIClient`, `HTTPRequest`, `ModelID`. Never `Api`/`Url`/`Id`.
- **Package manager** (`package-manager.md`) — pnpm, `pnpm run <script>`.
- **Git commits** (`git-commits.md`) — small, focused, one logical change each. Claude-authored commits set identity per-command (`git -c user.name="Claude" -c user.email="noreply@anthropic.com" -c commit.gpgsign=false commit …`) and never modify the repo's git config or sign with the user's GPG key.

## Other config

- **[.vscode/](../.vscode/)** — `extensions.json` (recommended extensions) and `settings.json` (editor/workspace settings).
- **[public/](../public/)** — static assets copied verbatim into the build: extension icons `icon/{16,32,48,96,128}.png` and `wxt.svg`.
- **`.gitignore` / `.prettierignore`** — standard ignores (`.wxt/`, `.output/`, `node_modules/`, etc.).
