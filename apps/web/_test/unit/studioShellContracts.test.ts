import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function source(relativePath: string): string {
  const path = fileURLToPath(new URL(relativePath, import.meta.url))
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

const appSource = source('../../src/App.tsx')
const navSource = source('../../src/ui/FloatingNav.tsx')
const uploadSource = source('../../src/ui/PendingUploadsBar.tsx')
const headerSource = source('../../src/ui/studio/StudioHeader.tsx')
const studioCss = source('../../src/ui/studio/studio.css')
const canvasSource = source('../../src/canvas/Canvas.tsx')

function blockBody(css: string, opening: string): string {
  const openingIndex = css.indexOf(opening)
  if (openingIndex < 0) return ''
  const openBraceIndex = css.indexOf('{', openingIndex + opening.length)
  if (openBraceIndex < 0) return ''

  let depth = 1
  for (let index = openBraceIndex + 1; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    if (css[index] === '}') depth -= 1
    if (depth === 0) return css.slice(openBraceIndex + 1, index)
  }
  return ''
}

function customProperty(block: string, name: string): string {
  return block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? ''
}

function relativeLuminance(hex: string): number {
  const channels = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]?.match(/.{2}/g)
  if (!channels) return Number.NaN

  const [red, green, blue] = channels.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05)
}

describe('Studio shell source contracts', () => {
  it('keeps route, portal, tour, Canvas, and slot integration markers', () => {
    const shellSources = `${appSource}\n${headerSource}\n${navSource}`

    expect(appSource).toContain("import './ui/studio/studio.css'")
    expect(appSource).toContain('<Canvas className="app-canvas" />')
    expect(appSource).toContain('<BodyPortal>')
    expect(appSource).toContain('<AppShell.Header className="app-shell-header" role="presentation" aria-hidden="true" />')
    expect(appSource).toContain('className="tc-studio tc-studio__portals"')
    expect(appSource.match(/buildStudioUrl\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2)

    for (const marker of ['project-name', 'save-button', 'help-tour', 'floating-nav', 'add-button']) {
      expect(shellSources).toContain(`data-tour="${marker}"`)
    }
    expect(appSource.match(/id="tc-canvas-breadcrumb-slot"/g)).toHaveLength(1)
    expect(appSource.match(/id="tc-canvas-visibility-slot"/g)).toHaveLength(1)
  })

  it('reports project-name persistence failures without discarding the edited name', () => {
    const blurHandler = blockBody(appSource, 'onProjectNameBlur={async () =>')

    expect(blurHandler).toContain('try {')
    expect(blurHandler).toContain('await upsertProject({ id: currentProject.id, name: currentProject.name })')
    expect(blurHandler).toContain('catch (error: unknown)')
    expect(blurHandler).toContain("toast(`项目名称保存失败：${resolveErrorMessage(error, '未知错误')}`, 'error')")
    expect(blurHandler).not.toContain('setCurrentProject')
  })

  it('does not present unavailable team credits as a real zero balance', () => {
    const creditRefresh = blockBody(appSource, 'const refreshHeaderCredits = React.useCallback(async () =>')

    expect(appSource).toContain('React.useState(Boolean(auth.user && !auth.user.guest))')
    expect(appSource).toContain('points={headerTeam ? Math.max(0, Number(headerTeam.creditsAvailable || 0)) : null}')
    expect(creditRefresh).toContain('catch {')
    expect(creditRefresh).toContain('setHeaderTeam(null)')
    expect(creditRefresh).toContain('finally {')
    expect(creditRefresh).toContain('setHeaderPointsLoading(false)')
  })

  it('resolves the Studio header compactly through 1500px on the first client render', () => {
    expect(appSource).toContain("const compactHeader = useMediaQuery('(max-width: 93.75em)', false, { getInitialValueInEffect: false })")
  })

  it('keeps all redesign CSS scoped and rejects prohibited textures and placeholder icons', () => {
    expect(studioCss).not.toBe('')

    const selectorLines = studioCss
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => (line.startsWith('.') || line.startsWith(':root') || line.startsWith('#')))
      .filter((line) => line.endsWith('{') || line.endsWith(','))

    expect(selectorLines.length).toBeGreaterThan(0)
    for (const selector of selectorLines) {
      expect(selector).toMatch(/^\.tc-studio(?:\b|[\s.:[#>+~])/)
    }

    const affectedSources = [appSource, navSource, uploadSource, headerSource, studioCss].join('\n')
    expect(affectedSources).not.toMatch(/feTurbulence|noise-layer|film-grain|scanline-layer|\/files\/ti-/i)
    expect(affectedSources).not.toMatch(/[⌁⌕×＋▧◫✦]/u)
  })

  it('uses readable light-scheme tokens for every Studio chrome surface', () => {
    const studio = blockBody(studioCss, '.tc-studio')
    const light = blockBody(studioCss, ".tc-studio:is(:root[data-mantine-color-scheme='light'] .tc-studio)")
    const header = blockBody(studioCss, '.tc-studio .app-header.tc-studio-header')
    const nav = blockBody(studioCss, '.tc-studio .floating-nav-card')
    const assetPanel = blockBody(studioCss, '.tc-studio .asset-panel-shell')
    const uploadBar = blockBody(studioCss, '.tc-studio .pending-uploads-bar-card')
    const chat = blockBody(studioCss, '.tc-studio .tc-ai-chat__card')
    const saveButton = blockBody(studioCss, '.tc-studio .app-save-button')
    const chatBubble = blockBody(studioCss, '.tc-studio .tc-ai-chat__bubble-button::before')

    for (const token of [
      '--tc-studio-chrome-header',
      '--tc-studio-chrome',
      '--tc-studio-chrome-panel',
      '--tc-studio-chrome-chat',
      '--tc-studio-accent-surface',
      '--tc-studio-accent-surface-hover',
      '--tc-studio-accent-text',
    ]) {
      expect(studio).toContain(`${token}:`)
      expect(light).toContain(`${token}:`)
    }

    expect(header).toContain('background: var(--tc-studio-chrome-header);')
    expect(nav).toContain('background: var(--tc-studio-chrome) !important;')
    expect(assetPanel).toContain('background: var(--tc-studio-chrome-panel) !important;')
    expect(uploadBar).toContain('background: var(--tc-studio-chrome);')
    expect(chat).toContain('background: var(--tc-studio-chrome-chat) !important;')
    expect(saveButton).toContain('background: var(--tc-studio-accent-surface);')
    expect(chatBubble).toContain('background: var(--tc-studio-accent-surface);')
    expect(studioCss).toMatch(/\.tc-studio \.floating-nav-add \{[^}]*background: var\(--tc-studio-accent-surface\) !important;/)

    const contrastPairs = [
      ['--tc-studio-text-muted', '--tc-studio-chrome'],
      ['--tc-studio-text', '--tc-studio-surface-quiet'],
      ['--tc-studio-text', '--tc-studio-chrome-panel'],
      ['--tc-studio-text', '--tc-studio-chrome-chat'],
      ['--tc-studio-accent-text', '--tc-studio-accent-surface'],
    ] as const
    for (const [foreground, background] of contrastPairs) {
      expect(contrastRatio(customProperty(light, foreground), customProperty(light, background))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('uses the exact Chinese React Flow accessibility labels', () => {
    const interactiveControl = blockBody(studioCss, '.tc-studio .tc-canvas__controls .react-flow__controls-interactive::after')

    expect(canvasSource).toContain('ariaLabelConfig={{')
    expect(canvasSource).toContain("'controls.ariaLabel': '画布控制'")
    expect(canvasSource).toContain("'controls.zoomIn.ariaLabel': '放大'")
    expect(canvasSource).toContain("'controls.zoomOut.ariaLabel': '缩小'")
    expect(canvasSource).toContain("'controls.fitView.ariaLabel': '全览'")
    expect(canvasSource).toContain("'controls.interactive.ariaLabel': '锁定或解锁画布'")
    expect(canvasSource).toContain("'minimap.ariaLabel': '画布缩略图'")
    expect(interactiveControl).toContain("content: '锁定 / 解锁';")
  })

  it('keeps Chat reservation synchronized with each scoped panel breakpoint', () => {
    const medium = blockBody(studioCss, '@media (max-width: 1499px)')
    const narrow = blockBody(studioCss, '@media (max-width: 1200px)')
    const bubble = blockBody(studioCss, '@media (max-width: 900px)')

    expect(medium).toContain('padding-right: min(var(--tc-ai-chat-reserved-width), 444px);')
    expect(narrow).toContain('padding-right: min(var(--tc-ai-chat-reserved-width), 384px);')
    expect(bubble).toContain('padding-right: 0 !important;')
  })

  it('keeps the contracted mobile MiniMap and Controls coordinates', () => {
    const mobile = blockBody(studioCss, '@media (max-width: 720px)')
    const minimap = blockBody(mobile, '.tc-studio .tc-canvas__minimap.react-flow__panel.bottom.left')
    const controls = blockBody(mobile, '.tc-studio .tc-canvas__controls.react-flow__panel.bottom.left')

    expect(minimap).toContain('left: 12px !important;')
    expect(minimap).toContain('bottom: 12px !important;')
    expect(minimap).toContain('width: 132px !important;')
    expect(minimap).toContain('height: 94px !important;')
    expect(controls).toContain('left: 12px !important;')
    expect(controls).toContain('bottom: 130px !important;')
  })

  it('gives the desktop FloatingNav a dedicated lane in short viewports', () => {
    const shortDesktop = blockBody(studioCss, '@media (max-height: 800px) and (min-width: 721px)')
    const nav = blockBody(shortDesktop, '.tc-studio .floating-nav')
    const card = blockBody(shortDesktop, '.tc-studio .floating-nav-card')
    const minimap = blockBody(shortDesktop, '.tc-studio .tc-canvas__minimap.react-flow__panel.bottom.left')
    const controls = blockBody(shortDesktop, '.tc-studio .tc-canvas__controls.react-flow__panel.bottom.left')

    expect(nav).toContain('top: 128px !important;')
    expect(nav).toContain('transform: none !important;')
    expect(nav).toContain('max-height: calc(100dvh - 140px);')
    expect(card).toContain('max-height: calc(100dvh - 140px);')
    expect(minimap).toContain('left: 82px !important;')
    expect(controls).toContain('left: 82px !important;')
  })

  it('keeps generic and real node metadata readable inside Studio', () => {
    const generic = blockBody(studioCss, '.tc-studio .react-flow__node [data-meta]')
    const upstreamOrder = blockBody(studioCss, '.tc-studio .tc-task-node__upstream-reference-order')

    expect(generic).toContain('font-size: 10px;')
    expect(generic).toContain('line-height: 14px;')
    expect(generic).toContain('font-weight: 600;')
    expect(upstreamOrder).toContain('font-size: 10px;')
    expect(upstreamOrder).toContain('line-height: 14px;')
    expect(upstreamOrder).toContain('font-weight: 600;')
    expect(upstreamOrder).toContain('height: 14px;')
  })
})
