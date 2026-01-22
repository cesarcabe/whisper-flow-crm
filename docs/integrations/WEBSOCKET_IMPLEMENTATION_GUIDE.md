# Guia de Implementação WebSocket - ChatEngine → CRM

## 📋 Visão Geral

Este documento fornece exemplos de código e estrutura detalhada para implementar a conexão WebSocket entre o CRM e o ChatEngine.

---

## 📁 **1. Estrutura de Arquivos**

```
src/
├── modules/
│   └── conversation/
│       ├── infrastructure/
│       │   ├── chatengine/
│       │   │   ├── config.ts                    # ✅ Já existe
│       │   │   └── ...
│       │   └── websocket/                       # 🆕 Criar
│       │       ├── WebSocketClient.ts
│       │       ├── WebSocketContext.tsx
│       │       └── types.ts
│       └── presentation/
│           ├── hooks/
│           │   ├── useWebSocket.ts             # 🆕 Criar
│           │   ├── useMessages.ts              # ✏️ Modificar
│           │   └── useConversations.ts         # ✏️ Modificar
│           └── contexts/
│               └── ConversationContext.tsx     # ✏️ Modificar
```

---

## 🔧 **2. Implementação Detalhada**

### 2.1 Tipos TypeScript

**Arquivo:** `src/modules/conversation/infrastructure/websocket/types.ts`

```typescript
import { Message } from '../../domain/entities/Message'
import { Conversation } from '../../domain/entities/Conversation'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WebSocketMessage {
  id: string
  workspaceId: string
  conversationId: string
  senderId: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  content: string
  replyToMessageId?: string
  attachments?: any[]
  status: MessageStatus
  metadata?: {
    providerMessageId?: string
  }
  createdAt: string
  updatedAt?: string
}

export interface WebSocketConversation {
  id: string
  workspaceId: string
  contactId?: string
  whatsappNumberId?: string
  channel: 'whatsapp'
  participants: Array<{
    id: string
    name: string
    avatar?: string
  }>
  lastMessage?: {
    id: string
    content: string
    senderId: string
    createdAt: string
  }
  updatedAt: string
}

export interface WebSocketMessageStatus {
  messageId: string
  status: MessageStatus
}

export interface WebSocketTyping {
  conversationId: string
  userId: string
  isTyping: boolean
}

export type WebSocketEventMap = {
  message: (message: WebSocketMessage) => void
  conversation: (conversation: WebSocketConversation) => void
  messageStatus: (data: WebSocketMessageStatus) => void
  typing: (data: WebSocketTyping) => void
  connect: () => void
  disconnect: () => void
  error: (error: Error) => void
}
```

### 2.2 Cliente WebSocket

**Arquivo:** `src/modules/conversation/infrastructure/websocket/WebSocketClient.ts`

```typescript
import { io, Socket } from 'socket.io-client'
import {
  WebSocketMessage,
  WebSocketConversation,
  WebSocketMessageStatus,
  WebSocketTyping,
  WebSocketEventMap,
} from './types'

export class WebSocketClient {
  private socket: Socket | null = null
  private baseUrl: string
  private token: string | null = null
  private subscriptions = new Set<string>()
  private listeners = new Map<keyof WebSocketEventMap, Set<Function>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected')
      return
    }

    this.token = token

    const wsUrl = this.baseUrl.replace(/^https?/, 'ws')
    const socketPath = '/api/ws'

    console.log('[WebSocket] Connecting to:', `${wsUrl}${socketPath}`)

    this.socket = io(wsUrl, {
      path: socketPath,
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.setupEventListeners()
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected')
      this.reconnectAttempts = 0
      this.emit('connect')

      // Re-subscribe to all previous subscriptions
      this.subscriptions.forEach((conversationId) => {
        this.socket?.emit('subscribe:conversation', conversationId)
      })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
      this.emit('disconnect')
    })

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error)
      this.reconnectAttempts++
      this.emit('error', error)
    })

    // Message events
    this.socket.on('message', (message: WebSocketMessage) => {
      console.log('[WebSocket] Received message:', message.id)
      this.emit('message', message)
    })

    this.socket.on('conversation', (conversation: WebSocketConversation) => {
      console.log('[WebSocket] Received conversation update:', conversation.id)
      this.emit('conversation', conversation)
    })

    this.socket.on('messageStatus', (data: WebSocketMessageStatus) => {
      console.log('[WebSocket] Received status update:', data.messageId, data.status)
      this.emit('messageStatus', data)
    })

    this.socket.on('typing', (data: WebSocketTyping) => {
      this.emit('typing', data)
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.subscriptions.clear()
    this.listeners.clear()
  }

  /**
   * Subscribe to a conversation
   */
  subscribe(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot subscribe')
      return
    }

    if (this.subscriptions.has(conversationId)) {
      console.log('[WebSocket] Already subscribed to:', conversationId)
      return
    }

    this.socket.emit('subscribe:conversation', conversationId)
    this.subscriptions.add(conversationId)
    console.log('[WebSocket] Subscribed to conversation:', conversationId)
  }

  /**
   * Unsubscribe from a conversation
   */
  unsubscribe(conversationId: string): void {
    if (!this.socket?.connected) {
      return
    }

    if (!this.subscriptions.has(conversationId)) {
      return
    }

    this.socket.emit('unsubscribe:conversation', conversationId)
    this.subscriptions.delete(conversationId)
    console.log('[WebSocket] Unsubscribed from conversation:', conversationId)
  }

  /**
   * Emit typing indicator
   */
  emitTyping(conversationId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing', {
      conversationId,
      isTyping,
    })
  }

  /**
   * Add event listener
   */
  on<K extends keyof WebSocketEventMap>(event: K, callback: WebSocketEventMap[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WebSocketEventMap>(event: K, callback: WebSocketEventMap[K]): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof WebSocketEventMap>(event: K, ...args: Parameters<WebSocketEventMap[K]>): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          ;(callback as any)(...args)
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} listener:`, error)
        }
      })
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Get connection state
   */
  getState(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    return 'connecting'
  }
}
```

### 2.3 Context WebSocket

**Arquivo:** `src/modules/conversation/infrastructure/websocket/WebSocketContext.tsx`

```typescript
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
      clientRef.current.connect(token).catch((error) => {
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
```

### 2.4 Hook useWebSocket

**Arquivo:** `src/modules/conversation/presentation/hooks/useWebSocket.ts`

```typescript
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
```

### 2.5 Modificação em useMessages

**Arquivo:** `src/modules/conversation/presentation/hooks/useMessages.ts`

**Adicionar no início do hook:**

```typescript
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext'
import { WebSocketMessage, WebSocketMessageStatus } from '../../infrastructure/websocket/types'

export function useMessages(conversationId: string | null) {
  const { workspaceId } = useWorkspace()
  const { service: conversationService } = useConversation()
  const { client: wsClient, isEnabled: isWebSocketEnabled } = useWebSocketContext()
  
  // ... código existente ...

  // WebSocket listeners
  useEffect(() => {
    if (!isWebSocketEnabled || !wsClient || !conversationId) {
      return
    }

    const handleMessage = (message: WebSocketMessage) => {
      // Only process messages for current conversation
      if (message.conversationId !== conversationId) {
        return
      }

      // Map WebSocket message to domain message
      const domainMessage = mapWebSocketToCoreMessage(message)
      
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === domainMessage.id)) return prev
        // Prepend new message
        return [domainMessage, ...prev]
      })
    }

    const handleStatus = (data: WebSocketMessageStatus) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === data.messageId ? { ...msg, status: data.status } : msg))
      )
    }

    wsClient.on('message', handleMessage)
    wsClient.on('messageStatus', handleStatus)

    return () => {
      wsClient.off('message', handleMessage)
      wsClient.off('messageStatus', handleStatus)
    }
  }, [wsClient, isWebSocketEnabled, conversationId])

  // ... resto do código existente ...
}

function mapWebSocketToCoreMessage(wsMessage: WebSocketMessage): CoreMessage {
  // Mapear WebSocketMessage para CoreMessage
  // Implementar conforme estrutura do CoreMessage
}
```

### 2.6 Modificação em useConversations

**Arquivo:** `src/modules/conversation/presentation/hooks/useConversations.ts`

**Adicionar:**

```typescript
import { useWebSocketContext } from '../../infrastructure/websocket/WebSocketContext'
import { WebSocketConversation } from '../../infrastructure/websocket/types'

export function useConversations(whatsappNumberId: string | null) {
  // ... código existente ...
  const { client: wsClient, isEnabled: isWebSocketEnabled } = useWebSocketContext()

  // WebSocket listener for conversation updates
  useEffect(() => {
    if (!isWebSocketEnabled || !wsClient || !workspaceId) {
      return
    }

    const handleConversation = (conversation: WebSocketConversation) => {
      // Only process conversations for current workspace
      if (conversation.workspaceId !== workspaceId) {
        return
      }

      // Filter by whatsappNumberId if provided
      if (whatsappNumberId && conversation.whatsappNumberId !== whatsappNumberId) {
        return
      }

      // Map and update conversations
      const legacyConversation = mapWebSocketToLegacy(conversation)
      
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === legacyConversation.id)
        if (index >= 0) {
          // Update existing
          const updated = [...prev]
          updated[index] = legacyConversation
          // Sort by updatedAt
          return updated.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        } else {
          // Add new
          return [legacyConversation, ...prev].sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        }
      })
    }

    wsClient.on('conversation', handleConversation)

    return () => {
      wsClient.off('conversation', handleConversation)
    }
  }, [wsClient, isWebSocketEnabled, workspaceId, whatsappNumberId])

  // ... resto do código existente ...
}
```

### 2.7 Integração no ConversationContext

**Arquivo:** `src/modules/conversation/presentation/contexts/ConversationContext.tsx`

**Modificar o provider:**

```typescript
import { WebSocketProvider } from '../../infrastructure/websocket/WebSocketContext'

export function ConversationProvider({ 
  children, 
  chatEngineBaseUrl = CHATENGINE_BASE_URL 
}: ConversationProviderProps) {
  return (
    <WebSocketProvider baseUrl={chatEngineBaseUrl}>
      <ConversationProviderInner chatEngineBaseUrl={chatEngineBaseUrl}>
        {children}
      </ConversationProviderInner>
    </WebSocketProvider>
  )
}

function ConversationProviderInner({ 
  children, 
  chatEngineBaseUrl 
}: ConversationProviderProps) {
  // ... código existente do ConversationProvider ...
}
```

---

## 🧪 **3. Exemplo de Uso**

### 3.1 Em um Componente

```typescript
import { useMessages } from '@/modules/conversation/presentation/hooks/useMessages'
import { useWebSocket } from '@/modules/conversation/presentation/hooks/useWebSocket'

function MessageList({ conversationId }: { conversationId: string }) {
  const { messages, loading } = useMessages(conversationId)
  const { isConnected, emitTyping } = useWebSocket(conversationId)

  const handleTyping = () => {
    emitTyping(true)
    // Auto-stop after 3 seconds
    setTimeout(() => emitTyping(false), 3000)
  }

  return (
    <div>
      {!isConnected && (
        <div className="text-yellow-500">Reconectando...</div>
      )}
      {/* Render messages */}
    </div>
  )
}
```

---

## 📝 **4. Checklist de Implementação**

### Instalação
- [ ] `npm install socket.io-client`
- [ ] Adicionar variáveis de ambiente

### Criação de Arquivos
- [ ] `types.ts`
- [ ] `WebSocketClient.ts`
- [ ] `WebSocketContext.tsx`
- [ ] `useWebSocket.ts`

### Modificações
- [ ] `useMessages.ts` - Adicionar listeners WebSocket
- [ ] `useConversations.ts` - Adicionar listeners WebSocket
- [ ] `ConversationContext.tsx` - Integrar WebSocketProvider

### Testes
- [ ] Conexão WebSocket
- [ ] Recebimento de mensagens
- [ ] Atualização de status
- [ ] Atualização de conversas
- [ ] Indicadores de digitação
- [ ] Reconexão automática
- [ ] Fallback para Supabase

---

**Última atualização:** Janeiro 2025
