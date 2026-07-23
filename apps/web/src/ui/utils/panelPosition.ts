const PANEL_EDGE_GAP = 8
const PANEL_PREFERRED_MIN_HEIGHT = 180
const PANEL_ABSOLUTE_MIN_HEIGHT = 48

export function calculateHeaderSafeTop(fallbackTop = PANEL_EDGE_GAP, gap = PANEL_EDGE_GAP): number {
  if (typeof document === 'undefined') return fallbackTop
  const header = document.querySelector('.app-header-overlay') as HTMLElement | null
  const headerRect = header?.getBoundingClientRect()
  if (!headerRect || headerRect.height <= 0) return fallbackTop
  return Math.max(fallbackTop, headerRect.bottom + gap)
}

export function calculateSafePanelTop(
  anchorY?: number | null,
  offsetTop = 150,
  fallbackTop = 140,
  padding = 40,
): number {
  const viewportHeight = window.innerHeight
  const desiredTop = typeof anchorY === 'number' ? anchorY - offsetTop : fallbackTop
  const reservedBottomInset = getBottomDialogInset(viewportHeight)
  const minimumTop = calculateHeaderSafeTop()
  const maximumTop = Math.max(
    minimumTop,
    viewportHeight - reservedBottomInset - padding - PANEL_PREFERRED_MIN_HEIGHT,
  )

  return Math.min(Math.max(desiredTop, minimumTop), maximumTop)
}

/**
 * 计算安全的面板最大高度，确保不会超出视窗或覆盖右下角 AI 对话入口。
 */
export function calculateSafeMaxHeight(
  anchorY?: number | null,
  offsetTop = 150,
  padding = 40,
  fallbackTop = 140,
): number {
  const viewportHeight = window.innerHeight
  const topPosition = calculateSafePanelTop(anchorY, offsetTop, fallbackTop, padding)
  const reservedBottomInset = getBottomDialogInset(viewportHeight)

  const availableHeight = viewportHeight - topPosition - padding - reservedBottomInset
  const maxHeight = Math.min(availableHeight, 800)

  return Math.max(maxHeight, PANEL_ABSOLUTE_MIN_HEIGHT)
}

function getBottomDialogInset(viewportHeight: number): number {
  if (typeof document === 'undefined') return 0
  const chat = document.querySelector('.tc-ai-chat') as HTMLElement | null
  if (
    !chat
    || chat.classList.contains('tc-ai-chat--expanded')
    || chat.classList.contains('tc-ai-chat--maximized')
  ) return 0

  const style = window.getComputedStyle(chat)
  if (style.display === 'none' || style.visibility === 'hidden') return 0

  const rect = chat.getBoundingClientRect()
  if (!Number.isFinite(rect.top) || rect.height <= 0) return 0

  const leftPanelLeft = 82
  const leftPanelMaxWidth = 720
  const leftPanelRight = leftPanelLeft + leftPanelMaxWidth
  const overlapsLeftPanelHorizontally = rect.left < leftPanelRight && rect.right > leftPanelLeft
  if (!overlapsLeftPanelHorizontally) return 0

  // 预留底部对话框顶部以上空间，避免面板滚动内容被遮住
  const inset = viewportHeight - rect.top + 12
  return Math.max(0, inset)
}
