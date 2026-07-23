import React from 'react'
import { Portal, Title, Text, Group, Button } from '@mantine/core'
import { $ } from '../../canvas/i18n'
import { PanelCard } from '../PanelCard'
import { UI_LAYERS } from '../../theme/uiLayers'

export type FeatureTourStep = {
  id: string
  target: string // data-tour key
  title: string
  description: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

type TourPlacement = 'right' | 'left' | 'bottom' | 'top' | 'center'

type TourRect = { left: number; top: number; width: number; height: number }

type TourSize = { width: number; height: number }

type TourViewport = { width: number; height: number }

function getTargetElement(targetKey: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`[data-tour="${CSS.escape(targetKey)}"]`)
}

function getTargetRect(el: HTMLElement | null): DOMRect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!Number.isFinite(r.left) || !Number.isFinite(r.top) || r.width <= 0 || r.height <= 0) return null
  return r
}

function computeTooltipPosition(opts: {
  highlight: TourRect
  tooltip: TourSize
  viewport: TourViewport
  gap: number
  margin: number
}) {
  const { highlight, tooltip, viewport, gap, margin } = opts

  const rightSpace = viewport.width - (highlight.left + highlight.width) - gap - margin
  const leftSpace = highlight.left - gap - margin
  const bottomSpace = viewport.height - (highlight.top + highlight.height) - gap - margin
  const topSpace = highlight.top - gap - margin

  const candidates: Array<{ placement: Exclude<TourPlacement, 'center'>; left: number; top: number; score: number }> = [
    {
      placement: 'right',
      left: highlight.left + highlight.width + gap,
      top: highlight.top + highlight.height / 2 - tooltip.height / 2,
      score: rightSpace,
    },
    {
      placement: 'left',
      left: highlight.left - tooltip.width - gap,
      top: highlight.top + highlight.height / 2 - tooltip.height / 2,
      score: leftSpace,
    },
    {
      placement: 'bottom',
      left: highlight.left + highlight.width / 2 - tooltip.width / 2,
      top: highlight.top + highlight.height + gap,
      score: bottomSpace,
    },
    {
      placement: 'top',
      left: highlight.left + highlight.width / 2 - tooltip.width / 2,
      top: highlight.top - tooltip.height - gap,
      score: topSpace,
    },
  ]

  const sorted = candidates.sort((a, b) => b.score - a.score)
  const best = sorted[0]

  return {
    placement: best.placement,
    left: clamp(best.left, margin, viewport.width - tooltip.width - margin),
    top: clamp(best.top, margin, viewport.height - tooltip.height - margin),
  }
}

export function resolveFeatureTourTooltipLayout(opts: {
  highlight: TourRect | null
  tooltip: TourSize
  viewport: TourViewport
  gap?: number
  margin?: number
}): {
  placement: TourPlacement
  left: number
  top: number
  width: number
  maxHeight: number
} {
  const {
    highlight,
    tooltip,
    viewport,
    gap = 14,
    margin = 12,
  } = opts
  const availableWidth = Math.max(1, viewport.width - margin * 2)
  const availableHeight = Math.max(1, viewport.height - margin * 2)
  const width = Math.min(Math.max(1, tooltip.width || 360), availableWidth)
  const maxHeight = Math.min(Math.max(1, tooltip.height || 160), availableHeight)

  if (!highlight) {
    return {
      placement: 'center',
      left: Math.round(clamp((viewport.width - width) / 2, margin, viewport.width - width - margin)),
      top: Math.round(clamp((viewport.height - maxHeight) / 2, margin, viewport.height - maxHeight - margin)),
      width,
      maxHeight,
    }
  }

  const position = computeTooltipPosition({
    highlight,
    tooltip: { width, height: maxHeight },
    viewport,
    gap,
    margin,
  })
  return {
    placement: position.placement,
    left: Math.round(position.left),
    top: Math.round(position.top),
    width,
    maxHeight,
  }
}

export function FeatureTour(props: {
  opened: boolean
  steps: FeatureTourStep[]
  onClose: () => void
  className?: string
}) {
  const { opened, steps, onClose, className } = props
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [highlight, setHighlight] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement | null>(null)
  const [tooltipLayout, setTooltipLayout] = React.useState<ReturnType<typeof resolveFeatureTourTooltipLayout> | null>(null)

  React.useEffect(() => {
    if (!opened) return
    setActiveIndex(0)
  }, [opened])

  const step = steps[activeIndex]

  const recompute = React.useCallback(() => {
    if (!opened || !step) return
    const el = getTargetElement(step.target)
    const rect = getTargetRect(el)

    if (!rect) {
      setHighlight(null)
      setTooltipLayout(null)
      return
    }

    const padding = 10
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    const left = clamp(rect.left - padding, 8, viewportW - 16)
    const top = clamp(rect.top - padding, 8, viewportH - 16)
    const width = clamp(rect.width + padding * 2, 24, viewportW - left - 8)
    const height = clamp(rect.height + padding * 2, 24, viewportH - top - 8)

    setHighlight({ left, top, width, height })
  }, [opened, step])

  React.useLayoutEffect(() => {
    if (!opened || !step) return
    try {
      const el = getTargetElement(step.target)
      el?.scrollIntoView?.({ block: 'center', inline: 'center' })
    } catch {
      // ignore
    }
    recompute()
  }, [opened, step, recompute])

  React.useEffect(() => {
    if (!opened) return
    const onWin = () => recompute()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [opened, recompute])

  React.useLayoutEffect(() => {
    if (!opened) return
    const el = tooltipRef.current
    if (!el) return

    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const tooltip = {
      width: el.offsetWidth || 360,
      height: Math.max(el.scrollHeight || 0, el.offsetHeight || 0, 160),
    }

    const layout = resolveFeatureTourTooltipLayout({
      highlight,
      tooltip,
      viewport,
      gap: 14,
      margin: 12,
    })
    setTooltipLayout(layout)
  }, [opened, highlight, activeIndex])

  if (!opened || steps.length === 0 || !step) return null

  const isFirst = activeIndex === 0
  const isLast = activeIndex === steps.length - 1

  const tourClassName = ['feature-tour', className].filter(Boolean).join(' ')

  return (
    <Portal className="feature-tour-portal">
      <div className={tourClassName} style={{ position: 'fixed', inset: 0, zIndex: UI_LAYERS.tour }}>
        {/* Block interactions */}
        <div
          className="feature-tour-backdrop"
          style={{ position: 'absolute', inset: 0, background: highlight ? 'transparent' : 'rgba(0,0,0,0.55)' }}
          onClick={onClose}
        />

        {/* Highlight with "hole" via huge shadow */}
        {highlight && (
          <div
            className="feature-tour-highlight"
            style={{
              position: 'absolute',
              left: highlight.left,
              top: highlight.top,
              width: highlight.width,
              height: highlight.height,
              borderRadius: 14,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              outline: '1px solid rgba(255,255,255,0.22)',
              background: 'transparent',
              pointerEvents: 'none',
            }}
          />
        )}

        <div
          className="feature-tour-tooltip-wrap"
          ref={tooltipRef}
          style={{
            position: 'absolute',
            left: tooltipLayout?.left ?? 0,
            top: tooltipLayout?.top ?? 0,
            maxWidth: 'calc(100vw - 24px)',
            width: tooltipLayout?.width ?? 'min(360px, calc(100vw - 24px))',
            maxHeight: tooltipLayout?.maxHeight,
            overflowY: 'auto',
          }}
        >
          <PanelCard className="feature-tour-card glass" style={{ pointerEvents: 'auto' }}>
            <Group className="feature-tour-card-header" justify="space-between" align="flex-start" gap="sm" mb={6}>
              <div className="feature-tour-card-title" style={{ minWidth: 0 }}>
                <Title className="feature-tour-title" order={6} style={{ lineHeight: 1.2 }}>
                  {step.title}
                </Title>
                <Text className="feature-tour-step" size="xs" c="dimmed">
                  {activeIndex + 1} / {steps.length}
                </Text>
              </div>
              <Button className="feature-tour-skip" size="xs" variant="subtle" onClick={onClose}>
                {$('跳过')}
              </Button>
            </Group>

            <Text className="feature-tour-description" size="sm" style={{ lineHeight: 1.55 }}>
              {step.description}
            </Text>

            <Group className="feature-tour-footer" justify="space-between" mt="md">
              <Button className="feature-tour-prev" size="xs" variant="default" disabled={isFirst} onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>
                {$('上一个')}
              </Button>
              <Button
                className="feature-tour-next"
                size="xs"
                onClick={() => {
                  if (isLast) onClose()
                  else setActiveIndex((i) => Math.min(steps.length - 1, i + 1))
                }}
              >
                {isLast ? $('完成') : $('下一个')}
              </Button>
            </Group>
          </PanelCard>
        </div>
      </div>
    </Portal>
  )
}
