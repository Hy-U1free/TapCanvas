import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildTapCanvasTheme } from '../../src/theme/tapCanvasTheme'
import { UI_LAYERS } from '../../src/theme/uiLayers'

function source(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')
}

describe('UI layer defaults', () => {
  it('keeps modal surfaces above persistent chrome and their portaled controls above modals', () => {
    expect(UI_LAYERS.fullscreenWorkspace).toBeGreaterThan(650)
    expect(UI_LAYERS.modal).toBeGreaterThan(UI_LAYERS.fullscreenWorkspace)
    expect(UI_LAYERS.floatingPopover).toBeGreaterThan(10_050)
    expect(UI_LAYERS.tour).toBeGreaterThan(UI_LAYERS.floatingPopover)
    expect(UI_LAYERS.notification).toBeGreaterThan(UI_LAYERS.tour)

    const components = buildTapCanvasTheme('dark').components as Record<string, any>
    expect(components.Modal.defaultProps.zIndex).toBe(UI_LAYERS.modal)
    expect(components.Drawer.defaultProps.zIndex).toBe(UI_LAYERS.modal)
    expect(components.Menu.defaultProps.zIndex).toBe(UI_LAYERS.floatingPopover)
    expect(components.Popover.defaultProps.zIndex).toBe(UI_LAYERS.floatingPopover)
    expect(components.Tooltip.defaultProps.zIndex).toBe(UI_LAYERS.floatingPopover)
    expect(components.Select.defaultProps.comboboxProps.zIndex).toBe(UI_LAYERS.floatingPopover)
    expect(components.MultiSelect.defaultProps.comboboxProps.zIndex).toBe(UI_LAYERS.floatingPopover)
  })

  it('uses the shared layer tokens for explicit global Studio surfaces', () => {
    const chatSource = source('../../src/ui/chat/AiChatDialog.tsx')
    const nanoComicSource = source('../../src/ui/NanoComicWorkspacePanel.tsx')
    const previewSource = source('../../src/ui/PreviewModal.tsx')
    const projectPanelSource = source('../../src/ui/ProjectPanel.tsx')
    const globalCss = source('../../src/styles.css')
    const studioCss = source('../../src/ui/studio/studio.css')

    expect(chatSource).not.toContain('zIndex={10050}')
    expect(chatSource).toContain('zIndex={UI_LAYERS.modal}')
    expect(nanoComicSource).not.toContain('zIndex: 9000')
    expect(previewSource).toContain('zIndex: UI_LAYERS.modal')
    expect(projectPanelSource).not.toContain('zIndex: 9000')
    expect(globalCss).not.toMatch(/\.tc-ai-chat--maximized\s*\{[^}]*z-index:\s*9999/s)
    expect(studioCss).not.toMatch(/\.tc-studio \.tc-ai-chat__backdrop\s*\{[^}]*z-index:\s*9998/s)
  })
})
