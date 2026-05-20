import { useEffect, useRef } from 'react'

import { useSocketIsConnect } from '~/atoms/hooks/socket'
import { SocketEmitEnum } from '~/types/events'

import { socketWorker } from '../../socket/worker-client'

const LEAVE_DELAY = 1000
const pendingLeaves = new Map<string, ReturnType<typeof setTimeout>>()

export const useArticlePresence = (type: "page" | "post" | "note" | "article", id: string) => {
  const socketIsConnected = useSocketIsConnect()
  const roomNameRef = useRef(`${type}-${id}`)
  const hasJoinedRef = useRef(false)

  useEffect(() => {
    roomNameRef.current = `${type}-${id}`
  }, [type, id])

  useEffect(() => {
    if (!socketIsConnected || !id) return

    const roomName = roomNameRef.current

    const pendingLeave = pendingLeaves.get(roomName)
    if (pendingLeave) {
      clearTimeout(pendingLeave)
      pendingLeaves.delete(roomName)
      hasJoinedRef.current = true
    }

    if (!hasJoinedRef.current) {
      socketWorker.emit(SocketEmitEnum.Join, {
        roomName,
      })
      hasJoinedRef.current = true
    }

    return () => {
      const timeout = setTimeout(() => {
        socketWorker.emit(SocketEmitEnum.Leave, {
          roomName,
        })
        pendingLeaves.delete(roomName)
        hasJoinedRef.current = false
      }, LEAVE_DELAY)
      pendingLeaves.set(roomName, timeout)
    }
  }, [socketIsConnected, type, id])
}
