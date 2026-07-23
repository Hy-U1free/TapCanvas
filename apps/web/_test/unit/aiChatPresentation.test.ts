import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as aiChatModule from '../../src/ui/chat/AiChatDialog'
import { UI_LAYERS } from '../../src/theme/uiLayers'

type PresentationModule = {
  resolveAiChatPresentationMode: (
    mode: 'compact' | 'expanded' | 'maximized',
    narrowViewport: boolean,
  ) => 'compact' | 'expanded' | 'maximized'
  resolveAiChatVisualStatus: (
    sending: boolean,
    latestMessageKind: 'progress' | 'result' | 'error' | null | undefined,
  ) => '就绪' | '运行中' | '错误'
  resolveAiChatTabWrapTarget: (
    root: HTMLElement,
    activeElement: Element | null,
    shiftKey: boolean,
  ) => HTMLElement | null
}

const presentation = aiChatModule as unknown as PresentationModule
const dialogSource = readFileSync(
  resolve(process.cwd(), 'src/ui/chat/AiChatDialog.tsx'),
  'utf8',
)
const studioCss = readFileSync(
  resolve(process.cwd(), 'src/ui/studio/studio.css'),
  'utf8',
)

function cssRuleBody(source: string, selectors: string[]): string {
  const escapedSelectors = selectors.map((selector) => selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const match = source.match(new RegExp(`${escapedSelectors.join('\\s*,\\s*')}\\s*\\{([^}]*)\\}`))
  return match?.[1] ?? ''
}

describe('AI Chat presentation helpers', () => {
  it('keeps the three desktop presentation modes intact', () => {
    expect(presentation.resolveAiChatPresentationMode('compact', false)).toBe('compact')
    expect(presentation.resolveAiChatPresentationMode('expanded', false)).toBe('expanded')
    expect(presentation.resolveAiChatPresentationMode('maximized', false)).toBe('maximized')
  })

  it('shows a stored expanded preference as a narrow bubble without mutating storage', () => {
    const storedPreference = JSON.stringify({ dockRight: true, mode: 'expanded' })
    window.localStorage.setItem('tapcanvas.aiChat.layoutPreference.v1', storedPreference)

    expect(presentation.resolveAiChatPresentationMode('expanded', true)).toBe('compact')
    expect(presentation.resolveAiChatPresentationMode('maximized', true)).toBe('maximized')
    expect(window.localStorage.getItem('tapcanvas.aiChat.layoutPreference.v1')).toBe(storedPreference)
  })

  it('maps only real sending and latest-message error state to Chinese status', () => {
    expect(presentation.resolveAiChatVisualStatus(true, undefined)).toBe('运行中')
    expect(presentation.resolveAiChatVisualStatus(true, 'error')).toBe('运行中')
    expect(presentation.resolveAiChatVisualStatus(false, 'error')).toBe('错误')
    expect(presentation.resolveAiChatVisualStatus(false, 'progress')).toBe('就绪')
    expect(presentation.resolveAiChatVisualStatus(false, 'result')).toBe('就绪')
    expect(presentation.resolveAiChatVisualStatus(false, undefined)).toBe('就绪')
  })

  it('wraps maximized Tab at the real visible focus boundaries', () => {
    const style = document.createElement('style')
    style.textContent = '.ai-chat-test-hidden { display: none; }'
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.innerHTML = `
      <button data-focus="first">first</button>
      <textarea data-focus="middle"></textarea>
      <button data-focus="last">last</button>
      <div class="ai-chat-test-hidden"><input data-focus="css-hidden" /></div>
      <button data-focus="disabled" disabled>disabled</button>
      <button data-focus="negative" tabindex="-1">negative</button>
      <div hidden><button data-focus="hidden-ancestor">hidden ancestor</button></div>
      <div aria-hidden="true"><button data-focus="aria-hidden">aria hidden</button></div>
      <div inert><button data-focus="inert">inert</button></div>
      <button data-focus="zero-rect">zero rect</button>
    `
    document.body.appendChild(root)

    const nonEmptyRects = [{ width: 20, height: 20 }] as unknown as DOMRectList
    root.querySelectorAll<HTMLElement>('button, input, textarea').forEach((element) => {
      Object.defineProperty(element, 'getClientRects', {
        configurable: true,
        value: () => nonEmptyRects,
      })
    })
    const zeroRect = root.querySelector<HTMLElement>('[data-focus="zero-rect"]')!
    Object.defineProperty(zeroRect, 'getClientRects', {
      configurable: true,
      value: () => [] as unknown as DOMRectList,
    })

    const first = root.querySelector<HTMLElement>('[data-focus="first"]')!
    const middle = root.querySelector<HTMLElement>('[data-focus="middle"]')!
    const last = root.querySelector<HTMLElement>('[data-focus="last"]')!

    try {
      expect(window.getComputedStyle(root.querySelector<HTMLElement>('[data-focus="css-hidden"]')!.parentElement!).display).toBe('none')
      expect(presentation.resolveAiChatTabWrapTarget(root, last, false)).toBe(first)
      expect(presentation.resolveAiChatTabWrapTarget(root, first, true)).toBe(last)
      expect(presentation.resolveAiChatTabWrapTarget(root, middle, false)).toBeNull()
      expect(dialogSource).toContain("if (e.key === 'Tab' && isMaximized)")
      expect(dialogSource).toContain('const wrapTarget = resolveAiChatTabWrapTarget(')
      expect(dialogSource).toContain('wrapTarget.focus({ preventScroll: true })')
    } finally {
      root.remove()
      style.remove()
    }
  })
})

describe('AI Chat presentation source contract', () => {
  it('exports the mode contract and derives the narrow presentation from the exact media query', () => {
    expect(dialogSource).toContain("export type AiChatMode = 'compact' | 'expanded' | 'maximized'")
    expect(dialogSource).toContain("useMediaQuery('(max-width: 56.25em)', false, { getInitialValueInEffect: false })")
    expect(dialogSource).toContain('data-chat-mode={presentationMode}')
  })

  it('renders readable header commands, a labelled bubble, and a live status row', () => {
    for (const command of ['新对话', '教程', '展开', '收起', '聚焦', '退出聚焦', '关闭']) {
      expect(dialogSource).toContain(`$('${command}')`)
    }
    expect(dialogSource).toContain('className="tc-ai-chat__bubble-label">AI</span>')
    expect(dialogSource).toContain('className="tc-ai-chat__visual-status"')
    expect(dialogSource).toContain('role="status"')
    expect(dialogSource).toContain('aria-live="polite"')
    expect(dialogSource).toContain('aria-atomic="true"')
  })

  it('keeps Chat interaction styling scoped, readable, and keyboard visible', () => {
    expect(studioCss).toMatch(/\.tc-studio \.tc-ai-chat__command[\s\S]*?font-size:\s*12px/)
    expect(studioCss).toMatch(/\.tc-studio \.tc-ai-chat__visual-status[\s\S]*?font-size:\s*12px/)
    expect(studioCss).toMatch(/\.tc-studio \.tc-ai-chat__send,[\s\S]*?min-width:\s*32px;[\s\S]*?min-height:\s*32px/)
    expect(studioCss).toMatch(/\.tc-studio \.tc-ai-chat button:focus-visible[\s\S]*?outline:\s*2px solid/)
  })

  it('keeps the mobile maximized header inside the panel with a reachable two-column command grid', () => {
    const mobileStart = studioCss.indexOf('@media (max-width: 720px)')
    const mobileEnd = studioCss.indexOf('@media (prefers-reduced-motion: reduce)', mobileStart)
    const mobileCss = studioCss.slice(mobileStart, mobileEnd)

    const headerRule = cssRuleBody(mobileCss, [
      '.tc-studio .tc-ai-chat--maximized .tc-ai-chat__header',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized .tc-ai-chat__header',
    ])
    expect(headerRule).toMatch(/display:\s*grid/)
    expect(headerRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(headerRule).toMatch(/width:\s*100%/)
    expect(headerRule).toMatch(/min-width:\s*0/)

    const titleRule = cssRuleBody(mobileCss, [
      '.tc-studio .tc-ai-chat--maximized .tc-ai-chat__title-button',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized .tc-ai-chat__title-button',
    ])
    expect(titleRule).toMatch(/grid-column:\s*1\s*\/\s*-1/)
    expect(titleRule).toMatch(/width:\s*100%/)
    expect(titleRule).toMatch(/min-width:\s*0/)

    const commandsRule = cssRuleBody(mobileCss, [
      '.tc-studio .tc-ai-chat--maximized .tc-ai-chat__header-right',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized .tc-ai-chat__header-right',
    ])
    expect(commandsRule).toMatch(/display:\s*grid/)
    expect(commandsRule).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(commandsRule).toMatch(/width:\s*100%/)
    expect(commandsRule).toMatch(/min-width:\s*0/)

    const commandRule = cssRuleBody(mobileCss, [
      '.tc-studio .tc-ai-chat--maximized .tc-ai-chat__command',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized .tc-ai-chat__command',
    ])
    expect(commandRule).toMatch(/width:\s*100%/)
    expect(commandRule).toMatch(/min-width:\s*0/)
    expect(commandRule).toMatch(/min-height:\s*32px/)
    expect(commandRule).toMatch(/font-size:\s*12px/)
  })

  it('sizes maximized Chat from its fixed containing block so every edge keeps a 16px inset', () => {
    const baseRule = cssRuleBody(studioCss, [
      '.tc-studio .tc-ai-chat--maximized',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized',
    ])
    expect(baseRule).toMatch(/width:\s*min\(1040px,\s*calc\(100%\s*-\s*32px\)\)/)
    expect(baseRule).toMatch(/height:\s*min\(860px,\s*calc\(100%\s*-\s*32px\)\)/)
    expect(baseRule).toMatch(/max-width:\s*calc\(100%\s*-\s*32px\)/)
    expect(baseRule).toMatch(/max-height:\s*calc\(100%\s*-\s*32px\)/)
    expect(baseRule).not.toMatch(/100(?:d)?v[wh]/)

    const mobileStart = studioCss.indexOf('@media (max-width: 720px)')
    const mobileEnd = studioCss.indexOf('@media (prefers-reduced-motion: reduce)', mobileStart)
    const mobileCss = studioCss.slice(mobileStart, mobileEnd)
    const mobileRule = cssRuleBody(mobileCss, [
      '.tc-studio .tc-ai-chat--maximized',
      '.tc-studio .tc-ai-chat--dock-right.tc-ai-chat--maximized',
    ])
    expect(mobileRule).toMatch(/width:\s*calc\(100%\s*-\s*32px\)/)
    expect(mobileRule).toMatch(/height:\s*calc\(100%\s*-\s*32px\)/)
    expect(mobileRule).toMatch(/max-width:\s*calc\(100%\s*-\s*32px\)/)
    expect(mobileRule).toMatch(/max-height:\s*calc\(100%\s*-\s*32px\)/)
    expect(mobileRule).not.toMatch(/100(?:d)?v[wh]/)
  })

  it('renders the maximized backdrop beside the transformed Chat root and makes it independently clickable', () => {
    const componentReturn = dialogSource.slice(dialogSource.lastIndexOf('\n  return (\n'))
    const backdropIndex = componentReturn.indexOf('className="tc-ai-chat__backdrop"')
    const rootIndex = componentReturn.indexOf('className={rootClassName}')
    expect(componentReturn.trimStart()).toMatch(/^return \(\s*<>\s*\{isMaximized/)
    expect(backdropIndex).toBeGreaterThan(0)
    expect(backdropIndex).toBeLessThan(rootIndex)

    const backdropElementStart = componentReturn.lastIndexOf('<div', backdropIndex)
    const backdropElementEnd = componentReturn.indexOf('/>', backdropIndex) + 2
    const backdropElement = componentReturn.slice(backdropElementStart, backdropElementEnd)
    expect(backdropElement).toContain('aria-hidden="true"')
    expect(backdropElement).toContain('data-ux-floating')
    expect(backdropElement).toContain('onMouseDown')
    expect(backdropElement).toContain('toggleMaximized()')

    const backdropRule = cssRuleBody(studioCss, ['.tc-studio .tc-ai-chat__backdrop'])
    expect(backdropRule).toMatch(/position:\s*fixed/)
    expect(backdropRule).toMatch(/inset:\s*0/)
    expect(backdropRule).toContain(`z-index: ${UI_LAYERS.fullscreenWorkspace - 1};`)
    expect(backdropRule).toMatch(/opacity:\s*1/)
    expect(backdropRule).toMatch(/pointer-events:\s*auto/)
    expect(studioCss).not.toMatch(/\.tc-studio[^,{]*\.tc-ai-chat--maximized[^,{]*\.tc-ai-chat__backdrop/)
  })

  it('keeps both built-in Chat modals above the maximized backdrop', () => {
    expect(dialogSource).toMatch(/<Modal\s+[\s\S]*?opened=\{replicatePickerOpened\}[\s\S]*?zIndex=\{UI_LAYERS\.modal\}[\s\S]*?title=\{\$\(/)
    expect(dialogSource).toMatch(/<Modal\s+[\s\S]*?opened=\{tutorialOpened\}[\s\S]*?zIndex=\{UI_LAYERS\.modal\}[\s\S]*?title=\{\$\(/)
    expect(dialogSource.match(/<Modal\b/g)).toHaveLength(2)
    expect(dialogSource).not.toContain('withinPortal={false}')
  })

  it('makes maximized Chat keyboard-modal while yielding to nested overlays and restoring focus on exit', () => {
    expect(dialogSource).toContain('FocusTrap')
    expect(dialogSource).toContain('<FocusTrap active={isMaximized && !replicatePickerOpened && !tutorialOpened}>')
    expect(dialogSource).toContain("role={isMaximized ? 'dialog' : undefined}")
    expect(dialogSource).toContain('aria-modal={isMaximized ? true : undefined}')
    expect(dialogSource).toContain("aria-label={isMaximized ? $('AI 对话聚焦模式') : undefined}")

    expect(dialogSource).toContain('const focusBeforeMaximizeRef = React.useRef<HTMLElement | null>(null)')
    expect(dialogSource).toContain('const rememberFocusBeforeMaximize = React.useCallback(() => {')
    expect(dialogSource).toContain('document.activeElement')
    expect(dialogSource.match(/rememberFocusBeforeMaximize\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(dialogSource).toContain('const focusRestoreModeRef = React.useRef<AiChatMode>(initialLayoutPreference.mode)')
    expect(dialogSource).toContain('previousFocusedElement?.isConnected')
    expect(dialogSource).toContain("'.tc-ai-chat__bubble-button'")
    expect(dialogSource).toContain("'.tc-ai-chat__command[aria-label=\"聚焦\"]'")
    expect(dialogSource).toContain('window.requestAnimationFrame(() => {')

    expect(dialogSource).toContain('shouldYieldKeyboardEventToNestedOverlay')
    expect(dialogSource).toContain("target.closest('[role=\"dialog\"]')")
    expect(dialogSource).toContain("target.closest('[role=\"menu\"]')")
    expect(dialogSource).toContain('if (shouldYieldKeyboardEventToNestedOverlay(e.target, e.currentTarget)) return')
  })

  it('renders the drag handle only during compact transition and keeps expanded headings non-interactive', () => {
    expect(dialogSource).toContain('{isCompact && !showDockedBubble && (')

    const expandedHeaderStart = dialogSource.indexOf('<Group className="tc-ai-chat__header"')
    const expandedHeaderActionsStart = dialogSource.indexOf('<Group className="tc-ai-chat__header-right"', expandedHeaderStart)
    const expandedHeading = dialogSource.slice(expandedHeaderStart, expandedHeaderActionsStart)
    expect(expandedHeading).toContain('<div')
    expect(expandedHeading).toContain('className="tc-ai-chat__title-button tc-ai-chat__title-button--static"')
    expect(expandedHeading).toContain('role="heading"')
    expect(expandedHeading).toContain('aria-level={2}')
    expect(expandedHeading).not.toContain('onClick={expandChat}')
    expect(expandedHeading).not.toContain('<button')

    const staticTitleRule = cssRuleBody(studioCss, ['.tc-studio .tc-ai-chat__title-button--static'])
    expect(staticTitleRule).toMatch(/cursor:\s*default/)
  })

  it('defers compact focus restoration until the bubble button is actually mounted', () => {
    expect(dialogSource).toContain('const pendingBubbleFocusRestoreRef = React.useRef(false)')
    expect(dialogSource).toContain('pendingBubbleFocusRestoreRef.current = true')
    expect(dialogSource).toContain('if (!showDockedBubble || !pendingBubbleFocusRestoreRef.current) return')
    expect(dialogSource).toMatch(
      /React\.useEffect\(\(\) => \{[\s\S]*?if \(!showDockedBubble \|\| !pendingBubbleFocusRestoreRef\.current\) return[\s\S]*?window\.requestAnimationFrame\(\(\) => \{[\s\S]*?document\.querySelector<HTMLElement>\('\.tc-ai-chat__bubble-button'\)[\s\S]*?bubbleButton\.focus\(\{ preventScroll: true \}\)[\s\S]*?pendingBubbleFocusRestoreRef\.current = false[\s\S]*?\}, \[showDockedBubble\]\)/,
    )
  })

  it('clears the reserved Chat width whenever nanoComic hides the component', () => {
    expect(dialogSource).toContain("const reservedWidth =\n      activePanel === 'nanoComic'\n        ? AI_CHAT_LAYOUT_RESERVED_WIDTH_NONE")
    expect(dialogSource).toContain('}, [activePanel, presentationMode])')
    expect(dialogSource).toContain("if (activePanel === 'nanoComic')")
  })
})
