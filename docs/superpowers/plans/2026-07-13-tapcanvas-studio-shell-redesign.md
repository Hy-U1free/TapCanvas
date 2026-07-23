# TapCanvas Studio Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Quiet Production Deck shell to `/studio` while preserving every real Canvas, runner, panel, route, auth, upload, and AI Chat behavior.

**Architecture:** `CanvasApp` retains state and handlers. A presentational `StudioHeader` receives explicit props, `FloatingNav` keeps its existing store/route behavior while exposing visible Chinese labels, and a new `.tc-studio` stylesheet scopes all visual changes. `AiChatDialog` keeps its data and mode logic; only command presentation changes. `Canvas.tsx` receives Chinese React Flow `ariaLabelConfig` only.

**Tech Stack:** React 18, TypeScript, Mantine 7, Tabler Icons, React Flow 12, Vitest, Testing Library, Playwright, CSS.

---

**Design contract:** `docs/superpowers/specs/2026-07-13-tapcanvas-dark-motion-redesign-design.md`, section 5 onward. The approved visual reference is `.superpowers/brainstorm/20260713-133132/content/studio-direction-v4.html`; its review controls, fake states, `/files/*` assets, and prototype SVGs do not ship.

**Archive rule:** this source tree has no `.git` directory. Do not initialize Git and do not run add, commit, branch, reset, checkout, or worktree commands while executing this plan.

## File Map

- Modify: `apps/web/src/App.tsx` - Studio root scopes, presentational header integration, existing portals.
- Create: `apps/web/src/ui/studio/StudioHeader.tsx` - labelled actions and responsive More menu.
- Create: `apps/web/src/ui/studio/studio.css` - all redesigned Studio styles and tokens.
- Modify: `apps/web/src/ui/FloatingNav.tsx` - icon plus persistent Chinese short labels.
- Modify: `apps/web/src/ui/PendingUploadsBar.tsx` - remove visual inline styles in favor of scoped classes.
- Modify: `apps/web/src/ui/chat/AiChatDialog.tsx` - labelled Chinese header commands.
- Modify: `apps/web/src/canvas/Canvas.tsx` - React Flow Chinese `ariaLabelConfig` only.
- Create: `apps/web/_test/unit/floatingNav.test.tsx` - visible label and contract checks.
- Create: `apps/web/_test/unit/studioHeader.test.tsx` - action semantics and responsive menu checks.
- Create: `apps/web/_test/unit/pendingUploadsBar.test.tsx` - real upload count, readable Chinese copy, and live-region checks.
- Create: `apps/web/_test/unit/aiChatPresentation.test.ts` - three-mode presentation/status helper checks without invoking Chat APIs.
- Create: `apps/web/_test/unit/studioShellContracts.test.ts` - scoped CSS, DOM marker, slot, route, and prohibited-texture guards.
- Create: `apps/web/_test/e2e/studio-shell-redesign.spec.ts` - authenticated shell regression.

## Non-Negotiable Contracts

- Keep `data-tour`, `data-ux-floating`, and `data-ux-panel` attributes.
- Keep `tc-canvas-breadcrumb-slot` and `tc-canvas-visibility-slot` IDs.
- Keep `buildStudioUrl()`, panel names, hover anchoring, `spaNavigate`, admin route, and account behavior.
- Keep `BodyPortal` around Studio floating UI and Mantine `withinPortal` behavior for menus/modals; do not move portaled controls back into the Canvas subtree.
- Keep Chat `compact | expanded | maximized`, localStorage key, Escape logic, uploads, sending, and message history.
- Keep MiniMap `160x110` at `left:12px; bottom:12px`, Controls at `left:12px; bottom:130px`, and node selection toolbar geometry.
- Do not change Canvas handlers, `Canvas` store calls, Zustand contracts, runner, auth, API, node schema, serialization, prompt, canvas plan, trace, or diagnostics.
- `Canvas.tsx` is the sole exception to the no-Canvas-edit rule: add `ariaLabelConfig` to the existing `<ReactFlow>` only. Do not edit `<Controls>`, `<MiniMap>`, selection, pan, zoom, fit-view, lock, connection, or node handlers.

## Task 1: Lock Navigation, Header, Upload, Chat, And Integration Contracts With Failing Tests

- [ ] **Step 1: Create `floatingNav.test.tsx`**

Mock auth/admin/UI stores but render the real component. Assert visible text for `项目`, `工作流`, `资产`, `漫剧`, `展映`, `运行`, `历史`, and `账户`; assert `data-tour="floating-nav"` and `data-tour="add-button"`; click `工作流` and verify the existing `setActivePanel('template')` call.

- [ ] **Step 2: Create `studioHeader.test.tsx`**

Render the component with no-op handlers and assert named actions `保存`, `导出`, `展映`, `主题`, `语言`, `帮助`, and `源码`; assert the project input and save/help `data-tour` attributes; invoke Save and Export and verify each original callback fires once. Rerender at the narrow breakpoint prop and assert the same low-frequency actions are reachable through the labelled `更多` menu rather than existing only as hidden buttons.

- [ ] **Step 3: Create `pendingUploadsBar.test.tsx`**

Mock only `getPendingUploads()` and the upload runtime selector. Assert zero pending uploads renders nothing; two uploads render `正在上传 2 个本地文件`, both real filenames, `role="status"`, and `aria-live="polite"`. Do not assert a fabricated percentage because the component does not own real byte progress.

- [ ] **Step 4: Create `aiChatPresentation.test.ts`**

Drive exported pure helpers with `compact`, `expanded`, and `maximized`. Assert desktop `expanded` stays a panel, a `<=900px` presentation of `expanded` becomes a bubble without overwriting the stored preference, and maximized remains maximized. Assert real state mapping is `sending -> 运行中`, latest error message -> `错误`, otherwise `就绪`.

- [ ] **Step 5: Create `studioShellContracts.test.ts`**

Read the affected source and CSS files. Assert `App.tsx` imports `./ui/studio/studio.css`, retains `<Canvas className="app-canvas" />`, `<BodyPortal>`, every required `data-tour`, both slot IDs, and existing `buildStudioUrl()` calls. Assert all new selectors begin with `.tc-studio`, and reject `feTurbulence`, `noise-layer`, `film-grain`, `scanline-layer`, `/files/ti-`, and Unicode placeholder icons.

- [ ] **Step 6: Run tests and verify RED**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/floatingNav.test.tsx _test/unit/studioHeader.test.tsx _test/unit/pendingUploadsBar.test.tsx _test/unit/aiChatPresentation.test.ts _test/unit/studioShellContracts.test.ts
```

Expected: FAIL because persistent nav labels, `StudioHeader`, scoped Studio CSS, Chat presentation helpers, upload live-region semantics, and Canvas Chinese labels do not exist yet.

## Task 2: Implement `StudioHeader`

- [ ] **Step 1: Define explicit presentational props**

Create and export a `StudioHeaderProps` interface covering owner label, host description, dirty/saving state, project name/value/change/blur, auth/admin visibility, points/loading, AI workbench, recharge, save, export, theme, language, help, and source/展映 URLs. Add `compact: boolean` from `useMediaQuery('(max-width: 75em)')` in `App.tsx`; `StudioHeader` remains presentational and imports no store, auth, API, runner, Canvas, or route helper.

- [ ] **Step 2: Render desktop labelled commands**

Use Tabler icon plus Chinese text Buttons for `导出`, `展映`, `主题`, `语言`, `帮助`, and `源码`. Keep `AI 工作台`, the real credit/recharge value, and `保存`; while `saving`, the label is `保存中`. Preserve anchor `target="_blank"`, `rel="noopener noreferrer"`, loading/disabled states, and the existing callbacks. Interaction text is at least `12px`.

- [ ] **Step 3: Render a real responsive More menu**

When `compact` is false, render the labelled desktop actions. When `compact` is true, render one `更多` Button and a `Menu` with full Chinese items for every removed action. Keep `withinPortal`, pass the same callbacks/URLs, and put `className="tc-studio tc-studio-header__more-dropdown"` on the portaled dropdown so scoped styling still applies outside the wrapper. Avoid duplicate `data-tour="help-tour"`; the attribute belongs to the visible desktop help button or the visible compact help item, never both at once.

- [ ] **Step 4: Integrate without moving business state**

Replace only the existing header JSX. Keep `currentOwnerType`, `studioHostDescription`, project mutation/upsert, recharge, save, export, theme, language, help, TapShow, and GitHub handlers in `CanvasApp`. Keep the two Portal slot IDs directly below the header. Add `.tc-studio` to `AppShell` and one `<div className="tc-studio tc-studio__portals">` inside the existing `BodyPortal`; keep every current floating component inside that wrapper in the same order.

- [ ] **Step 5: Run `studioHeader.test.tsx` and verify GREEN**

Run the Task 1 command. `studioHeader.test.tsx` must pass; the other red tests may remain red until their matching task.

## Task 3: Implement Persistent Navigation Labels

- [ ] **Step 1: Update `FloatingNavItem`**

Keep the current hover `getBoundingClientRect()` anchor calculation and click callback. Add a `shortLabel` prop and render:

```tsx
<span className="tc-studio-nav__icon" aria-hidden="true">{icon}</span>
<span className="tc-studio-nav__label">{shortLabel}</span>
```

Use `项目`, `工作流`, `资产`, `漫剧`, `展映`, `运行`, `历史`; admin uses `看板`; account uses `IconUserCircle` plus `账户`. Tooltip remains supplemental.

- [ ] **Step 2: Preserve all behavior contracts**

Do not rename active panel values, remove project `spaNavigate('/projects')`, change hover anchor calculations, change `nanoComic`, or alter admin/account handlers. Add click toggles to hover-open entries so touch users can open `assets`, `tapshow`, `runs`, and `history`; clicking the active item closes it with the existing `setActivePanel(null)` contract.

- [ ] **Step 3: Run `floatingNav.test.tsx` and verify GREEN**

Run the Task 1 command and confirm `floatingNav.test.tsx` and `studioHeader.test.tsx` pass.

## Task 4: Implement Pending Upload Semantics And Scoped Studio Styling

- [ ] **Step 1: Create `studio.css` and import it once from `App.tsx`**

Define Studio tokens on `.tc-studio`; constrain every selector under `.tc-studio`. Existing compatibility classes (`app-*`, `floating-nav-*`, `pending-uploads-*`, `tc-ai-chat-*`) remain, but every new rule is prefixed by `.tc-studio`. Do not modify or append redesign rules to `apps/web/src/styles.css`, and do not use unscoped `.mantine-*` selectors.

- [ ] **Step 2: Implement geometry and typography**

- Floating nav stays `left:16px`, `top:50%`, `width:56px`, with vertical overflow safety at short heights.
- Left panels remain `left:82px`; asset panel remains `320px` wide.
- Main interaction labels are `12px` minimum; body text is `12-13px`; metadata is `10px` minimum.
- Header and main retain `--tc-ai-chat-reserved-width` behavior.
- Breakpoints are exact: `1500px` (480px Chat), `1200px` (420px Chat), `900px` (360px Chat then panel-to-bubble presentation), and `720px` (single-node focus, labelled More, compact touch targets).
- Expanded Chat is `right:12px; top:0; bottom:0` and follows the 480/420/360 widths; compact stays `60x60`; maximized stays at most `1040x860` with at least `16px` viewport inset and a backdrop.
- At `390px`, controls remain reachable, the selected/core node remains usable, non-selected nodes and edges do not crowd the view, and `document.documentElement.scrollWidth <= window.innerWidth`.

Use these scoped selector contracts rather than inventing parallel DOM: `.tc-studio .floating-nav-card`, `.tc-studio .floating-nav-item`, `.tc-studio .tc-studio-nav__label`, `.tc-studio .asset-panel-anchor`, `.tc-studio .asset-panel-shell`, `.tc-studio .tc-canvas__minimap`, `.tc-studio .tc-canvas__controls`, `.tc-studio .pending-uploads-bar-*`, and `.tc-studio .tc-ai-chat*`. For `<=720px` focus mode use `.tc-studio .react-flow__viewport:has(.react-flow__node.selected) .react-flow__node:not(.selected)` and the corresponding edge selector; only opacity/pointer-events may change, never node data, selection, coordinates, or handlers.

- [ ] **Step 3: Move PendingUploadsBar visual inline styles**

Keep its null condition, file ordering, summary, z-index, and pointer-event behavior. Add `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`. Move geometry/color/typography to `.tc-studio .pending-uploads-*` selectors only. Show the real file count and `处理中`; keep Mantine's indeterminate Loader for unknown duration, but do not add a fake percentage or decorative perpetual progress track.

- [ ] **Step 4: Verify upload and CSS contract GREEN**

Run the Task 1 command. `pendingUploadsBar.test.tsx` and `studioShellContracts.test.ts` must now pass except for assertions owned by Tasks 5 and 6.

## Task 5: Preserve And Clarify AI Chat Three-State Presentation

- [ ] **Step 1: Export presentation-only helpers**

Introduce `AiChatMode = 'compact' | 'expanded' | 'maximized'`, `resolveAiChatPresentationMode(mode, narrowViewport)`, and `resolveAiChatVisualStatus(sending, latestMessageKind)`. Use `useMediaQuery('(max-width: 56.25em)')` only to derive presentation; do not overwrite `tapcanvas.aiChat.layoutPreference.v1` when desktop `expanded` is shown as a mobile bubble. A mobile bubble opens maximized/focus; leaving focus restores the prior stored mode.

- [ ] **Step 2: Replace ambiguous header ActionIcons**

For both compact-header and expanded/maximized header branches, use icon-plus-text commands: `新对话`, `教程`, `展开`/`收起`, `聚焦`/`退出聚焦`, and `关闭`. The bubble contains `IconMessageCircle` plus visible `AI`. Add `data-chat-mode` and a live status row with `就绪`, `运行中`, or `错误`; state derives only from current `sending` and real message error state. Preserve the exact existing callbacks and Tooltips.

- [ ] **Step 3: Keep conventional composer icons**

Attachment and Send/Interrupt may remain icon-only because they use standard symbols, but must retain Chinese `aria-label`, Tooltip, at least `32x32px`, and visible focus treatment. The compact bubble visibly includes `AI`.

- [ ] **Step 4: Guard the data plane**

Do not edit imports or calls for `agentsChatStream`, memory, skills, uploads, request payloads, canvas plan parsing/execution, auto-run, trace, tool gating, canvas store, draft, references, or interruption. Backdrop click and Escape continue calling the current maximize toggle; mode changes must not recreate message/draft/reference state.

- [ ] **Step 5: Run Chat unit test and verify GREEN**

Run the Task 1 command and require `aiChatPresentation.test.ts` to pass.

## Task 6: Localize React Flow Controls Without Changing Behavior

- [ ] **Step 1: Add React Flow `ariaLabelConfig` in `Canvas.tsx`**

On the existing `<ReactFlow>` pass an `ariaLabelConfig` object with exactly these keys: `controls.ariaLabel`, `controls.zoomIn.ariaLabel`, `controls.zoomOut.ariaLabel`, `controls.fitView.ariaLabel`, `controls.interactive.ariaLabel`, and `minimap.ariaLabel`. Values are `画布控制`, `放大`, `缩小`, `全览`, `锁定画布`, and `画布缩略图`. Do not touch any Canvas callback, `<Controls>`, `<MiniMap>`, or store state.

- [ ] **Step 2: Add visible labels in `studio.css`**

Use stable `.react-flow__controls-zoomin`, `-zoomout`, `-fitview`, and `-interactive` classes to render `放大`, `缩小`, `全览`, and `锁定`; preserve the existing button elements and SVGs. Keep Controls horizontal at the contracted coordinates.

- [ ] **Step 3: Add a focused RED/GREEN source contract**

Before the Canvas edit, add the exact `ariaLabelConfig` assertions to `studioShellContracts.test.ts` and run it to observe failure. After the one-property edit, rerun it and require PASS. Review `git` is unavailable, so verify the diff by rereading the `<ReactFlow>` block and confirm no other `Canvas.tsx` line changed.

## Task 7: Add Authenticated Browser Regression

- [ ] **Step 1: Create `studio-shell-redesign.spec.ts`**

Install an init script with a cached test user/token and `tapcanvas-feature-tour-seen:v2:<sub>=1`, clear only the Chat layout preference, and route both `http://localhost:8788/**` and same-origin `/api/**` to deterministic fixtures. Return `[]` for lists, `{ context: { recentConversation: [] } }` for memory, and a valid team object for `/teams/me`. For `1440x900`, `1024x768`, and `390x844`, assert `.react-flow`, `[data-tour="floating-nav"]`, both Portal slots, MiniMap, and Controls are attached/visible as appropriate; assert all persistent nav labels without hover and no horizontal overflow.

- [ ] **Step 2: Exercise real shell behavior**

Open `资产` by click (not hover), assert its shell starts at `left:82px` and desktop width `320px`, close it by canvas blank click, then exercise Chat compact -> expanded -> maximized -> expanded -> compact. Assert panel width/right/top/bottom, bubble `60x60`, maximized `<=1040x860`, backdrop click, Escape, and draft preservation across all transitions. Collect `pageerror`, console `error`, and failed local asset requests; all three collections end empty.

- [ ] **Step 3: Verify collision geometry**

Compare bounding boxes for header/Chat, nav/panel, MiniMap/Controls, and upload bar/Chat where present. Fail on intersection outside the deliberate reserved-width relationship.

- [ ] **Step 4: Run E2E and verify RED, then GREEN**

Run the Task 8 Playwright command before production changes and record failure on labels/More/Chat geometry. After Tasks 2-6, rerun the same command and require all viewport cases to pass.

## Task 8: Verification

- [ ] **Step 1: Run focused unit tests**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/floatingNav.test.tsx _test/unit/studioHeader.test.tsx _test/unit/pendingUploadsBar.test.tsx _test/unit/aiChatPresentation.test.ts _test/unit/studioShellContracts.test.ts
```

- [ ] **Step 2: Run texture and English-state guards**

```powershell
rg -n "feTurbulence|baseFrequency|noise-layer|scanline-layer|film-grain" apps/web/src/ui/studio apps/web/src/ui/FloatingNav.tsx apps/web/src/ui/chat/AiChatDialog.tsx
rg -n ">\s*(READY|RUNNING|ERROR|FAILED|BUBBLE|PANEL|FOCUS)\s*<" apps/web/src/App.tsx apps/web/src/ui apps/web/src/canvas
```

Expected: no newly introduced user-facing matches.

- [ ] **Step 3: Run the full Web unit suite**

```powershell
corepack pnpm --filter @tapcanvas/web test
```

Baseline recorded before this redesign: 16 unrelated failures across Chat canvas-plan, image-prompt,
runner, error-classifier, stream, and reference-sheet tests. Capture the final failed-test list and
require that no failure originates from the Studio redesign files and that the baseline count does not
increase. Do not modify unrelated business modules to force the legacy suite green.

- [ ] **Step 4: Run production build**

```powershell
$env:VITE_API_BASE='http://127.0.0.1:8788'
$env:VITE_GITHUB_CLIENT_ID='test-client'
$env:VITE_GITHUB_REDIRECT_URI='http://127.0.0.1:4173/oauth/github'
$env:ALLOW_LOCALHOST_IN_PROD_BUILD='1'
corepack pnpm --filter @tapcanvas/web build
```

Expected: exit code `0`.

- [ ] **Step 5: Run existing project/chapter smoke checks**

```powershell
corepack pnpm --filter @tapcanvas/web smoke:project-chapter-ui
corepack pnpm --filter @tapcanvas/web smoke:project-chapter-production
```

Run when their backend/data prerequisites are available. If either script cannot start because those
prerequisites are absent, record the exact precondition failure and rely on the focused contract tests,
production build, and authenticated shell E2E for this UI-only change. Do not fabricate backend fixtures
inside production code.

- [ ] **Step 6: Run Chromium regression and screenshot review**

```powershell
corepack pnpm --filter @tapcanvas/web exec playwright test --config _test/playwright.config.ts _test/e2e/studio-shell-redesign.spec.ts --project=chromium
```

Review `1920x1080`, `1440x900`, `1280x800`, `1024x768`, `390x844`, and `360x800` screenshots for text clipping, ambiguous icon-only commands, collisions, and NewAPI/card-wall styling. Verify reduced motion by emulating `prefers-reduced-motion: reduce`. Fix only Studio-scoped defects and rerun all focused checks.

Completion requires: focused tests pass, the full Web suite introduces no failures beyond the recorded
baseline, production build passes, Playwright regression passes, browser console errors are zero, no
required DOM marker is duplicated or removed, and no unrelated Canvas, runner, prompt, schema,
diagnostics, auth, API, or store code changed. Smoke scripts are supporting evidence only when their
documented backend/data prerequisites are available.
