'use client'

import type { FC } from 'react'

import { useAckReadCount } from '~/hooks/biz/use-ack-read-count'
import { useArticlePresence } from '~/hooks/biz/use-article-presence'

export const AckRead: FC<{
  id: string
  type: 'post' | 'note' | 'page'
  preview?: boolean
}> = (props) => {
  const { id, type, preview } = props

  // 预览模式不发送 ack read 计数
  // page 类型也不发送（后端可能不支持）
  if (!preview && type !== 'page') {
    useAckReadCount(type ,id)
  }

  // 预览模式不加入 WebSocket 房间
  if (!preview) {
    useArticlePresence('article', id)
  }

  return null
}
