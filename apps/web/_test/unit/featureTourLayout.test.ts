import { describe, expect, it } from 'vitest'
import { resolveFeatureTourTooltipLayout } from '../../src/ui/tour/FeatureTour'

describe('FeatureTour tooltip layout', () => {
  it('shrinks the tour card to stay inside a 360px mobile viewport', () => {
    expect(resolveFeatureTourTooltipLayout({
      highlight: { left: 20, top: 80, width: 90, height: 48 },
      tooltip: { width: 360, height: 160 },
      viewport: { width: 360, height: 640 },
      gap: 14,
      margin: 12,
    })).toMatchObject({
      width: 336,
      left: 12,
    })
  })

  it('caps tooltip height on short screens and keeps it scrollable inside the viewport', () => {
    expect(resolveFeatureTourTooltipLayout({
      highlight: { left: 90, top: 48, width: 120, height: 56 },
      tooltip: { width: 360, height: 320 },
      viewport: { width: 390, height: 220 },
      gap: 14,
      margin: 12,
    })).toEqual({
      placement: 'right',
      left: 18,
      top: 12,
      width: 360,
      maxHeight: 196,
    })
  })
})
