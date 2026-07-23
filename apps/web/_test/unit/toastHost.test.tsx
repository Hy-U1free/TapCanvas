import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastHost } from '../../src/ui/toast'

describe('ToastHost', () => {
  it('renders the fallback notification surface directly under document.body', () => {
    render(
      <div data-testid="toast-test-root">
        <ToastHost />
      </div>,
    )

    const host = document.querySelector('.tc-toast-host')
    expect(host).not.toBeNull()
    expect(host?.parentElement).toBe(document.body)
  })

  it('starts below the Studio header instead of covering the compact Chat launcher', () => {
    const header = document.createElement('div')
    header.className = 'app-header-overlay'
    header.getBoundingClientRect = () => ({
      x: 8,
      y: 8,
      left: 8,
      top: 8,
      right: 406,
      bottom: 78,
      width: 398,
      height: 70,
      toJSON: () => ({}),
    })
    document.body.append(header)

    render(<ToastHost />)

    expect(document.querySelector('.tc-toast-host')).toHaveStyle({ top: '86px', right: '16px' })
  })
})
