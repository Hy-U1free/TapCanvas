import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { IconActionButton } from '../../src/ui/IconActionButton'

describe('IconActionButton', () => {
  it('forwards its ref to the native button for Tooltip positioning', () => {
    const ref = createRef<HTMLButtonElement>()

    render(
      <MantineProvider>
        <IconActionButton ref={ref} aria-label="Refresh" icon={<span>R</span>} />
      </MantineProvider>,
    )

    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
