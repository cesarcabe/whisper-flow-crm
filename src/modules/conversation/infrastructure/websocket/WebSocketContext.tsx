/**
 * WebSocket Context
 * 
 * Provides WebSocket client instance to React components
 */

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { WebSocketClient } from './WebSocketClient'
import { CHATENGINE_BASE_URL } from '../chatengine/config'
import { useChatEngineJwt } from '../../presentation/hooks/useChatEngineJwt'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface WebSocketContextType {
  client: WebSocketClient | null
  isConnected: boolean
  isEnabled: boolean
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
  baseUrl?: string
}

export function WebSocketProvider({ children, baseUrl = CHATENGINE_BASE_URL }: WebSocketProviderProps) {
  const { workspaceId } = useWorkspace()
  const { token, isConfigured } = useChatEngineJwt(workspaceId)
  const clientRef = useRef<WebSocketClient | null>(null)

  const isEnabled = Boolean(baseUrl && isConfigured && token && workspaceId)

  // Create client instance
  useEffect(() => {
    if (!isEnabled) {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
      return
    }

    if (!clientRef.current) {
      clientRef.current = new WebSocketClient(baseUrl)
    }

    // Connect when token is available
    if (token && workspaceId) {
      clientRef.current.connect(token, workspaceId).catch((error) => {
        console.error('[WebSocketProvider] Connection failed:', error)
      })
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
    }
  }, [baseUrl, token, workspaceId, isEnabled])

  const contextValue = useMemo(
    () => ({
      client: clientRef.current,
      isConnected: clientRef.current?.isConnected() ?? false,
      isEnabled,
    }),
    [isEnabled, clientRef.current?.isConnected()]
  )

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}
