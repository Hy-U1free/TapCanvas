import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FloatingNav from '../../src/ui/FloatingNav'

const mocks = vi.hoisted(() => ({
  setActivePanel: vi.fn(),
  setPanelAnchorY: vi.fn(),
  spaNavigate: vi.fn(),
  confirmLeaveForProjectChange: vi.fn(),
  isAdmin: false,
}))

type MockUiState = {
  activePanel: string | null
  setActivePanel: (panel: string | null) => void
  setPanelAnchorY: (y: number) => void
}

const mockUiState: MockUiState = {
  activePanel: null,
  setActivePanel: mocks.setActivePanel,
  setPanelAnchorY: mocks.setPanelAnchorY,
}

vi.mock('../../src/ui/uiStore', () => {
  const useUIStore = Object.assign(
    (selector: (state: MockUiState) => unknown) => selector(mockUiState),
    { getState: () => mockUiState },
  )
  return { useUIStore }
})

vi.mock('../../src/auth/store', () => ({
  useAuth: (selector: (state: { user: { login: string } }) => unknown) => (
    selector({ user: { login: 'studio-user' } })
  ),
}))

vi.mock('../../src/auth/isAdmin', () => ({
  useIsAdmin: () => mocks.isAdmin,
}))

vi.mock('../../src/canvas/i18n', () => ({
  $: (value: string) => value,
}))

vi.mock('../../src/utils/spaNavigate', () => ({
  spaNavigate: (...args: unknown[]) => mocks.spaNavigate(...args),
}))

vi.mock('../../src/ui/pendingUploadGuard', () => ({
  confirmLeaveForProjectChange: () => mocks.confirmLeaveForProjectChange(),
}))

function renderNav() {
  return render(
    <MantineProvider>
      <FloatingNav />
    </MantineProvider>,
  )
}

describe('FloatingNav Studio contract', () => {
  beforeEach(() => {
    mockUiState.activePanel = null
    mocks.isAdmin = false
    mocks.setActivePanel.mockReset()
    mocks.setActivePanel.mockImplementation((panel: string | null) => {
      mockUiState.activePanel = panel
    })
    mocks.setPanelAnchorY.mockClear()
    mocks.spaNavigate.mockClear()
    mocks.confirmLeaveForProjectChange.mockReset()
    mocks.confirmLeaveForProjectChange.mockReturnValue(true)
  })

  it('keeps every primary destination visibly labelled without hover', () => {
    const { container } = renderNav()

    for (const label of ['项目', '工作流', '资产', '漫剧', '展映', '运行', '历史', '账户']) {
      expect(screen.getByText(label)).toBeVisible()
    }

    expect(container.querySelector('[data-tour="floating-nav"]')).toBeInTheDocument()
    expect(container.querySelector('[data-tour="add-button"]')).toBeInTheDocument()
  })

  it('exposes the floating rail as the labelled Studio navigation landmark', () => {
    renderNav()

    expect(screen.getByRole('navigation', { name: 'Studio 主导航' })).toBeInTheDocument()
  })

  it('preserves the workflow panel toggle contract', () => {
    renderNav()

    fireEvent.click(screen.getByText('工作流'))

    expect(mocks.setActivePanel).toHaveBeenCalledWith('template')
  })

  it('does not leave or close the current panel when project navigation is rejected', () => {
    mockUiState.activePanel = 'assets'
    mocks.confirmLeaveForProjectChange.mockReturnValue(false)
    renderNav()

    fireEvent.click(screen.getByRole('button', { name: '项目' }))

    expect(mocks.confirmLeaveForProjectChange).toHaveBeenCalledTimes(1)
    expect(mocks.setActivePanel).not.toHaveBeenCalled()
    expect(mocks.spaNavigate).not.toHaveBeenCalled()
  })

  it('closes the panel and keeps the existing projects route when navigation is allowed', () => {
    mockUiState.activePanel = 'assets'
    renderNav()

    fireEvent.click(screen.getByRole('button', { name: '项目' }))

    expect(mocks.confirmLeaveForProjectChange).toHaveBeenCalledTimes(1)
    expect(mocks.setActivePanel).toHaveBeenCalledWith(null)
    expect(mocks.spaNavigate).toHaveBeenCalledWith('/projects')
  })

  it('exposes the active panel as a pressed toggle and closes it on click', () => {
    mockUiState.activePanel = 'template'
    renderNav()

    const workflow = screen.getByRole('button', { name: '工作流' })
    const account = screen.getByRole('button', { name: '账户' })
    expect(workflow).toHaveAttribute('aria-pressed', 'true')
    expect(workflow).toHaveAttribute('data-active', 'true')
    expect(account).toHaveAttribute('aria-pressed', 'false')
    expect(account).toHaveAttribute('data-active', 'false')

    fireEvent.click(workflow)
    expect(mocks.setActivePanel).toHaveBeenCalledWith(null)
  })

  it('omits toggle state from route actions while keeping panel toggles semantic', () => {
    mocks.isAdmin = true
    renderNav()

    const project = screen.getByRole('button', { name: '项目' })
    const adminDashboard = screen.getByRole('button', { name: '看板' })
    const workflow = screen.getByRole('button', { name: '工作流' })
    const account = screen.getByRole('button', { name: '账户' })

    expect(project).not.toHaveAttribute('aria-pressed')
    expect(project).not.toHaveAttribute('data-active')
    expect(adminDashboard).not.toHaveAttribute('aria-pressed')
    expect(adminDashboard).not.toHaveAttribute('data-active')
    expect(workflow).toHaveAttribute('aria-pressed', 'false')
    expect(workflow).toHaveAttribute('data-active', 'false')
    expect(account).toHaveAttribute('aria-pressed', 'false')
    expect(account).toHaveAttribute('data-active', 'false')
  })

  it('keeps a hover-opened panel open on the following click, then closes on an explicit second click', () => {
    const view = renderNav()
    const assetsButton = screen.getByRole('button', { name: '我的资产' })
    const assetsItem = assetsButton.closest('.floating-nav-item-wrap')
    expect(assetsItem).not.toBeNull()

    fireEvent.mouseEnter(assetsItem!)
    expect(mockUiState.activePanel).toBe('assets')

    view.rerender(
      <MantineProvider>
        <FloatingNav />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '我的资产' }))
    expect(mockUiState.activePanel).toBe('assets')

    view.rerender(
      <MantineProvider>
        <FloatingNav />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '我的资产' }))
    expect(mockUiState.activePanel).toBeNull()
  })
})
