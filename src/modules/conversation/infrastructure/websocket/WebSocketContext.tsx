/**
 * WebSocket Context
 * 
 * Provides WebSocket client instance to React components
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  const [isConnected, setIsConnected] = useState(false)

  const isEnabled = Boolean(baseUrl && isConfigured && token && workspaceId)

  // Create client instance
  useEffect(() => {
    if (!isEnabled) {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
      setIsConnected(false)
      return
    }

    if (!clientRef.current) {
      clientRef.current = new WebSocketClient(baseUrl)
    }

    const handleConnect = () => setIsConnected(true)
    const handleDisconnect = () => setIsConnected(false)

    clientRef.current.on('connect', handleConnect)
    clientRef.current.on('disconnect', handleDisconnect)
    setIsConnected(clientRef.current.isConnected())

    // Connect when token is available
    if (token && workspaceId) {
      clientRef.current.connect(token, workspaceId).catch((error) => {
        console.error('[WebSocketProvider] Connection failed:', error)
      })
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.off('connect', handleConnect)
        clientRef.current.off('disconnect', handleDisconnect)
      }
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
      setIsConnected(false)
    }
  }, [baseUrl, token, workspaceId, isEnabled])

  const contextValue = useMemo(
    () => ({
      client: clientRef.current,
      isConnected,
      isEnabled,
    }),
    [isEnabled, isConnected]
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

export function useOptionalWebSocketContext(): WebSocketContextType | null {
  return useContext(WebSocketContext)
}
