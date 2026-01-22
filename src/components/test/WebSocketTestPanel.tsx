/**
 * WebSocket Test Panel
 * 
 * Componente para testar e debugar a conexão WebSocket com ChatEngine
 * Use este componente durante o desenvolvimento para verificar o status da conexão
 */

import { useState, useEffect } from 'react'
import { useWebSocketContext } from '@/modules/conversation/infrastructure/websocket/WebSocketContext'
import { useWebSocket } from '@/modules/conversation/presentation/hooks/useWebSocket'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WebSocketTestPanel() {
  const { client, isConnected, isEnabled } = useWebSocketContext()
  const [conversationId, setConversationId] = useState('')
  const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'warning'; message: string }>>([])
  const [testConversationId, setTestConversationId] = useState('')

  // Subscribe to test conversation
  useWebSocket(testConversationId || null)

  useEffect(() => {
    if (!client) return

    const addLog = (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
      setLogs((prev) => [
        ...prev.slice(-49), // Keep last 50 logs
        {
          time: new Date().toLocaleTimeString(),
          type,
          message,
        },
      ])
    }

    const handleConnect = () => {
      addLog('success', '✅ WebSocket conectado')
    }

    const handleDisconnect = () => {
      addLog('warning', '⚠️ WebSocket desconectado')
    }

    const handleError = (error: Error) => {
      addLog('error', `❌ Erro: ${error.message}`)
    }

    const handleMessage = (message: any) => {
      addLog('info', `📨 Mensagem recebida: ${message.id} - ${message.content?.substring(0, 30)}...`)
    }

    const handleConversation = (conversation: any) => {
      addLog('info', `💬 Conversa atualizada: ${conversation.id}`)
    }

    const handleStatus = (status: any) => {
      addLog('info', `📊 Status: ${status.messageId} → ${status.status}`)
    }

    client.on('connect', handleConnect)
    client.on('disconnect', handleDisconnect)
    client.on('error', handleError)
    client.on('message', handleMessage)
    client.on('conversation', handleConversation)
    client.on('messageStatus', handleStatus)

    return () => {
      client.off('connect', handleConnect)
      client.off('disconnect', handleDisconnect)
      client.off('error', handleError)
      client.off('message', handleMessage)
      client.off('conversation', handleConversation)
      client.off('messageStatus', handleStatus)
    }
  }, [client])

  const handleSubscribe = () => {
    if (!client || !conversationId) return
    client.subscribe(conversationId)
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        type: 'info',
        message: `🔔 Subscribed to conversation: ${conversationId}`,
      },
    ])
  }

  const handleUnsubscribe = () => {
    if (!client || !conversationId) return
    client.unsubscribe(conversationId)
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        type: 'info',
        message: `🔕 Unsubscribed from conversation: ${conversationId}`,
      },
    ])
  }

  const handleEmitTyping = () => {
    if (!client || !conversationId) return
    client.emitTyping(conversationId, true)
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        type: 'info',
        message: `⌨️ Typing indicator sent for: ${conversationId}`,
      },
    ])
    setTimeout(() => {
      if (client) {
        client.emitTyping(conversationId, false)
      }
    }, 3000)
  }

  const getStatusColor = () => {
    if (!isEnabled) return 'secondary'
    if (isConnected) return 'default'
    return 'destructive'
  }

  const getStatusText = () => {
    if (!isEnabled) return 'Desabilitado'
    if (isConnected) return 'Conectado'
    return 'Desconectado'
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>WebSocket Test Panel</CardTitle>
        <CardDescription>
          Painel de testes e debug para conexão WebSocket com ChatEngine
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-4">
          <div>
            <Label>Status da Conexão</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
              {client && (
                <span className="text-sm text-muted-foreground">
                  Estado: {client.getState()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Controls */}
        <div className="space-y-2">
          <Label>Testar Subscription</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Conversation ID"
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
            />
            <Button onClick={handleSubscribe} disabled={!isConnected || !conversationId}>
              Subscribe
            </Button>
            <Button onClick={handleUnsubscribe} disabled={!isConnected || !conversationId} variant="outline">
              Unsubscribe
            </Button>
            <Button onClick={handleEmitTyping} disabled={!isConnected || !conversationId} variant="outline">
              Emit Typing
            </Button>
          </div>
        </div>

        {/* Auto-subscribe Test */}
        <div className="space-y-2">
          <Label>Auto-subscribe (via useWebSocket hook)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Conversation ID para auto-subscribe"
              value={testConversationId}
              onChange={(e) => setTestConversationId(e.target.value)}
            />
          </div>
          {testConversationId && (
            <p className="text-sm text-muted-foreground">
              Hook useWebSocket está ativo para: {testConversationId}
            </p>
          )}
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Logs de Eventos</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLogs([])}
            >
              Limpar
            </Button>
          </div>
          <div className="border rounded-md p-4 h-64 overflow-y-auto bg-muted/50">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Nenhum evento ainda. Aguardando conexão...
              </p>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${
                      log.type === 'error'
                        ? 'text-destructive'
                        : log.type === 'success'
                        ? 'text-green-600'
                        : log.type === 'warning'
                        ? 'text-yellow-600'
                        : ''
                    }`}
                  >
                    <span className="text-muted-foreground">{log.time}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Como usar:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Verifique se o status está "Conectado"</li>
            <li>Insira um Conversation ID e clique em "Subscribe"</li>
            <li>Envie uma mensagem do WhatsApp para ver eventos em tempo real</li>
            <li>Use "Emit Typing" para testar indicadores de digitação</li>
            <li>Monitore os logs para ver todos os eventos WebSocket</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
