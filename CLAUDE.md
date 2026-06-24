# CLAUDE.md

Guidance for working in this repo. Read [`ARCHITECTURE.md`](./ARCHITECTURE.md)
first — it's the one-page system overview (host ↔ webview split, the message
protocol, options flow, save flow, where state lives).

## What this is

A VS Code extension: a full-featured WYSIWYG markdown editor built on
[Vditor](https://github.com/Vanessa219/vditor). Two processes talk over the
webview message channel:

- **Host** — `src/extension.ts`, compiles to `out/extension.js`. Imports only
  `vscode` + `path`. Defines two near-duplicate classes, `EditorPanel`
  (command/keybinding) and `MarkdownEditorProvider` (Open With… / default
  editor).
- **Webview** — `media-src/src/main.ts`, bundles to `media/dist/main.js` via
  esbuild (`media-src/build.mjs`). This is where Vditor lives.

## Build & test

```bash
pnpm install && (cd media-src && pnpm install)   # first-time setup
npx foy build        # tsc -p ./  +  media-src bundle  (then git add -A)
pnpm test            # vitest, ~600ms
pnpm format          # prettier --write .
npx vsce package --no-dependencies   # build guardrail runs via vscode:prepublish
```

- The webview bundle is **not** auto-rebuilt by editing `media-src/src/*` —
  run `npx foy build` (or `pnpm watch`). `media/dist/*` is committed because
  the `.vsix` packages from that path.
- `vsce package` triggers the `vscode:prepublish` script, which recompiles the
  host (`tsc`) and rebuilds the webview bundle. This is the guardrail against
  shipping a stale `out/extension.js`.

## Gotchas that have bitten us

1. **`vditor.options` globalState silently overrides workspace settings.**
   Vditor's internal options (`theme`, `mode`, `preview`, …) persist in
   `context.globalState` under `vditor.options` and are spread into the options
   envelope *after* `workspace.getConfiguration('markdown-editor')` in
   `src/extension.ts`. A saved Vditor option therefore wins over the user's
   per-workspace setting. This bit us during the `outlinePosition` work. See
   ARCHITECTURE.md → "Where state lives".

2. **Two host classes must stay in sync.** `EditorPanel` and
   `MarkdownEditorProvider` are near-duplicates. Behavior that affects "opening
   a document" — especially **forwarding a new setting** — must be changed in
   **all three** init sites (grep `useVscodeThemeColor` to find them). The
   tests in `test/backend/` exist partly to catch drift.

3. **Vditor regenerates the editor DOM on every keystroke (IR mode).** Any
   external DOM mutation (e.g. injected affordances) needs re-applying via a
   `MutationObserver` after each render.

4. **README badges must come from a vsce-trusted provider.** `vsce package`
   blocks SVG badges from untrusted hosts (e.g. `vsmarketplacebadges.dev`).
   Use `img.shields.io` (trusted) — that's why the badges point there.

## Adding a new `markdown-editor.*` setting

Follow the 6-step checklist in ARCHITECTURE.md → "Options flow" (declare in
`package.json`, forward from all three init sites, add to `mockConfigDefaults`,
update `manifest.test.ts`, apply in `main.ts`, add a frontend test).

## Conventions

- Prettier (`.prettierrc`: single quotes, no semis, 2-space) + EditorConfig.
  Run `pnpm format` before committing. Note: HTML inside template literals in
  `extension.ts` keeps its own indentation (Prettier leaves string content
  alone).
- Vditor is pinned exactly (`3.8.4`, no caret) — minor bumps have surprised us.
