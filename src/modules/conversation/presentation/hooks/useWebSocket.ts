/**
 * Hook for WebSocket functionality
 * 
 * Provides WebSocket connection and typing indicators
 */

import { useEffect, useCallback } from 'react'
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext'

export function useWebSocket(conversationId?: string | null) {
  const { client, isConnected, isEnabled } = useWebSocketContext()

  // Auto-subscribe to conversation
  useEffect(() => {
    if (!isEnabled || !isConnected || !client || !conversationId) {
      return
    }

    client.subscribe(conversationId)

    return () => {
      if (client) {
        client.unsubscribe(conversationId)
      }
    }
  }, [client, isConnected, isEnabled, conversationId])

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!client || !isConnected || !conversationId) {
        return
      }
      client.emitTyping(conversationId, isTyping)
    },
    [client, isConnected, conversationId]
  )

  return {
    isConnected,
    isEnabled,
    emitTyping,
  }
}
