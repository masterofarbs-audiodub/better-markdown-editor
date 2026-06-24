# TODO

Pre-release backlog of improvements to Better Markdown Editor, grouped by category. Items at the top of each section are higher-leverage; items further down are nice-to-haves.

Legend: 🟢 small (≤ a few hours) · 🟡 medium (a day or two) · 🔴 large / multi-day · ⭐ user-visible · 🔧 internal · ✅ done this session

---

## 🚀 Speed / performance

### High-impact

- 🟡 ⭐ **Lazy-load heavy Vditor features.** Mermaid, KaTeX, ECharts, Graphviz, abc.js, hljs are all bundled eagerly today. Profile `media/dist/main.js` by dependency (e.g. `esbuild --analyze`) and dynamically `import()` the rarely-used ones only when a code block of that type is detected. Realistic target: another 30–40% off the bundle.
- ✅ ~~**Defer extension activation.** `activationEvents` currently includes `onLanguage:markdown`...~~ — **DONE.** Dropped `onLanguage:markdown`; the extension now only activates on our command, custom editor, or restored webview. Pinned in `test/backend/manifest.test.ts`.
- 🟢 🔧 **Strip Vditor toolbar items we never render.** The Vditor `toolbar` array filters at runtime but the JS is still in the bundle. A small esbuild plugin or a vendored Vditor build can drop unused button code.
- ✅ ~~**Stop shipping `vditor/dist/index.css` unminified.**~~ — **VERIFIED.** Bundled `main.css` (58 KB) is already minified end-to-end by esbuild; only the legal `/*! jquery-confirm */` banner is preserved (intentional). Locked in by `test/perf/bundle-size.test.ts` (6 tests asserting no human-readable indentation, no `//` comments, soft size cap of 80 KB).
- ✅ ~~**Debounce `input` listener more aggressively.** Currently 100 ms...~~ — **DONE.** Bumped to 250 ms via the new `media-src/src/config.ts:EDIT_DEBOUNCE_MS`. Pinned by `test/frontend/debounce.test.ts` (5 tests including a fake-timer contract test).

### Measurement

- ✅ ~~**Add a `bench/` harness**~~ — **DONE (initial pass).** First baseline captured in [`bench/results.md`](./bench/results.md): bundle sizes, p99 microbenchmark latencies, build/test wall-clocks. _Follow-up:_ wire `pnpm test:bench` output into structured JSON so successive runs can diff. Also fixed `test/perf/frontend.bench.ts` which was failing on a missing-lodash import.
- ✅ ~~**CI bundle-size guardrail.**~~ — **PARTIAL.** Local vitest guard added (`test/perf/bundle-size.test.ts`, soft caps of 500 KB JS / 80 KB CSS, refuses non-minified output). _Still TODO:_ promote to a GitHub Action so PRs can't merge a regression.
- 🟢 🔧 **CI activation-time guardrail.** Use VS Code's extension profiler (`code --inspect-extensions`) to assert activation < 50 ms. _Activation surface_ already measured as a proxy: `out/extension.js` is 21 KB with only `vscode` + `path` imports — nothing else runs at startup.

### Memory

- 🟢 ⭐ **`retainContextWhenHidden: false` for non-active editors.** Currently `true` everywhere — every open markdown tab keeps a full Vditor instance in memory. For users with 10+ tabs this is real RAM. Trade-off: tab switch becomes a re-init; measure perceived latency first.
- 🟡 🔧 **Audit listeners on `dispose()`.** Both `EditorPanel` and `MarkdownEditorProvider` build `_disposables` arrays — confirm everything (especially the `onDidChangeTextDocument` debounce timer) is cleaned up.

### Package size

- 🟢 🔧 **Recompress or externalize `demo.gif`.** Surfaced by [`bench/results.md`](./bench/results.md): `demo.gif` is **2.55 MB on disk** — larger than the entire compiled extension + webview bundle (~430 KB combined). It dominates the 2.49 MB `.vsix`. Options: convert to optimized MP4 / WebP, drop to a smaller frame size, or host externally and reference via raw GitHub URL.

---

## ✨ Functionality

### Navigation

- 🟡 ⭐ **Sync scroll position between VS Code text editor and webview.** Today they drift apart when both are open in a split. Most markdown extensions do this; we don't.
- 🟡 ⭐ **Sticky heading on scroll.** Show the current section's H1/H2 in a sticky bar at the top of the webview while scrolling — orientation cue for long docs.
- 🟢 ⭐ **Heading-level filter on the outline.** Toggle to show H1 only, H1–H2, or all — useful for huge docs with deep nesting.
- 🟢 ⭐ **Jump-to-line from VS Code's outline view.** VS Code already has an "Outline" panel — wire it up as a `DocumentSymbolProvider` so users can navigate via the native panel too.

### Editing

- 🟡 ⭐ **Find & Replace.** Currently only Find (`Cmd+F`). Replace (`Cmd+H` / `Cmd+Opt+F`) is a common ask.
- 🟡 ⭐ **Show match count in Find overlay** (e.g. `3 of 27 matches`). Today we delegate to `editor.action.webvieweditor.showFind` which renders VS Code's native overlay inside the iframe — that overlay does not surface a count for webview content the way the regular text-editor Find does. Likely needs a custom find widget that scans Vditor's rendered DOM (`vditor.vditor.ir.element` etc.), highlights hits, and shows index/total. Doubles as the foundation for the Find-and-Replace item above.
- 🟡 ⭐ **Vim keybindings (opt-in).** A flag that loads `vim-mode` for the inner CodeMirror, behind a setting since it's polarizing.
- 🟢 ⭐ **Sane Cmd+S that preserves cursor position.** Right now save sometimes scrolls the view.
- 🟡 ⭐ **Folding under headings.** Click an H2 to collapse the section it owns. Major win for long structured docs. _Design note (deferred):_ three implementation paths considered — (1) inline `<span>` chevron injected into the heading (most discoverable, but Vditor wipes it on every IR re-render and may serialize the glyph into markdown on `getValue()`), (2) CSS `::before` chevron with click-position threshold (no DOM mutation, but fights cursor placement in the heading's left padding and Vditor IR-mode wraps headings in syntax-marker spans that may eat the click), (3) toolbar "Fold section" button acting on the heading containing the cursor (cleanest implementation, only path that doesn't fight Vditor — but less discoverable). Recommended v1: option 3 + a MutationObserver to re-apply state across Vditor re-renders, keyed by `level:textContent`. v2 can add inline chevrons once the state machine is solid.

### Content features

- 🟡 ⭐ **Live document statistics.** Word count, reading time, character count, headings count — in the status bar or as a toolbar popover.
- ✅ ~~**Spell check (opt-in).**~~ — **DONE.** New `markdown-editor.spellcheck` boolean setting (default `false`). When on, `applySpellcheck()` (in `media-src/src/utils.ts`) toggles the browser-native `spellcheck` attribute on Vditor's contenteditable surface, so VS Code's Chromium webview renders red squiggles using the editor/OS dictionary. Forwarded from all three init sites in `extension.ts`, applied in `main.ts`'s `after()`. Pinned by manifest + frontend tests. _Note:_ went with the native-`spellcheck` approach rather than bundling `cspell` (no extra deps, no dictionary payload); wiring VS Code's own diagnostics into Vditor remains a heavier future option if per-workspace custom dictionaries are wanted.
- 🟡 ⭐ **Markdown linting integration.** Use the user's `markdownlint` settings to underline issues inside the WYSIWYG view.
- 🟡 ⭐ **Export to PDF / HTML / DOCX.** "Copy as HTML" exists; full export rounds it out.
- 🟢 ⭐ **Configurable heading anchors.** Letting users opt into GitHub-style `#user-content-foo` anchors keeps exports portable.

### Settings & customization

- ✅ ~~**Settings for heading highlight colors.**~~ — **DONE (branch `feat/heading-ux`, commit `6b77e8d`).** Two new settings: `markdown-editor.headingHighlightBackground` and `markdown-editor.headingHighlightForeground`. Empty string keeps the existing `--vscode-*` fallback; any CSS color overrides. Wired through CSS custom properties (`--bme-heading-bg`, `--bme-heading-fg`) set on `document.body` at init.
- ✅ ~~**Per-heading-level styling.**~~ — **DONE (branch `feat/heading-ux`, commit `6b77e8d`).** New `markdown-editor.headingHighlightPerLevel` boolean. When on, H1 keeps the full-strength band and each deeper level fades it via `color-mix(in srgb, ... <pct>%, transparent)` (H2 80%, H3 60%, H4 45%, H5 30%, H6 20%). Stacks with the color overrides above.
- 🟢 ⭐ **Gradient background on heading highlight.** Replace the solid `background-color` on `body[data-highlight-headings="1"] :is(h1, h2, h3, h4, h5, h6)` with a subtle gradient (e.g. `linear-gradient(90deg, var(--vscode-editor-selectionHighlightBackground), transparent)`) so the band reads as a section marker rather than a flat block. Should still adapt across themes via `--vscode-*` variables.
- 🟢 ⭐ **Highlight table header rows (`<th>`).** Apply a themed background + foreground to table header cells so tables get the same visual treatment as headings. Likely a sibling setting (`markdown-editor.highlightTableHeaders`) or a sub-mode of `highlightHeadings`. Scope to `.vditor-reset table thead th` so it doesn't bleed into body cells.
- 🟢 ⭐ **Setting to choose which heading levels appear in the outline.** Mirrors the outline filter above but as a persistent default.

---

## 🧹 Cleanup / maintainability

### README & metadata

- ✅ ~~**Replace SVG marketplace badges with PNG/`shields.io`.**~~ — **DONE.** Swapped the three `vsmarketplacebadges.dev` SVG badges (which `vsce package` blocks because the host is untrusted, and which still pointed at upstream `zaaack.markdown-editor`) for `img.shields.io/visual-studio-marketplace/...` badges pointing at `masterofarbs-audiodub.better-markdown-editor`. `img.shields.io` is on vsce's trusted-provider list, so `vsce package` now runs with **no `sed` workaround**.
- ✅ ~~**Fix the duplicated "Local Development / Installation" section.**~~ — **DONE (already resolved).** Current `README.md` has the section exactly once.
- ✅ ~~**Update clone URLs.**~~ — **DONE.** `README.md` clones from `https://github.com/masterofarbs-audiodub/better-markdown-editor.git`; `package.json` `repository.url` matches.
- ✅ ~~**Add a `CHANGELOG.md`.**~~ — **DONE.** `CHANGELOG.md` exists at repo root.
- ✅ ~~**Bump version before publishing.**~~ — **DONE.** `package.json` `version` is `0.2.0`.
- ✅ ~~**Add a real `icon` to `package.json` referencing a 256×256 PNG.**~~ — **DONE.** `icon` → `media/logo.png`, resized 128×128 → **256×256**. _Caveat:_ upscaled from the only available 128px source, so not pixel-crisp — replace with a native 256px render if one becomes available.

### Code health

- 🔴 🔧 **Consolidate `EditorPanel` and `MarkdownEditorProvider`.** Currently `src/extension.ts` defines both classes with substantial duplication — duplicate message handlers, duplicate HTML generation, duplicate options-init logic. Extract a shared module that both call into. (Test-side confirmation: the two `getHtmlForWebview` implementations are byte-for-byte identical, per the audit in `test/backend/webview-html.test.ts`.)
- 🟡 🔧 **Type the extension ↔ webview message protocol.** Today both sides use `any` / shape-by-convention. Define a `WebviewMessage` discriminated union in a shared `protocol.ts` and import from both `src/` and `media-src/`.
- 🟡 🔧 **Replace jQuery + jquery-confirm.** Used only for the reset-config confirm dialog. Native `confirm()` or a tiny modal removes a substantial dep.
- 🟢 🔧 **Tighten `tsconfig.json`.** Enable `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes` — caught a class of bugs already common in this codebase.
- ✅ ~~**Prettier + EditorConfig.**~~ — **DONE.** `.prettierrc`, `.prettierignore`, `.editorconfig` in place; `prettier` added as a root devDep with `pnpm format` / `pnpm format:check` scripts. Ran Prettier over `toolbar.ts` (137 tab-indented lines → 2-space) and `extension.ts` (the only remaining tabs are inside HTML template literals, which Prettier intentionally leaves verbatim).
- ✅ ~~**Pin Vditor version exactly** (`^3.8.4` → `3.8.4`).~~ — **DONE.** `media-src/package.json` pins `"vditor": "3.8.4"` (no caret).
- ✅ ~~**Reset `mockConfig` between tests.**~~ — **DONE.** `test/setup.ts` (wired via vitest `setupFiles`) calls `resetMockConfig()` in a global `beforeEach`, restoring `mockConfigDefaults` before every test.

### Build & CI

- ✅ ~~**GitHub Actions workflow** for PR builds.~~ — **DONE.** `.github/workflows/ci.yml` runs on every PR + push to `master`: install (frozen lockfiles) → `pnpm test` → `npx foy build` → `vsce package` smoke. Node 20, pnpm 9.7.1.
- ✅ ~~**Auto-publish on tag push.**~~ — **DONE.** `.github/workflows/main.yml` rewritten: triggers on `v*.*.*` tags, builds, then publishes to both Open VSX and the VS Marketplace via `HaaLeo/publish-vscode-extension@v1` (fixed the broken `vsixPath` step-ordering and modernized the actions). Needs `OPEN_VSX_TOKEN` + `VS_MARKETPLACE_TOKEN` secrets.
- ✅ ~~**`pnpm` lockfile in CI.**~~ — **DONE.** Both CI jobs install with `--frozen-lockfile` (root + `media-src`), so a drifted lockfile fails the build. Verified both lockfiles are currently in sync.
- ✅ ~~**Build step that fails on stale `out/extension.js`.**~~ — **DONE.** Added `vscode:prepublish` (`tsc -p ./ && cd media-src && pnpm build`), which vsce runs automatically before packaging — `out/extension.js` and the webview bundle are always freshly compiled. Verified: `vsce package` now rebuilds before producing the `.vsix`.

### Testing

- ✅ ~~**Unit tests for the message protocol.**~~ — **DONE.** `test/backend/extension.test.ts` covers the `ready` → `update` round-trip including both new settings (`outlinePosition`, `highlightHeadings`). 18 backend tests + 6 new-settings tests.
- ✅ ~~**Integration test for "Open With…".**~~ — **DONE (snapshot-style).** `test/backend/webview-html.test.ts` (11 tests) asserts on the structural pieces of the generated webview HTML — `<base href>`, JS/CSS paths, `#app` mount, customCss interpolation. Catches regressions in the template without locking in whitespace.
- ✅ ~~**Frontend unit tests for `utils.ts`** (`fileToBase64`, `fixLinkClick`, `saveVditorOptions`).~~ — **DONE (already in place + augmented).** Existing `test/frontend/utils.test.ts` covers all three plus `fixCut`; `test/frontend/message-handler.test.ts` covers the update/uploaded handlers; `test/frontend/toolbar.test.ts` is new this session and covers the toolbar shape.
- ✅ ~~**Test for the outline-position setting end-to-end.**~~ — **DONE.** `test/frontend/message-handler.test.ts` has a dedicated `outlinePosition handling` describe (5 tests, covers left/right/missing/preserves-enable cases). The extension-side forwarding is covered in `test/backend/extension.test.ts`.

**Test totals this session:** 68 → **119** tests across 10 files. Suite runs in ~600 ms cold-cache-warm.

### Documentation

- ✅ ~~**Architecture diagram in `CLAUDE.md` / `ARCHITECTURE.md`.**~~ — **DONE.** `ARCHITECTURE.md` (one page) covers the host ↔ webview split, message protocol table, options flow, save flow, and file-by-file map. Added a `CLAUDE.md` that points at it and surfaces the key gotchas for future work.
- ✅ ~~**Document the `vditor.options` globalState behavior.**~~ — **DONE.** Documented in `ARCHITECTURE.md` → "Where state lives" (the saved Vditor options spread *after* workspace config, silently overriding per-workspace settings) and called out again in `CLAUDE.md` → "Gotchas".

---

## 🎯 Marketplace publication checklist (ordered)

1. [x] Replace SVG badges with PNG in README (so `vsce package` runs without workarounds). — shields.io badges; verified `vsce package` runs clean.
2. [ ] Update README to draft version (`README-DRAFT.md` → `README.md`), with real GIFs filled in.
3. [ ] Recompress or externalize `demo.gif` (2.55 MB → target <500 KB) — biggest single asset in the `.vsix`.
4. [x] Add `CHANGELOG.md` covering the fork's history.
5. [x] Bump `version` to `0.2.0` in `package.json`.
6. [ ] Verify `publisher` field in `package.json` matches your Marketplace publisher ID. (Currently `masterofarbs-audiodub` — confirm this is the real publisher ID before publishing.)
7. [x] Run the benchmark harness once and fill in the README's performance table with real numbers. (Done — see [`bench/results.md`](./bench/results.md).)
8. [x] Add the build-step guardrail (fresh `tsc` before `vsce package`). — `vscode:prepublish` script.
9. [ ] Record 4 demo GIFs: main demo, outline, search, heading highlight.
10. [ ] `npx vsce package` and smoke test the resulting `.vsix` on a clean VS Code profile.
11. [ ] `npx vsce publish`.
