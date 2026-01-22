/**
 * WebSocket Client for ChatEngine
 * 
 * Manages WebSocket connection to ChatEngine for real-time updates
 */

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
  async connect(token: string, workspaceId: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected')
      return
    }

    this.token = token

    // Convert HTTP/HTTPS URL to WebSocket URL
    const wsUrl = this.baseUrl.replace(/^https?/, this.baseUrl.startsWith('https') ? 'wss' : 'ws')
    const socketPath = '/api/ws'

    console.log('[WebSocket] Connecting to:', `${wsUrl}${socketPath}`)

    this.socket = io(wsUrl, {
      path: socketPath,
      auth: {
        token,
        workspaceId,
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
      this.emit('error', error as Error)
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
   * Send message via WebSocket
   */
  sendMessage(input: {
    conversationId: string
    content: string
    messageId?: string
    replyToMessageId?: string
  }): void {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected, cannot send message')
      return
    }

    this.socket.emit('sendMessage', {
      type: 'sendMessage',
      conversationId: input.conversationId,
      content: input.content,
      messageId: input.messageId,
      replyToMessageId: input.replyToMessageId,
      timestamp: new Date().toISOString(),
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
