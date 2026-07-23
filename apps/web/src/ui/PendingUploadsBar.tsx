import React from 'react'
import { Loader, Paper, Text } from '@mantine/core'
import { getPendingUploads, useUploadRuntimeStore } from '../domain/upload-runtime/store/uploadRuntimeStore'

function formatPendingUploadSummary(fileNames: string[], totalCount: number): string {
  if (fileNames.length === 0) return ''
  if (totalCount === 1) return fileNames[0]
  if (totalCount === 2) return `${fileNames[0]}、${fileNames[1]}`
  return `${fileNames[0]}、${fileNames[1]} 等 ${totalCount} 个文件`
}

export default function PendingUploadsBar(): JSX.Element | null {
  useUploadRuntimeStore((state) => state.handlesById)
  const pendingUploads = getPendingUploads()

  if (pendingUploads.length === 0) return null

  const visibleNames = pendingUploads
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((item) => item.fileName)
    .slice(0, 3)

  const summary = formatPendingUploadSummary(visibleNames, pendingUploads.length)

  return (
    <div
      className="pending-uploads-bar-shell"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Paper className="pending-uploads-bar-card">
        <div className="pending-uploads-bar-content">
          <Loader className="pending-uploads-bar-spinner" aria-hidden="true" />
          <div className="pending-uploads-bar-copy">
            <Text className="pending-uploads-bar-title">
              {`正在上传 ${pendingUploads.length} 个本地文件`}
            </Text>
            <Text className="pending-uploads-bar-detail">
              {`${summary}。处理中。现在刷新、关闭页面或切换项目，图片可能暂时不会出现在当前画布里。`}
            </Text>
          </div>
        </div>
      </Paper>
    </div>
  )
}
