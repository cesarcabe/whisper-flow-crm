# Plano de Conexão ChatEngine → CRM

## 📋 Visão Geral

Este documento detalha a análise e estruturação completa para conectar o ChatEngine ao CRM, incluindo o que já está implementado, o que falta implementar e o plano de ação.

---

## 🔍 **1. Análise do Estado Atual**

### 1.1 O que JÁ está Implementado ✅

#### **Infraestrutura de Conexão**
- ✅ `ChatEngineClient` - Cliente HTTP completo para API REST
- ✅ `ConversationService` - Serviço de aplicação que orquestra operações
- ✅ `ConversationContext` - Context React que fornece o serviço
- ✅ `useChatEngineJwt` - Hook para gerenciar tokens JWT
- ✅ Geração de JWT local (via `VITE_CHATENGINE_JWT_SECRET`)
- ✅ Configuração via variáveis de ambiente
- ✅ Fallback para Edge Functions quando ChatEngine não está configurado

#### **Funcionalidades de Envio**
- ✅ Envio de mensagens de texto via ChatEngine
- ✅ Envio de imagens via ChatEngine (FormData)
- ✅ Envio de áudio via ChatEngine (FormData)
- ✅ Upload de anexos via ChatEngine
- ✅ Resposta a mensagens (reply)
- ✅ `useSendMessage` hook com fallback automático

#### **Funcionalidades de Leitura**
- ✅ Listagem de conversas (via Supabase direto)
- ✅ Busca de mensagens (via Supabase direto)
- ✅ Supabase Realtime para atualizações (polling interno)

#### **Integração com Mídia**
- ✅ `useMediaUrl` - Hook para proxy de mídia do ChatEngine
- ✅ Suporte a URLs assinadas do Supabase

### 1.2 O que FALTA Implementar ⚠️

#### **WebSocket (CRÍTICO)**
- ❌ Cliente WebSocket para conexão em tempo real
- ❌ Hook `useWebSocket` para gerenciar conexão
- ❌ Integração com hooks existentes (`useMessages`, `useConversations`)
- ❌ Substituição de Supabase Realtime por WebSocket
- ❌ Indicadores de digitação via WebSocket

#### **Otimizações**
- ❌ Polling incremental via parâmetro `since` (ChatEngine API)
- ❌ Cache de mensagens/conversas
- ❌ Reconexão automática do WebSocket

#### **Funcionalidades Avançadas**
- ❌ Contexto de mensagem (`/api/chat/messages/{id}/context`)
- ❌ Estatísticas da fila (`/api/internal/queue/stats`)

---

## 🏗️ **2. Arquitetura da Conexão**

### 2.1 Fluxo Atual (Sem WebSocket)

```
┌─────────────────────────────────────────────────────────┐
│                    CRM (Frontend)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   Component  │───▶│ useMessages  │                 │
│  └──────────────┘    └──────────────┘                 │
│                              │                          │
│                              ▼                          │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ Conversation │───▶│ Supabase     │                 │
│  │   Service    │    │  Realtime    │                 │
│  └──────────────┘    └──────────────┘                 │
│         │                                              │
│         ▼                                              │
│  ┌──────────────┐                                      │
│  │ ChatEngine   │───▶ POST /api/chat/messages         │
│  │    Client    │                                      │
│  └──────────────┘                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                  ChatEngine (Backend)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │  WebSocket   │    │  REST API    │                 │
│  │   Server     │    │              │                 │
│  └──────────────┘    └──────────────┘                 │
│         │                      │                        │
│         │                      ▼                        │
│         │              ┌──────────────┐                 │
│         │              │  Supabase    │                 │
│         │              │  Database   │                 │
│         │              └──────────────┘                 │
│         │                                              │
│         └───────────────▶ Evolution API                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo Proposto (Com WebSocket)

```
┌─────────────────────────────────────────────────────────┐
│                    CRM (Frontend)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │   Component  │───▶│ useMessages  │                 │
│  └──────────────┘    └──────────────┘                 │
│                              │                          │
│                              ▼                          │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │ Conversation │───▶│  WebSocket   │◀───┐           │
│  │   Service    │    │    Client    │    │           │
│  └──────────────┘    └──────────────┘    │           │
│         │                   │              │           │
│         │                   └──────────────┘           │
│         │              (Tempo Real)                    │
│         ▼                                              │
│  ┌──────────────┐                                      │
│  │ ChatEngine   │───▶ POST /api/chat/messages         │
│  │    Client    │                                      │
│  └──────────────┘                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                  ChatEngine (Backend)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                 │
│  │  WebSocket   │◀───│  REST API    │                 │
│  │   Server     │    │              │                 │
│  └──────────────┘    └──────────────┘                 │
│         │                      │                        │
│         │                      ▼                        │
│         │              ┌──────────────┐                 │
│         │              │  Supabase    │                 │
│         │              │  Database   │                 │
│         │              └──────────────┘                 │
│         │                                              │
│         └───────────────▶ Evolution API                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 **3. Estrutura de Arquivos Necessária**

### 3.1 Arquivos a Criar

```
src/
├── modules/
│   └── conversation/
│       ├── infrastructure/
│       │   └── websocket/
│       │       ├── WebSocketClient.ts          # Cliente WebSocket
│       │       ├── WebSocketContext.tsx        # Context React
│       │       └── types.ts                    # Tipos TypeScript
│       └── presentation/
│           └── hooks/
│               ├── useWebSocket.ts             # Hook principal
│               └── useTypingIndicator.ts       # Hook para typing
```

### 3.2 Arquivos a Modificar

```
src/
├── modules/
│   └── conversation/
│       ├── presentation/
│       │   ├── hooks/
│       │   │   ├── useMessages.ts             # Adicionar WebSocket
│       │   │   └── useConversations.ts         # Adicionar WebSocket
│       │   └── contexts/
│       │       └── ConversationContext.tsx     # Integrar WebSocket
│       └── infrastructure/
│           └── chatengine/
│               └── config.ts                   # Adicionar URL WebSocket
```

---

## 🔧 **4. Implementação Detalhada**

### 4.1 Cliente WebSocket

**Arquivo:** `src/modules/conversation/infrastructure/websocket/WebSocketClient.ts`

**Responsabilidades:**
- Gerenciar conexão WebSocket com ChatEngine
- Autenticação via JWT
- Reconexão automática
- Gerenciar subscriptions (conversas)
- Emitir eventos (typing, etc)
- Escutar eventos (message, conversation, messageStatus, typing)

**Interface:**
```typescript
class WebSocketClient {
  connect(token: string, baseUrl: string): Promise<void>
  disconnect(): void
  subscribe(conversationId: string): void
  unsubscribe(conversationId: string): void
  emitTyping(conversationId: string, isTyping: boolean): void
  onMessage(callback: (message: Message) => void): void
  onConversation(callback: (conversation: Conversation) => void): void
  onMessageStatus(callback: (data: { messageId: string; status: string }) => void): void
  onTyping(callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void): void
  isConnected(): boolean
}
```

### 4.2 Context WebSocket

**Arquivo:** `src/modules/conversation/infrastructure/websocket/WebSocketContext.tsx`

**Responsabilidades:**
- Prover instância do WebSocketClient
- Gerenciar ciclo de vida da conexão
- Integrar com ConversationContext

### 4.3 Hook useWebSocket

**Arquivo:** `src/modules/conversation/presentation/hooks/useWebSocket.ts`

**Responsabilidades:**
- Hook React para usar WebSocket
- Gerenciar subscriptions automáticas
- Integrar com hooks existentes

**Interface:**
```typescript
function useWebSocket(conversationId?: string | null) {
  return {
    isConnected: boolean
    subscribe: (id: string) => void
    unsubscribe: (id: string) => void
    emitTyping: (isTyping: boolean) => void
  }
}
```

### 4.4 Modificações em useMessages

**Arquivo:** `src/modules/conversation/presentation/hooks/useMessages.ts`

**Mudanças:**
- Adicionar listener WebSocket para novas mensagens
- Adicionar listener WebSocket para atualizações de status
- Manter Supabase Realtime como fallback
- Priorizar WebSocket quando disponível

### 4.5 Modificações em useConversations

**Arquivo:** `src/modules/conversation/presentation/hooks/useConversations.ts`

**Mudanças:**
- Adicionar listener WebSocket para atualizações de conversa
- Manter Supabase Realtime como fallback
- Priorizar WebSocket quando disponível

---

## 📦 **5. Dependências Necessárias**

### 5.1 Instalar

```bash
npm install socket.io-client
```

### 5.2 Variáveis de Ambiente

Adicionar ao `.env`:

```bash
# ChatEngine WebSocket URL (mesma base do REST API)
VITE_CHATENGINE_WS_URL=wss://chatengine.newflow.me

# Ou usar a mesma URL do REST API (será derivada)
VITE_CHATENGINE_API_URL=https://chatengine.newflow.me
```

---

## 🎯 **6. Plano de Implementação**

### Fase 1: Infraestrutura WebSocket (Prioridade ALTA)

1. ✅ Instalar `socket.io-client`
2. ✅ Criar `WebSocketClient.ts`
3. ✅ Criar `WebSocketContext.tsx`
4. ✅ Criar `useWebSocket.ts` hook
5. ✅ Integrar com `ConversationContext`

**Estimativa:** 1-2 dias

### Fase 2: Integração com Hooks Existentes (Prioridade ALTA)

1. ✅ Modificar `useMessages` para usar WebSocket
2. ✅ Modificar `useConversations` para usar WebSocket
3. ✅ Manter fallback para Supabase Realtime
4. ✅ Testar integração

**Estimativa:** 1 dia

### Fase 3: Funcionalidades Avançadas (Prioridade MÉDIA)

1. ✅ Implementar indicadores de digitação
2. ✅ Implementar polling incremental (opcional)
3. ✅ Adicionar contexto de mensagem
4. ✅ Adicionar estatísticas da fila

**Estimativa:** 1-2 dias

### Fase 4: Otimizações (Prioridade BAIXA)

1. ✅ Cache de mensagens/conversas
2. ✅ Reconexão inteligente
3. ✅ Retry automático
4. ✅ Métricas e monitoramento

**Estimativa:** 1-2 dias

---

## 🔄 **7. Fluxo de Dados Detalhado**

### 7.1 Envio de Mensagem

```
User → Component → useSendMessage → ConversationService
                                          │
                                          ▼
                                    ChatEngineClient
                                          │
                                          ▼
                                    POST /api/chat/messages
                                          │
                                          ▼
                                    ChatEngine (Backend)
                                          │
                    ┌────────────────────┴────────────────────┐
                    │                                          │
                    ▼                                          ▼
            Salva no Supabase                    Broadcast WebSocket
                    │                                          │
                    │                                          ▼
                    └───────────────────▶ useMessages (atualiza UI)
```

### 7.2 Recebimento de Mensagem (WebSocket)

```
Evolution API → Webhook → ChatEngine
                              │
                              ▼
                    Processa e salva
                              │
                              ▼
                    Broadcast WebSocket
                              │
                              ▼
                    WebSocketClient (CRM)
                              │
                              ▼
                    useMessages hook
                              │
                              ▼
                    Component (atualiza UI)
```

### 7.3 Recebimento de Mensagem (Fallback)

```
Evolution API → Webhook → ChatEngine
                              │
                              ▼
                    Processa e salva no Supabase
                              │
                              ▼
                    Supabase Realtime
                              │
                              ▼
                    useMessages hook
                              │
                              ▼
                    Component (atualiza UI)
```

---

## 🧪 **8. Estratégia de Migração**

### 8.1 Abordagem Híbrida (Recomendada)

1. **Manter Supabase Realtime** como fallback
2. **Adicionar WebSocket** como fonte primária
3. **Detectar disponibilidade** do WebSocket
4. **Usar WebSocket quando disponível**, fallback para Supabase

**Vantagens:**
- ✅ Transição suave
- ✅ Sem breaking changes
- ✅ Fallback automático
- ✅ Testável incrementalmente

### 8.2 Implementação Gradual

**Etapa 1:** Implementar WebSocket Client
- Criar infraestrutura
- Testar conexão isoladamente

**Etapa 2:** Integrar com useMessages
- Adicionar listeners
- Manter Supabase como fallback

**Etapa 3:** Integrar com useConversations
- Adicionar listeners
- Manter Supabase como fallback

**Etapa 4:** Otimizar e remover fallback (opcional)
- Após validação completa
- Remover Supabase Realtime se desejado

---

## 📊 **9. Comparação: Atual vs Proposto**

| Aspecto | Atual (Supabase Realtime) | Proposto (WebSocket) |
|---------|---------------------------|----------------------|
| **Latência** | 2-5 segundos | <100ms |
| **Tráfego HTTP** | Alto (polling interno) | Baixo (conexão persistente) |
| **Escalabilidade** | Limitada | Alta |
| **Custo** | Supabase Realtime | WebSocket (próprio) |
| **Confiabilidade** | Boa | Excelente (com reconexão) |
| **Complexidade** | Baixa | Média |

---

## ✅ **10. Checklist de Implementação**

### Infraestrutura
- [ ] Instalar `socket.io-client`
- [ ] Criar `WebSocketClient.ts`
- [ ] Criar `WebSocketContext.tsx`
- [ ] Criar `useWebSocket.ts` hook
- [ ] Adicionar variáveis de ambiente

### Integração
- [ ] Integrar WebSocket com `ConversationContext`
- [ ] Modificar `useMessages` para usar WebSocket
- [ ] Modificar `useConversations` para usar WebSocket
- [ ] Implementar fallback para Supabase Realtime

### Funcionalidades
- [ ] Indicadores de digitação
- [ ] Reconexão automática
- [ ] Tratamento de erros
- [ ] Logging e debug

### Testes
- [ ] Testar conexão WebSocket
- [ ] Testar recebimento de mensagens
- [ ] Testar envio de mensagens
- [ ] Testar indicadores de digitação
- [ ] Testar reconexão
- [ ] Testar fallback

### Documentação
- [ ] Documentar uso do WebSocket
- [ ] Atualizar guia de integração
- [ ] Adicionar exemplos de código

---

## 🚀 **11. Próximos Passos Imediatos**

1. **Instalar dependência:**
   ```bash
   npm install socket.io-client
   ```

2. **Criar estrutura de arquivos:**
   - `src/modules/conversation/infrastructure/websocket/`
   - `WebSocketClient.ts`
   - `WebSocketContext.tsx`
   - `types.ts`

3. **Implementar WebSocketClient:**
   - Conexão com autenticação
   - Gerenciamento de subscriptions
   - Event listeners

4. **Integrar com hooks existentes:**
   - Modificar `useMessages`
   - Modificar `useConversations`

5. **Testar:**
   - Conexão
   - Recebimento de mensagens
   - Envio de mensagens
   - Indicadores de digitação

---

## 📝 **12. Notas Importantes**

### Configuração

- O WebSocket usa a mesma URL base do REST API
- Path do WebSocket: `/api/ws`
- Autenticação via JWT (mesmo token do REST API)

### Fallback

- Sempre manter fallback para Supabase Realtime
- Detectar disponibilidade do WebSocket
- Usar WebSocket quando disponível, fallback quando não

### Performance

- WebSocket reduz latência de 2-5s para <100ms
- Reduz tráfego HTTP em 80-90%
- Melhora experiência do usuário significativamente

### Compatibilidade

- Manter compatibilidade com código existente
- Não quebrar funcionalidades atuais
- Migração gradual e testável

---

**Última atualização:** Janeiro 2025  
**Status:** Pronto para implementação
