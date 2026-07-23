import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildStudioUrl } from '../../src/utils/appRoutes'
import HomePage from '../../src/ui/HomePage'

vi.mock('../../src/utils/appRoutes', () => ({
  buildStudioUrl: vi.fn(() => '/studio'),
}))

function renderHomePage() {
  return render(
    <MantineProvider>
      <HomePage />
    </MantineProvider>,
  )
}

describe('HomePage', () => {
  it('renders the approved four-act homepage landmarks', () => {
    renderHomePage()

    expect(screen.getByRole('main')).toHaveClass('tc-home-page')
    expect(screen.getByRole('heading', { level: 1, name: 'TapCanvas' })).toBeVisible()
    expect(screen.getByText('让每个镜头，在画布中发生。')).toBeVisible()
    expect(screen.getByRole('region', { name: '素材组装为工作流' })).toBeVisible()
    expect(screen.getByRole('tablist', { name: '创作流程预览' })).toBeVisible()
  })

  it('builds the Studio destination once and reuses it for every workspace CTA', () => {
    renderHomePage()

    const studioLinks = screen.getAllByRole('link', {
      name: /立即进入创作画布|进入工作台/,
    })

    expect(buildStudioUrl).toHaveBeenCalledTimes(1)
    expect(studioLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of studioLinks) {
      expect(link).toHaveAttribute('href', '/studio')
    }
  })

  it('loads only the first two decorative hero scenes eagerly', () => {
    const { container } = renderHomePage()

    const thirdSceneImage = container.querySelector<HTMLImageElement>(
      '.tc-home-page__hero-scene-card--3 .tc-home-page__hero-scene-image',
    )
    expect(thirdSceneImage).not.toBeNull()
    expect(thirdSceneImage).toHaveAttribute('loading', 'lazy')
  })

  it('switches the read-only showcase tabs with arrow keys and moves focus', () => {
    renderHomePage()

    const scriptTab = screen.getByRole('tab', { name: /脚本/ })
    const storyboardTab = screen.getByRole('tab', { name: /分镜/ })
    const videoTab = screen.getByRole('tab', { name: /视频/ })

    expect(scriptTab).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(scriptTab, { key: 'ArrowRight' })
    expect(storyboardTab).toHaveAttribute('aria-selected', 'true')
    expect(storyboardTab).toHaveFocus()

    fireEvent.keyDown(storyboardTab, { key: 'ArrowLeft' })
    expect(scriptTab).toHaveAttribute('aria-selected', 'true')
    expect(scriptTab).toHaveFocus()

    fireEvent.keyDown(scriptTab, { key: 'ArrowLeft' })
    expect(videoTab).toHaveAttribute('aria-selected', 'true')
    expect(videoTab).toHaveFocus()
  })

  it('keeps every tabpanel target mounted for the complete aria-controls contract', () => {
    renderHomePage()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)

    for (const tab of tabs) {
      const panelId = tab.getAttribute('aria-controls')
      expect(panelId).toBeTruthy()

      const panel = document.getElementById(panelId as string)
      expect(panel).not.toBeNull()
      expect(panel).toHaveAttribute('role', 'tabpanel')
      expect(panel).toHaveAttribute('aria-labelledby', tab.id)
      expect(panel?.hidden).toBe(tab.getAttribute('aria-selected') !== 'true')
    }
  })

  it('does not render texture or scanline overlays', () => {
    const { container } = renderHomePage()

    expect(container.querySelector('.tc-home-page__noise-layer')).toBeNull()
    expect(container.querySelector('.tc-home-page__scanline-layer')).toBeNull()
  })
})
