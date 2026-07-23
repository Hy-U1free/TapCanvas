export type TaskErrorDisplay = {
  enhancedMsg: string
  isQuotaLike429: boolean
  quotaHint?: string
}

export const API_QUOTA_HINT_TEXT = '💡 提示：API 配额已用尽，请稍后重试或升级您的服务计划'
const API_QUOTA_HINT_COMPACT_TEXT = '💡 提示：API配额已用尽，请稍后重试或升级您的服务计划'

export function isSafetyBlockedError(err: any): boolean {
  const message = String(err?.message || '').toLowerCase()
  const code = String(err?.code || '').toLowerCase()
  const upstreamCode = String(err?.details?.upstreamData?.error?.code || '').toLowerCase()
  const upstreamType = String(err?.details?.upstreamData?.error?.type || '').toLowerCase()
  const upstreamMessage = String(err?.details?.upstreamData?.error?.message || '').toLowerCase()
  const upstreamText = String(err?.details?.upstreamText || '').toLowerCase()
  const joined = [message, code, upstreamCode, upstreamType, upstreamMessage, upstreamText].join(' ')
  return (
    joined.includes('image_safety') ||
    joined.includes('safety') ||
    joined.includes('policy') ||
    joined.includes('content_filter') ||
    joined.includes('moderation') ||
    joined.includes('unsafe')
  )
}

export function resolveTaskErrorDisplay(err: any, fallbackMsg: string): TaskErrorDisplay {
  const msg = String(err?.message || fallbackMsg || '????????')
  const status = Number(err?.status ?? err?.httpStatus ?? err?.details?.status ?? err?.details?.httpStatus)
  const isQuotaLike429 = status === 429 && !isSafetyBlockedError(err)
  return {
    enhancedMsg: isQuotaLike429 ? `${msg}
${API_QUOTA_HINT_COMPACT_TEXT}` : msg,
    isQuotaLike429,
    ...(isQuotaLike429 ? { quotaHint: API_QUOTA_HINT_TEXT } : null),
  }
}
