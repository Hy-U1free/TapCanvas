# TapCanvas Cinematic Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current noisy single-screen landing page with the approved cinematic A+D direction: a Scroll3DGrid-inspired image field, a scroll-assembled workflow, and an Onlook-inspired read-only TapCanvas production stage that routes every studio CTA through `buildStudioUrl()`.

**Architecture:** `HomePage.tsx` remains the route-level composition boundary and calls `buildStudioUrl()` exactly once. Focused components under `src/ui/home/` own the hero, scroll formation, and read-only workspace showcase; pure data and motion math stay outside React so they are deterministic and unit-testable. Styling remains fully scoped below `.tc-home-page`, uses existing Framer Motion and Tabler icons, and contains no Canvas/store/API integration or texture-noise layer.

**Tech Stack:** React 18, TypeScript, Framer Motion, `@tabler/icons-react`, scoped CSS, Vitest + Testing Library, Playwright, Vite, pnpm 10 via Corepack.

---

## Fixed Scope

- Do not modify `apps/web/src/App.tsx`, `apps/web/src/main.tsx`, `apps/web/src/utils/appRoutes.ts`, `apps/web/src/styles.css`, Canvas code, stores, schemas, runner code, auth code, or API contracts.
- Do not install GSAP, Lenis, WebGL helpers, or any new package. Keep `pnpm-lock.yaml` unchanged.
- `HomeWorkspaceShowcase.tsx` is a read-only DOM product mockup. Its only state is the local `script | storyboard | video` display mode; it must not import Canvas, Zustand stores, or API modules.
- Remove the old `noise-layer`, `scanline-layer`, fracture/rift visuals, micro-tile backgrounds, and all mojibake copy. Do not add `feTurbulence`, `baseFrequency`, grain, static, or pixel-noise substitutes.
- All visible controls and statuses are Chinese. Product name `TapCanvas`, model formats such as `4K`, and timecode are allowed.
- Interactive text is at least `12px`, body text is `12-16px`, and metadata is at least `10px`. Do not scale font size with `vw`, `vmin`, or `vmax`; use fixed sizes changed at explicit breakpoints. Set `letter-spacing: 0`.
- This source snapshot has no `.git` directory. The execution sequence intentionally contains no branch or commit steps.

## File Map

**Create**

- `apps/web/public/home/scene-01.jpg` through `scene-08.jpg`: exact copies of the eight approved direction images.
- `apps/web/src/ui/home/homeSceneData.ts`: immutable scene metadata and formation coordinates.
- `apps/web/src/ui/home/homeMotion.ts`: pure clamp/progress/card-transform calculations.
- `apps/web/src/ui/home/HomeHero.tsx`: semantic hero, spatial image field, and compact read-only editor preview.
- `apps/web/src/ui/home/HomeFormation.tsx`: scroll-driven asset-to-workflow assembly.
- `apps/web/src/ui/home/HomeWorkspaceShowcase.tsx`: localized three-mode product stage.
- `apps/web/_test/unit/homeSceneData.test.ts`: asset manifest and checksum contract.
- `apps/web/_test/unit/homeMotion.test.ts`: deterministic scroll math tests.
- `apps/web/_test/unit/homeHero.test.tsx`: hero semantics, CTA, image, and reduced-motion contract.
- `apps/web/_test/unit/homeFormation.test.tsx`: reduced-motion settled-state contract.
- `apps/web/_test/unit/homeWorkspaceShowcase.test.tsx`: tab semantics and localized interaction.
- `apps/web/_test/unit/homePage.test.tsx`: route-level composition and `buildStudioUrl()` contract.
- `apps/web/_test/unit/homeVisualGuard.test.ts`: static noise, typography, and integration-boundary guard.
- `apps/web/_test/e2e/home.spec.ts`: desktop/mobile/reduced-motion/console/layout acceptance.

**Replace in place**

- `apps/web/src/ui/HomePage.tsx`: remove the rift implementation and compose the new focused components.
- `apps/web/src/ui/homePage.css`: replace the file completely with `.tc-home-page`-scoped production styles.

## Task 1: Lock the approved scene assets and manifest

**Files:**
- Create: `apps/web/_test/unit/homeSceneData.test.ts`
- Create: `apps/web/src/ui/home/homeSceneData.ts`
- Create: `apps/web/public/home/scene-01.jpg` through `scene-08.jpg`

- [ ] **Step 1: Write the failing asset contract**

Create `homeSceneData.test.ts` with this checksum table and assertions:

```ts
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOME_FORMATION_LAYOUT, HOME_SCENES } from '../../src/ui/home/homeSceneData'

const EXPECTED_HASHES = [
  'd06769bd9c54af87d96e58caf4e0becb25a0b95ef9c8b18e130fbe366c89a759',
  '0a81cfdbf53681ce33c97ba40e95a8c62c72ce0a6547ab3d83c0518b10089435',
  '0974094fbb331403801f95e08393c9b62fb16c6c2f48e0f6bd2a8051a44fd035',
  '9b7e24513cef5c39694d3d58addaa8fe03cecf29a36c1f637b945cf824bcadc99',
  '3e1ece7351a2709d4e7ffedb313a6b6faf1e774c8df8dbe46a3cfd6868c0c976',
  '57dbdc567c6e2e61adf4ed76ca5e1002a83a122952d826b139c05dcdd3083a22',
  'bcf9939ffe4740751f063ce062c14e280710ee6a570ea2569a13b64b5a463712',
  '77cd135e1e35bc53d8e25c8789f5a8834018dba0fc74a0916eb4ebd88b5b8ed6',
] as const

describe('home scene manifest', () => {
  it('publishes eight labeled scenes with matching formation slots', () => {
    expect(HOME_SCENES).toHaveLength(8)
    expect(HOME_FORMATION_LAYOUT).toHaveLength(8)
    expect(new Set(HOME_SCENES.map((scene) => scene.id)).size).toBe(8)
    expect(HOME_SCENES.every((scene) => scene.alt.length > 0 && scene.label.length > 0)).toBe(true)
  })

  it.each(EXPECTED_HASHES.map((hash, index) => [index + 1, hash] as const))(
    'keeps scene-%s identical to the approved direction asset',
    (index, expectedHash) => {
      const path = resolve(process.cwd(), `public/home/scene-${String(index).padStart(2, '0')}.jpg`)
      const actualHash = createHash('sha256').update(readFileSync(path)).digest('hex')
      expect(actualHash).toBe(expectedHash)
    },
  )
})
```

- [ ] **Step 2: Run the red test**

Run from `E:\Projects\TapCanvas`:

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeSceneData.test.ts
```

Expected: FAIL because `homeSceneData.ts` and `public/home/scene-01.jpg` do not exist.

- [ ] **Step 3: Copy the exact approved binaries**

```powershell
$source = 'E:\Projects\TapCanvas\.superpowers\brainstorm\20260713-133132\content'
$target = 'E:\Projects\TapCanvas\apps\web\public\home'
New-Item -ItemType Directory -Force -Path $target | Out-Null
1..8 | ForEach-Object {
  $from = Join-Path $source "scene-$_.jpg"
  $to = Join-Path $target ("scene-{0:D2}.jpg" -f $_)
  Copy-Item -LiteralPath $from -Destination $to -Force
}
```

- [ ] **Step 4: Add the typed scene and layout data**

`homeSceneData.ts` must export `HomeScene`, `HomeFormationLayout`, `HOME_SCENES`, and `HOME_FORMATION_LAYOUT`. Use these exact asset paths, labels, depth values, and coordinates:

```ts
export type HomeScene = {
  id: string
  src: string
  alt: string
  label: string
  depth: number
}

export type HomeFormationLayout = {
  sceneId: string
  startX: number
  startY: number
  endX: number
  endY: number
  rotation: number
  width: number
  portrait?: boolean
}

export const HOME_SCENES = [
  { id: 'scene-01', src: '/home/scene-01.jpg', alt: '雨夜车站中的主角肖像', label: '角色设定', depth: 24 },
  { id: 'scene-02', src: '/home/scene-02.jpg', alt: '暮色中的城市与车站', label: '世界氛围', depth: 38 },
  { id: 'scene-03', src: '/home/scene-03.jpg', alt: '纵向构图的角色概念画', label: '场景参考', depth: 20 },
  { id: 'scene-04', src: '/home/scene-04.jpg', alt: '雨夜灯光下的动作镜头', label: '镜头运动', depth: 33 },
  { id: 'scene-05', src: '/home/scene-05.jpg', alt: '纵向氛围与灯光参考', label: '灯光参考', depth: 26 },
  { id: 'scene-06', src: '/home/scene-06.jpg', alt: '冷暖对比的电影画面', label: '视觉风格', depth: 16 },
  { id: 'scene-07', src: '/home/scene-07.jpg', alt: '远景环境与城市灯光', label: '电影构图', depth: 31 },
  { id: 'scene-08', src: '/home/scene-08.jpg', alt: '最终视频镜头预览', label: '视频输出', depth: 21 },
] as const satisfies readonly HomeScene[]

export const HOME_FORMATION_LAYOUT = [
  { sceneId: 'scene-01', startX: -470, startY: -210, endX: -390, endY: -40, rotation: -20, width: 170, portrait: true },
  { sceneId: 'scene-02', startX: 420, startY: -250, endX: 390, endY: -25, rotation: 17, width: 190 },
  { sceneId: 'scene-03', startX: -610, startY: 120, endX: -400, endY: 180, rotation: 13, width: 150, portrait: true },
  { sceneId: 'scene-04', startX: 610, startY: 120, endX: 405, endY: 175, rotation: -15, width: 190 },
  { sceneId: 'scene-05', startX: -240, startY: 390, endX: -205, endY: 225, rotation: -11, width: 145, portrait: true },
  { sceneId: 'scene-06', startX: 260, startY: 390, endX: 210, endY: 230, rotation: 10, width: 190 },
  { sceneId: 'scene-07', startX: -160, startY: -390, endX: -215, endY: -120, rotation: 8, width: 190 },
  { sceneId: 'scene-08', startX: 180, startY: -410, endX: 220, endY: -125, rotation: -8, width: 190 },
] as const satisfies readonly HomeFormationLayout[]
```

- [ ] **Step 5: Run the green test**

Run the Step 2 command again. Expected: 10 tests PASS and all eight checksums match.

## Task 2: Build deterministic motion math before React motion

**Files:**
- Create: `apps/web/_test/unit/homeMotion.test.ts`
- Create: `apps/web/src/ui/home/homeMotion.ts`

- [ ] **Step 1: Write failing tests for clamping and settled transforms**

```ts
import { describe, expect, it } from 'vitest'
import { getFormationProgress, resolveFormationCardMotion } from '../../src/ui/home/homeMotion'

const layout = { sceneId: 'scene-01', startX: -470, startY: -210, endX: -390, endY: -40, rotation: -20, width: 170 }

describe('home motion math', () => {
  it('clamps scroll progress to the sticky section travel', () => {
    expect(getFormationProgress(100, 2100, 900)).toBe(0)
    expect(getFormationProgress(-600, 2100, 900)).toBe(0.5)
    expect(getFormationProgress(-1600, 2100, 900)).toBe(1)
  })

  it('settles a card into its final coordinate without rotation', () => {
    expect(resolveFormationCardMotion(layout, 1, 1000)).toEqual({
      x: -390,
      y: -31.2,
      rotation: 0,
      scale: 1,
      opacity: 0.35,
    })
  })
})
```

- [ ] **Step 2: Run the red test**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeMotion.test.ts
```

Expected: FAIL because `homeMotion.ts` does not exist.

- [ ] **Step 3: Implement the pure functions**

Implement `clamp01`, `getFormationProgress`, and `resolveFormationCardMotion`. The easing is `1 - (1 - progress)^3`; horizontal coordinates scale by `min(max(stageWidth, 360), 1250) / 1000`, vertical coordinates scale by `0.5` below `760px` and `0.78` otherwise, scale interpolates from `0.76` to `1`, rotation settles to zero, and opacity fades from `1` to `0.35` only after progress `0.72`. Round returned numbers to four decimals so tests and inline styles remain stable.

- [ ] **Step 4: Run the green test**

Run the Step 2 command. Expected: 2 tests PASS.

## Task 3: Implement and test the cinematic hero

**Files:**
- Create: `apps/web/_test/unit/homeHero.test.tsx`
- Create: `apps/web/src/ui/home/HomeHero.tsx`

- [ ] **Step 1: Write the failing hero contract**

Render `HomeHero` with `studioUrl="/studio?entry=home"`, `reducedMotion`, and `HOME_SCENES`; assert:

```tsx
expect(screen.getByRole('heading', { level: 1, name: '让每一个镜头，在画布中发生。' })).toBeInTheDocument()
expect(screen.getByRole('link', { name: '立即进入创作画布' })).toHaveAttribute('href', '/studio?entry=home')
expect(screen.getByRole('link', { name: '查看创作流程' })).toHaveAttribute('href', '#workflow')
expect(screen.getByText('运行中')).toBeInTheDocument()
expect(screen.getByText('脚本拆解')).toBeInTheDocument()
expect(screen.getByText('分镜生成')).toBeInTheDocument()
expect(screen.getByText('视频合成')).toBeInTheDocument()
expect(screen.getByAltText('雨夜车站中的主角肖像')).toHaveAttribute('src', '/home/scene-01.jpg')
expect(screen.getByTestId('home-hero')).toHaveAttribute('data-motion', 'reduced')
```

- [ ] **Step 2: Run the red test**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeHero.test.tsx
```

Expected: FAIL because `HomeHero.tsx` does not exist.

- [ ] **Step 3: Implement the hero DOM and bounded Framer Motion**

Create a semantic `<section id="top">` with these four children: `.tc-home-hero__copy`, `.tc-home-hero__actions`, `.tc-home-hero__spatial-field`, and `.tc-home-hero__editor`. Use `IconArrowRight`, `IconPlayerPlay`, `IconSparkles`, and `IconTopologyStar3` from `@tabler/icons-react`; every icon adjacent to a control must retain a visible Chinese label.

Use one `useMotionValue` pair normalized to `[-0.5, 0.5]`. A private `HeroSceneFrame` component may call `useTransform` and `useSpring` to map each scene's `depth` to at most `38px` horizontal and `24px` vertical travel. Map the editor to at most `4deg` on each axis. When `reducedMotion` is true, set `initial={false}`, do not attach `onPointerMove`, and do not pass motion transform styles. Reset both motion values to zero on pointer leave.

The read-only editor preview contains exactly three labeled nodes (`脚本拆解`, `分镜生成`, `视频合成`), status `运行中`, and a compact `Tap Agent` message. Render no form controls in this preview. Images 01, 02, and 04 use `loading="eager"` and `fetchPriority="high"`; remaining hero frames use `loading="lazy"` and every image uses `decoding="async"` with dimensions represented by a stable CSS aspect ratio.

- [ ] **Step 4: Run the green test**

Run the Step 2 command. Expected: all hero assertions PASS.

## Task 4: Implement the scroll assembly with a reduced-motion settled state

**Files:**
- Create: `apps/web/_test/unit/homeFormation.test.tsx`
- Create: `apps/web/src/ui/home/HomeFormation.tsx`

- [ ] **Step 1: Write the failing reduced-motion component test**

Render `<HomeFormation scenes={HOME_SCENES} reducedMotion />` and assert `#workflow` exists, its progressbar has `aria-valuenow="100"`, `.tc-home-formation__core` has `data-active="true"`, there are eight scene figures, and the section has `data-progress="1.00"`.

- [ ] **Step 2: Run the red test**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeFormation.test.tsx
```

Expected: FAIL because `HomeFormation.tsx` does not exist.

- [ ] **Step 3: Implement one passive, frame-coalesced scroll listener**

The component owns `sectionRef`, `stageRef`, `progress`, and `stageWidth`. For full motion, register one passive `window.scroll` listener and one `resize` listener; coalesce updates through a single `requestAnimationFrame`, calculate progress with `getFormationProgress(section.getBoundingClientRect().top, section.offsetHeight, window.innerHeight)`, and clean up both listeners plus the pending frame. For reduced motion, set progress to `1` without registering listeners.

Render eight `<figure>` elements from `HOME_FORMATION_LAYOUT`, resolving scenes by `sceneId` and applying `translate3d(x, y, 0) rotate(rotation) scale(scale)` from `resolveFormationCardMotion`. Render an accessible progressbar labeled `素材组装进度` and activate the central three-node workflow core at progress `>= 0.64`. The copy is exactly `素材不是卡片，而是一条会运行的创作链。` and `滚动查看参考画面如何被组织成可执行的分镜流程。`.

- [ ] **Step 4: Run the green test**

Run the Step 2 command. Expected: the settled-state test PASS with no timer/listener warning.

## Task 5: Implement the localized read-only product stage

**Files:**
- Create: `apps/web/_test/unit/homeWorkspaceShowcase.test.tsx`
- Create: `apps/web/src/ui/home/HomeWorkspaceShowcase.tsx`

- [ ] **Step 1: Write the failing tab and localization tests**

Render the component and assert there is a `tablist` named `创作阶段`, with tabs `脚本`, `分镜`, `视频`; `脚本` starts selected. Click `分镜` and assert it becomes selected and the visible `tabpanel` contains `镜头 01`; click `视频` and assert the visible panel contains a button named `播放视频预览`. Also assert visible statuses are `实时画布`, `已连接`, and `正在统一镜头节奏`.

- [ ] **Step 2: Run the red test**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeWorkspaceShowcase.test.tsx
```

Expected: FAIL because `HomeWorkspaceShowcase.tsx` does not exist.

- [ ] **Step 3: Implement the local-only mode switcher and production DOM**

Use `type HomeWorkspaceMode = 'script' | 'storyboard' | 'video'` and one `useState<HomeWorkspaceMode>('script')`. Tabs must use `role="tab"`, `aria-selected`, `aria-controls`, and keyboard-native `<button type="button">`; panels use matching IDs, `role="tabpanel"`, and the `hidden` attribute.

The stage is `.tc-home-workspace` with a 52px top bar, a labeled tool rail, a central canvas, and a 260px agent panel. Tool entries use Tabler icons plus visible Chinese labels (`节点`, `素材`, `镜头`, `预览`). The script panel shows four read-only nodes and connectors; storyboard shows six real scene images; video shows scene 08, a labeled `IconPlayerPlay` button, and a stable 24-second timeline. Do not use draggable behavior, editable inputs, Canvas components, store selectors, network calls, or timers.

- [ ] **Step 4: Run the green test**

Run the Step 2 command. Expected: tab semantics and all Chinese labels PASS.

## Task 6: Compose the route page and preserve `buildStudioUrl()`

**Files:**
- Create: `apps/web/_test/unit/homePage.test.tsx`
- Modify: `apps/web/src/ui/HomePage.tsx`

- [ ] **Step 1: Write the failing route-level test**

Mock `../../src/utils/appRoutes` so `buildStudioUrl` returns `/studio?entry=home`, mock `useReducedMotion` to return `false`, render `HomePage`, then assert:

```tsx
expect(buildStudioUrl).toHaveBeenCalledTimes(1)
expect(screen.getByRole('main')).toHaveAttribute('data-motion-mode', 'full')
expect(screen.getByRole('navigation', { name: '首页导航' })).toBeInTheDocument()
expect(screen.getByRole('region', { name: '素材组装流程' })).toBeInTheDocument()
expect(screen.getByRole('region', { name: 'TapCanvas 创作工作台预览' })).toBeInTheDocument()
const studioLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/studio?entry=home')
expect(studioLinks).toHaveLength(3)
expect(studioLinks.map((link) => link.textContent?.trim())).toEqual([
  '进入工作台',
  '立即进入创作画布',
  '开始创作',
])
```

- [ ] **Step 2: Run the required red test command**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homePage.test.tsx
```

Expected: FAIL against the old rift page because it lacks the new components and CTA contract.

- [ ] **Step 3: Replace `HomePage.tsx` with the composition shell**

Call `const studioUrl = buildStudioUrl()` once and `const reducedMotion = Boolean(useReducedMotion())`. Render, in order:

1. `<main className="tc-home-page" data-motion-mode={reducedMotion ? 'reduced' : 'full'}>`.
2. `.tc-home-header` with brand, in-page links `创作流程` -> `#workflow` and `工作台` -> `#workspace`, plus the `进入工作台` studio link.
3. `<HomeHero studioUrl={studioUrl} scenes={HOME_SCENES} reducedMotion={reducedMotion} />`.
4. `<HomeFormation scenes={HOME_SCENES} reducedMotion={reducedMotion} />`.
5. `<HomeWorkspaceShowcase scenes={HOME_SCENES} />` inside `<section id="workspace" aria-label="TapCanvas 创作工作台预览">`.
6. `.tc-home-final` with heading `把灵感放进来，让画面自己找到路径。` and the `开始创作` studio link.

Keep `import './homePage.css'`. Remove Mantine imports, old motion values, fault/rift elements, and all old copy. Do not alter routing files.

- [ ] **Step 4: Run the green route test**

Run the Step 2 command. Expected: PASS, including exactly one `buildStudioUrl()` call and three studio links.

## Task 7: Replace the visual system, add static guards, and cover responsive/reduced motion

**Files:**
- Create: `apps/web/_test/unit/homeVisualGuard.test.ts`
- Replace: `apps/web/src/ui/homePage.css`

- [ ] **Step 1: Write the failing source guard**

Read `HomePage.tsx`, all three component files, and `homePage.css` with `node:fs`. Assert the combined source does not match any of these patterns:

```ts
const forbiddenPatterns = [
  /feTurbulence|baseFrequency/i,
  /noise-layer|scanline-layer/i,
  /background-size\s*:\s*[1-6]px/i,
  /font-size\s*:[^;]*(?:vw|vmin|vmax)/i,
  /letter-spacing\s*:\s*-/i,
]
```

Read `HomeWorkspaceShowcase.tsx` separately and assert it does not match `/from\s+['"][^'"]*(?:canvas\/|stores?\/|api\/server)/i`. Assert every production selector in `homePage.css` begins with `.tc-home-page`, `.tc-home-header`, `.tc-home-hero`, `.tc-home-formation`, `.tc-home-workspace`, or `.tc-home-final`.

- [ ] **Step 2: Run the red guard**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeVisualGuard.test.ts
```

Expected: FAIL because the old CSS still contains `noise-layer`, `scanline-layer`, and `background-size: 4px 4px`.

- [ ] **Step 3: Replace `homePage.css` using this exact layout contract**

Use a charcoal base (`#030405`, `#080a0d`, `#10141a`), white text (`#f4f7fb`), muted gray (`#99a3b1`), blue (`#6da7ff`), cyan (`#62e3cd`), and restrained amber (`#ffb45d`). Do not use a dominant purple, beige, slate-blue, or orange palette. Every radius is `8px` or less. Background structure may use a large `56px` one-pixel line grid; no tile smaller than `48px`, dot texture, scanline, data-URI texture, blur-noise, or pseudo-element grain is allowed.

Implement these exact geometry and typography rules:

- `.tc-home-page`: `min-height:100%`, `overflow-x:clip`, base font `14px/1.5`, `letter-spacing:0`, isolated dark background.
- `.tc-home-header`: fixed-height `56px`, absolute at `top:16px`, width `min(1220px, calc(100% - 32px))`, `z-index:30`; CTA and links are at least `13px` and `40px` high.
- `.tc-home-hero`: `height:calc(100svh - 32px)`, `min-height:700px`, `max-height:920px`, so at least 32px of `#workflow` is visible in the first viewport. Desktop copy width `560px`; H1 `88px/0.95`; body `16px/1.65`; CTA `14px` with a `44px` minimum height.
- `.tc-home-hero__spatial-field`: absolute right-side field with eight stable aspect-ratio frames; frame widths range from `112px` to `240px`. Images use `object-fit:cover` without blur or darkness filters.
- `.tc-home-hero__editor`: absolute right/bottom, `width:min(760px,58%)`, `height:480px`, `transform-style:preserve-3d`; internal top bar is `42px`, node labels are `12px`, metadata `10px`. Use large `56px` grid lines on the canvas.
- `.tc-home-formation`: desktop height `2100px`, `overflow:clip`; sticky child is `100svh`. Cards use inline transforms, `will-change:transform`, stable aspect ratios, and no CSS keyframe loop. Heading is `64px`, body `14px`.
- `.tc-home-workspace`: max width `1180px`, height `680px`, grid tracks `62px minmax(0,1fr) 260px`; mode buttons are `13px` and `40px` high. Every tool icon has a visible `12px` label. Images keep declared aspect ratios; tab panels occupy the same fixed canvas area so tab changes cannot shift layout.
- `.tc-home-final`: unframed full-width band, heading `72px`, body `15px`, CTA `14px` and `44px` high.
- Focus: every link and button gets a visible `2px solid #8eb8ff` `:focus-visible` outline with `3px` offset. Hover transforms are limited to `translateY(-2px)` and never change box dimensions.
- At `@media (max-width:1180px)`: H1 `72px`; editor becomes `left:4%; right:4%; width:92%; height:430px`; hide only hero frames 7 and 8; workspace agent track becomes `220px`.
- At `@media (max-width:760px)`: header hides in-page nav links but retains brand and labeled CTA; hero is `height:calc(100svh - 24px)`, `min-height:680px`; H1 `48px`; show three hero frames and a `360px`-wide editor scaled within `calc(100% - 24px)`. Formation cards use widths `88-124px`. Workspace becomes one column: tool rail is horizontal, canvas is `420px` high, agent panel follows below, and section height is auto. Final heading is `44px`.
- At `@media (max-width:420px)`: H1 `42px`; hide the secondary hero link; editor height `300px`; workspace canvas `380px`; CTA labels remain untruncated and may wrap to two lines.
- At `@media (prefers-reduced-motion:reduce)`: set `scroll-behavior:auto`; set animation and transition duration to `0.01ms`, iteration count to `1`; make formation height auto and sticky child static with a settled two-row image arrangement; remove perspective transforms and `will-change`; keep all content and CTAs visible.

- [ ] **Step 4: Run the green static guard and focused unit suite**

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/homeSceneData.test.ts _test/unit/homeMotion.test.ts _test/unit/homeHero.test.tsx _test/unit/homeFormation.test.tsx _test/unit/homeWorkspaceShowcase.test.tsx _test/unit/homePage.test.tsx _test/unit/homeVisualGuard.test.ts
rg -n -i 'feTurbulence|baseFrequency|noise-layer|scanline-layer|background-size:\s*[1-6]px' apps/web/src/ui/HomePage.tsx apps/web/src/ui/home apps/web/src/ui/homePage.css
```

Expected: Vitest PASS. `rg` exits 1 with no output, which is the success condition for the absence guard.

## Task 8: Add browser acceptance and finish with full verification

**Files:**
- Create: `apps/web/_test/e2e/home.spec.ts`

- [ ] **Step 1: Write the end-to-end contract**

Create Playwright tests that:

1. Collect `console.error` and `pageerror`, load `/`, switch `脚本 -> 分镜 -> 视频`, verify the selected tab and studio CTA href `/studio`, and expect the collected error array to equal `[]`.
2. Loop through `1440x900`, `1024x768`, and `390x844`; after each reload assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`, `#workflow` intersects the first viewport, all eight assets have `naturalWidth > 0`, and every visible `a`/`button` has computed `fontSize >= 12`.
3. Emulate `reducedMotion:'reduce'`; assert `.tc-home-page` has `data-motion-mode="reduced"`, `#workflow` has `data-progress="1.00"`, the core is active, and every `[data-home-motion]` element has animation/transition duration `0s` or `0.01ms`.
4. Evaluate the DOM and computed styles to confirm no class contains `noise`, `grain`, or `scanline`, and no SVG contains `feTurbulence`.

- [ ] **Step 2: Run Playwright**

```powershell
corepack pnpm --filter @tapcanvas/web exec playwright test --config _test/playwright.config.ts _test/e2e/home.spec.ts
```

Expected: all Chromium tests PASS at the three viewports with zero console errors and no horizontal overflow.

- [ ] **Step 3: Run the complete web unit suite**

```powershell
corepack pnpm --filter @tapcanvas/web test
```

Expected: Vitest exits 0; existing tests and all homepage tests PASS.

- [ ] **Step 4: Run the production build**

```powershell
corepack pnpm --filter @tapcanvas/web build
```

Expected: Vite production build exits 0 with generated assets under `apps/web/dist`; there are no TypeScript errors, unresolved `/home/scene-*.jpg` references, or new dependency warnings.

- [ ] **Step 5: Perform final source and boundary checks**

```powershell
rg -n -i 'feTurbulence|baseFrequency|noise-layer|scanline-layer|background-size:\s*[1-6]px' apps/web/src/ui/HomePage.tsx apps/web/src/ui/home apps/web/src/ui/homePage.css
rg -n "buildStudioUrl" apps/web/src/ui/HomePage.tsx apps/web/src/ui/home
rg -n -i "from\s+['\"].*(canvas/|store|api/server)" apps/web/src/ui/home/HomeWorkspaceShowcase.tsx
```

Expected: first and third commands exit 1 with no output. The second command prints exactly the import and the single call in `HomePage.tsx`, with no call inside child components.

## Acceptance Matrix

| Area | Required result |
|---|---|
| Visual direction | Spatial real-image hero, scroll assembly, and read-only real product stage are all present; no NewAPI/card-wall composition |
| Routing | Header, hero, and final CTA share the one URL returned by `buildStudioUrl()` |
| Noise | No turbulence, grain, scanline, micro-tile, or substitute pixel texture in DOM/CSS/SVG |
| Motion | Pointer depth is bounded; scroll work is one passive RAF-coalesced listener; reduced motion is fully settled and readable |
| Language/readability | Visible controls and statuses are Chinese; controls >=12px, body >=12px, metadata >=10px |
| Responsive | No overlap or page-level horizontal overflow at 1440x900, 1024x768, and 390x844; next section is hinted in the first viewport |
| Accessibility | Semantic headings/regions, real anchors, keyboard-native tabs, visible focus, labeled icons, meaningful image alt text |
| Isolation | Workspace showcase imports no Canvas, store, or API module; global app and routing files are unchanged |
| Quality gate | Focused unit tests, full web tests, homepage Playwright suite, static guards, and production build all exit 0 |
