import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PendingUploadsBar from '../../src/ui/PendingUploadsBar'

const mocks = vi.hoisted(() => ({
  getPendingUploads: vi.fn(),
}))

vi.mock('../../src/domain/upload-runtime/store/uploadRuntimeStore', () => ({
  getPendingUploads: () => mocks.getPendingUploads(),
  useUploadRuntimeStore: (
    selector: (state: { handlesById: Record<string, unknown> }) => unknown,
  ) => selector({ handlesById: {} }),
}))

function renderBar() {
  return render(
    <MantineProvider>
      <div className="tc-studio">
        <PendingUploadsBar />
      </div>
    </MantineProvider>,
  )
}

describe('PendingUploadsBar', () => {
  beforeEach(() => {
    mocks.getPendingUploads.mockReset()
  })

  it('renders nothing when no upload is pending', () => {
    mocks.getPendingUploads.mockReturnValue([])

    const { container } = renderBar()

    expect(container.querySelector('.pending-uploads-bar-shell')).toBeNull()
  })

  it('announces the real count and filenames without inventing byte progress', () => {
    mocks.getPendingUploads.mockReturnValue([
      { fileName: '开场.png', startedAt: 20 },
      { fileName: '结尾.mp4', startedAt: 10 },
    ])

    renderBar()

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-atomic', 'true')
    expect(screen.getByText('正在上传 2 个本地文件')).toBeVisible()
    expect(screen.getByText(/开场\.png/)).toBeVisible()
    expect(screen.getByText(/结尾\.mp4/)).toBeVisible()
  })

  it('uses the real total in the summary when more than three files are pending', () => {
    mocks.getPendingUploads.mockReturnValue([
      { fileName: '01.png', startedAt: 1 },
      { fileName: '02.png', startedAt: 2 },
      { fileName: '03.png', startedAt: 3 },
      { fileName: '04.png', startedAt: 4 },
    ])

    renderBar()

    expect(screen.getByText('正在上传 4 个本地文件')).toBeVisible()
    expect(screen.getByText(/等 4 个文件/)).toBeVisible()
    expect(screen.queryByText(/等 3 个文件/)).not.toBeInTheDocument()
  })
})
