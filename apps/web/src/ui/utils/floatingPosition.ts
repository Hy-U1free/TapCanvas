type ViewportFloatingPositionInput = {
  anchorLeft: number
  anchorTop: number
  anchorBottom: number
  floatingWidth: number
  floatingHeight: number
  viewportWidth: number
  viewportHeight: number
  gap?: number
  margin?: number
  safeTop?: number
  preferredPlacement?: 'above' | 'below'
}

type ViewportFloatingPosition = {
  left: number
  top: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function resolveViewportFloatingPosition({
  anchorLeft,
  anchorTop,
  anchorBottom,
  floatingWidth,
  floatingHeight,
  viewportWidth,
  viewportHeight,
  gap = 6,
  margin = 8,
  safeTop,
  preferredPlacement = 'below',
}: ViewportFloatingPositionInput): ViewportFloatingPosition {
  const maxLeft = Math.max(margin, viewportWidth - floatingWidth - margin)
  const minTop = Math.max(margin, safeTop ?? margin)
  const maxTop = Math.max(minTop, viewportHeight - floatingHeight - margin)
  const preferredBelow = anchorBottom + gap
  const preferredAbove = anchorTop - floatingHeight - gap
  const belowFits = preferredBelow + floatingHeight <= viewportHeight - margin
  const aboveFits = preferredAbove >= minTop
  const preferredTop = preferredPlacement === 'above'
    ? (aboveFits ? preferredAbove : (belowFits ? preferredBelow : preferredAbove))
    : (belowFits ? preferredBelow : (aboveFits ? preferredAbove : preferredBelow))

  return {
    left: clamp(anchorLeft, margin, maxLeft),
    top: clamp(preferredTop, minTop, maxTop),
  }
}
