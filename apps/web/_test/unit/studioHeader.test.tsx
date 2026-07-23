import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudioHeader, { type StudioHeaderProps } from '../../src/ui/studio/StudioHeader'

const callbacks = {
  onProjectNameChange: vi.fn(),
  onProjectNameBlur: vi.fn(),
  onOpenAiWorkbench: vi.fn(),
  onRecharge: vi.fn(),
  onSave: vi.fn(),
  onExport: vi.fn(),
  onToggleTheme: vi.fn(),
  onToggleLanguage: vi.fn(),
  onHelp: vi.fn(),
}

const baseProps: StudioHeaderProps = {
  compact: false,
  ownerLabel: '项目',
  ownerTone: 'gray',
  hostDescription: '当前画布保存到项目宿主 测试项目',
  isDirty: true,
  saving: false,
  projectName: '测试项目',
  showAccountActions: true,
  showAiWorkbench: true,
  points: 48,
  pointsLoading: false,
  rechargeLoading: false,
  colorScheme: 'dark',
  language: 'zh',
  tapshowUrl: '/tapshow',
  sourceUrl: 'https://github.com/anymouschina/TapCanvas',
  ...callbacks,
}

function renderHeader(props: StudioHeaderProps = baseProps) {
  return render(
    <MantineProvider>
      <StudioHeader {...props} />
    </MantineProvider>,
  )
}

describe('StudioHeader', () => {
  beforeEach(() => {
    for (const callback of Object.values(callbacks)) callback.mockClear()
  })

  it('renders labelled desktop commands and preserves the original callbacks and tour markers', () => {
    const { container } = renderHeader()

    for (const name of ['保存', '导出', '展映', '主题', '语言', '帮助', '源码']) {
      expect(screen.getByText(name)).toBeVisible()
    }

    const projectInput = screen.getByRole('textbox', { name: '项目名' })
    expect(projectInput).toHaveAttribute('data-tour', 'project-name')
    expect(screen.getByRole('button', { name: '保存' })).toHaveAttribute('data-tour', 'save-button')
    expect(screen.getByRole('button', { name: '帮助' })).toHaveAttribute('data-tour', 'help-tour')
    expect(container.querySelectorAll('[data-tour="help-tour"]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    fireEvent.click(screen.getByRole('button', { name: '导出' }))

    expect(callbacks.onSave).toHaveBeenCalledTimes(1)
    expect(callbacks.onExport).toHaveBeenCalledTimes(1)
  })

  it('exposes the visible Studio header as a labelled banner landmark', () => {
    renderHeader()

    expect(screen.getByRole('banner', { name: 'Studio 顶栏' })).toBeInTheDocument()
  })

  it('moves every low-frequency command into one labelled More menu in compact mode', async () => {
    const { container } = renderHeader({ ...baseProps, compact: true })

    expect(screen.queryByRole('button', { name: '导出' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '更多' }))

    for (const name of ['导出', '展映', '主题', '语言', '帮助', '源码']) {
      expect(await screen.findByText(name)).toBeVisible()
    }
    expect(document.querySelector('.tc-studio-header__more-dropdown')).toHaveClass('tc-studio')
    expect(container.querySelectorAll('[data-tour="help-tour"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-tour="help-tour"]')).toHaveLength(1)
  })

  it('distinguishes loading, unavailable, and real zero credit states', () => {
    const view = renderHeader({ ...baseProps, points: null, pointsLoading: true })
    expect(screen.getByText('积分加载中')).toBeInTheDocument()

    view.rerender(
      <MantineProvider>
        <StudioHeader {...baseProps} points={null} pointsLoading={false} />
      </MantineProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '积分暂不可用 · 充值' }))
    expect(callbacks.onRecharge).toHaveBeenCalledTimes(1)

    view.rerender(
      <MantineProvider>
        <StudioHeader {...baseProps} points={0} pointsLoading={false} />
      </MantineProvider>,
    )
    expect(screen.getByRole('button', { name: '积分 0 · 充值' })).toBeInTheDocument()
  })

  it('shows the unavailable credit state inside the compact More menu', async () => {
    renderHeader({ ...baseProps, compact: true, points: null, pointsLoading: false })

    fireEvent.click(screen.getByRole('button', { name: '更多' }))

    expect(await screen.findByText('积分暂不可用 · 充值')).toBeVisible()
  })
})
