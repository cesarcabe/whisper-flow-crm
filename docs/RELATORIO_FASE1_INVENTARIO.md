# RELATÓRIO FASE 1 - INVENTÁRIO E DIAGNÓSTICO
**Data:** 2025-01-XX  
**Objetivo:** Mapear estrutura atual, identificar fluxos de chat, arquivos obsoletos e duplicações

---

## 📋 ÍNDICE

1. [Estrutura Atual do Repositório](#1-estrutura-atual-do-repositório)
2. [Mapeamento de Funcionalidades](#2-mapeamento-de-funcionalidades)
3. [Pontos de Entrada do Sistema](#3-pontos-de-entrada-do-sistema)
4. [Fluxos de Chat Identificados](#4-fluxos-de-chat-identificados)
5. [Arquivos Obsoletos (100% Não Usados)](#5-arquivos-obsoletos-100-não-usados)
6. [Arquivos Suspeitos (Possível Legado)](#6-arquivos-suspeitos-possível-legado)
7. [Arquivos Críticos do Fluxo Atual](#7-arquivos-críticos-do-fluxo-atual)
8. [Duplicações de Lógica](#8-duplicações-de-lógica)
9. [Env Vars e Configs](#9-env-vars-e-configs)
10. [Funcionalidades Futuras: Envio/Recebimento de Mídia via WebSocket](#10-funcionalidades-futuras-enviorecebimento-de-mídia-via-websocket)
11. [Recomendações Imediatas](#11-recomendações-imediatas)

---

## 1. ESTRUTURA ATUAL DO REPOSITÓRIO

### 1.1 Estrutura de Módulos (Modular Monolith Parcial)

```
src/
├── modules/                    ✅ ESTRUTURA MODULAR (PARCIAL)
│   ├── conversation/          ✅ Módulo de conversas (BEM ESTRUTURADO)
│   │   ├── application/
│   │   │   └── services/
│   │   │       └── ConversationService.ts
│   │   ├── infrastructure/
│   │   │   ├── chatengine/
│   │   │   │   └── config.ts
│   │   │   └── websocket/
│   │   │       ├── WebSocketClient.ts      ✅ ATUAL
│   │   │       ├── WebSocketContext.tsx    ✅ ATUAL
│   │   │       └── types.ts
│   │   └── presentation/
│   │       ├── contexts/
│   │       │   └── ConversationContext.tsx
│   │       └── hooks/
│   │           ├── useChatEngineJwt.ts
│   │           ├── useConversations.ts
│   │           ├── useMessages.ts
│   │           ├── useSendMessage.ts
│   │           ├── useWebSocket.ts
│   │           └── useMediaUrl.ts
│   ├── dashboard/             ✅ Módulo de dashboard
│   ├── reports/               ✅ Módulo de relatórios
│   └── workspace/             ✅ Módulo de workspaces (BEM ESTRUTURADO)
│       ├── domain/
│       ├── infrastructure/
│       └── presentation/
├── components/                 ⚠️ COMPONENTES FORA DOS MÓDULOS
│   ├── whatsapp/              ⚠️ DEVERIA ESTAR EM modules/conversation/presentation/
│   ├── kanban/                ⚠️ DEVERIA ESTAR EM modules/kanban/presentation/
│   └── workspace/             ⚠️ DEVERIA ESTAR EM modules/workspace/presentation/
├── hooks/                     ⚠️ HOOKS LEGADOS (DUPLICADOS)
│   ├── useMessages.ts         ⚠️ RE-EXPORT de modules/conversation
│   ├── useConversations.ts    ⚠️ RE-EXPORT de modules/conversation
│   └── [outros hooks]         ⚠️ MISTURADOS (alguns legados, alguns únicos)
├── infra/                     ⚠️ DUPLICAÇÃO COM modules/
│   └── supabase/              ⚠️ REPOSITÓRIOS E MAPPERs (usados por Kanban)
│       ├── mappers/
│       └── repositories/
├── core/                      ✅ CORE DOMAIN (COMPARTILHADO)
│   ├── domain/
│   │   └── entities/
│   └── ports/
│       └── repositories/
└── integrations/              ✅ INTEGRAÇÕES EXTERNAS
    └── supabase/
        └── client.ts
```

### 1.2 Estrutura de Edge Functions (Supabase)

```
supabase/functions/
├── evolution-webhook/         ✅ FALLBACK ATUAL (Webhook Supabase)
│   ├── handlers/
│   │   ├── handleConnection.ts
│   │   ├── handleMessage.ts
│   │   └── handleQrCode.ts
│   ├── services/
│   │   ├── contactService.ts
│   │   ├── conversationService.ts
│   │   ├── deliveryService.ts
│   │   ├── mediaService.ts
│   │   └── whatsappService.ts
│   └── index.ts
├── whatsapp-send/             ✅ FALLBACK (envio via Edge Function)
├── whatsapp-send-image/        ✅ FALLBACK
├── whatsapp-send-audio/        ✅ FALLBACK
├── whatsapp-create-instance/   ✅ ATIVO
├── whatsapp-delete-instance/   ✅ ATIVO
├── whatsapp-disconnect-instance/ ✅ ATIVO
└── whatsapp-get-qr/            ✅ ATIVO
```

---

## 2. MAPEAMENTO DE FUNCIONALIDADES

### 2.1 Kanban
**Localização:** `src/components/kanban/` + `src/hooks/usePipelines.ts`  
**Status:** ⚠️ **FORA DO PADRÃO MODULAR**  
**Estrutura Atual:**
- Componentes em `src/components/kanban/`
- Hooks em `src/hooks/` (usePipelines, useKanbanState, useConversationStages, etc.)
- Repositórios em `src/infra/supabase/repositories/` (SupabaseStageRepository, SupabasePipelineRepository)

**Onde deveria estar:**
- `src/modules/kanban/presentation/components/`
- `src/modules/kanban/presentation/hooks/`
- `src/modules/kanban/infrastructure/repositories/`

### 2.2 Conversations/Chat
**Localização:** `src/modules/conversation/` + `src/components/whatsapp/`  
**Status:** ✅ **PARCIALMENTE MODULARIZADO**  
**Estrutura:**
- ✅ Módulo bem estruturado em `src/modules/conversation/`
- ⚠️ Componentes UI em `src/components/whatsapp/` (deveria estar em `modules/conversation/presentation/components/`)

**Fluxos Identificados:**
1. **WebSocket Principal (ATUAL):** `CRM -> ChatEngineWebSocket (VPS) -> Evolution`
2. **Supabase Webhook Fallback (ATUAL):** `Evolution -> Supabase Edge Function -> Supabase DB`
3. **Chat Engine por Webhook (LEGADO DESCONTINUADO):** ❌ **NÃO ENCONTRADO** (provavelmente já removido)

---

## 3. PONTOS DE ENTRADA DO SISTEMA

### 3.1 Rotas/Endpoints (Frontend)
**Arquivo:** `src/App.tsx`

```typescript
Rotas Principais:
- /                    → Dashboard
- /kanban              → Kanban
- /conversations       → Conversations
- /reports             → Reports
- /workspace/admin     → WorkspaceAdmin
- /test/websocket      → WebSocketTestPanel (⚠️ DEV ONLY)
```

### 3.2 Serviços Inicializados no Bootstrap
**Arquivo:** `src/App.tsx`

```typescript
Providers:
- AuthProvider
- WorkspaceProvider
- ConversationProvider (inclui WebSocketProvider)
- QueryClientProvider
```

### 3.3 Listeners/Jobs/Queues
- ✅ **WebSocket Client:** `src/modules/conversation/infrastructure/websocket/WebSocketClient.ts`
  - Conecta automaticamente via `WebSocketProvider`
  - Escuta eventos: `message`, `conversation`, `messageStatus`, `typing`
  
- ✅ **Supabase Realtime:** Usado como fallback em `useMessages` e `useConversations`
  - Channels para `messages` e `conversations`

### 3.4 Edge Functions (Backend)
**Localização:** `supabase/functions/`

**Webhooks Ativos:**
- ✅ `evolution-webhook` - Recebe webhooks do Evolution API (FALLBACK)
- ✅ `whatsapp-send*` - Envio de mensagens (FALLBACK quando WebSocket não disponível)

**Endpoints de Gestão:**
- ✅ `whatsapp-create-instance`
- ✅ `whatsapp-delete-instance`
- ✅ `whatsapp-disconnect-instance`
- ✅ `whatsapp-get-qr`

---

## 4. FLUXOS DE CHAT IDENTIFICADOS

### 4.1 Fluxo Principal: WebSocket via ChatEngineWebSocket ✅ ATUAL

```
Evolution API
    │
    ▼
ChatEngineWebSocket (VPS) ── WebSocket ──► CRM Frontend
    │                                              │
    │                                              ▼
    │                                    WebSocketClient
    │                                    (src/modules/conversation/infrastructure/websocket/)
    │                                              │
    │                                              ▼
    └──────────────────────────────────► useMessages / useConversations
                                              │
                                              ▼
                                        UI Components
```

**Arquivos Envolvidos:**
- ✅ `src/modules/conversation/infrastructure/websocket/WebSocketClient.ts`
- ✅ `src/modules/conversation/infrastructure/websocket/WebSocketContext.tsx`
- ✅ `src/modules/conversation/presentation/hooks/useWebSocket.ts`
- ✅ `src/modules/conversation/presentation/hooks/useMessages.ts` (integra WebSocket)
- ✅ `src/modules/conversation/presentation/hooks/useConversations.ts` (integra WebSocket)
- ✅ `src/modules/conversation/presentation/hooks/useSendMessage.ts` (envia texto via WebSocket)

**Status de Funcionalidades WebSocket:**
- ✅ **Envio de texto:** Implementado via WebSocket
- ⚠️ **Envio de imagem:** **NÃO IMPLEMENTADO** - Atualmente usa Edge Function `whatsapp-send-image` (fallback)
- ⚠️ **Envio de áudio:** **NÃO IMPLEMENTADO** - Atualmente usa Edge Function `whatsapp-send-audio` (fallback)
- ✅ **Recebimento de mídia:** Via Supabase Webhook (fallback) - processa imagens e áudio

**Nota:** Os tipos WebSocket já suportam attachments (`WebSocketMessage.attachments`), mas os métodos `sendImage()` e `sendAudio()` ainda não foram implementados no `WebSocketClient`. A estrutura está preparada para implementação futura.

**Configuração:**
- Env Var: `VITE_CHATENGINE_BASE_URL` ou `VITE_CHATENGINE_API_URL`
- JWT: Gerado localmente via `useChatEngineJwt` usando `session.access_token`

### 4.2 Fluxo Fallback: Supabase Webhook ✅ ATUAL (FALLBACK)

```
Evolution API
    │
    ▼
Supabase Edge Function (evolution-webhook)
    │
    ├──► Validação API Key (workspace_api_keys)
    ├──► Idempotência (webhook_deliveries)
    ├──► Processamento (handleMessage)
    │   ├──► ContactService (upsertContact)
    │   ├──► ConversationService (upsertConversation)
    │   ├──► MediaService (downloadAndStoreMedia)
    │   └──► Insert Message (messages table)
    │
    └──► Supabase DB
            │
            ▼
    Supabase Realtime ──► CRM Frontend
            │
            ▼
    useMessages / useConversations (fallback)
```

**Arquivos Envolvidos:**
- ✅ `supabase/functions/evolution-webhook/index.ts`
- ✅ `supabase/functions/evolution-webhook/handlers/handleMessage.ts`
- ✅ `supabase/functions/evolution-webhook/services/*.ts`
- ✅ `src/modules/conversation/presentation/hooks/useMessages.ts` (fallback Realtime)
- ✅ `src/modules/conversation/presentation/hooks/useConversations.ts` (fallback Realtime)

**Configuração:**
- Webhook URL configurado no Evolution API
- API Key por workspace em `workspace_api_keys`

### 4.3 Fluxo Legado: Chat Engine por Webhook ❌ DESCONTINUADO (NÃO ENCONTRADO)

**Status:** ✅ **JÁ REMOVIDO** (não encontrado no código)

**Evidências:**
- ❌ Nenhum código encontrado referenciando "Chat Engine" via webhook
- ❌ Nenhuma Edge Function relacionada a Chat Engine webhook
- ✅ Documentação menciona que foi descontinuado

**Conclusão:** Este fluxo já foi removido anteriormente. ✅

---

## 5. ARQUIVOS OBSOLETOS (100% NÃO USADOS)

### 5.1 Arquivos de Documentação (Possivelmente Desatualizados)

⚠️ **SUSPEITOS (verificar se ainda são relevantes):**
- `docs/integrations/CHATENGINE_CONNECTION_PLAN.md` - Menciona "ChatEngineClient" HTTP que não existe
- `docs/integrations/RESUMO_CONEXAO_CHATENGINE.md` - Menciona "ChatEngineClient" HTTP
- `docs/integrations/WEBSOCKET_IMPLEMENTATION_GUIDE.md` - Pode estar desatualizado
- `docs/integrations/SCRIPT_TESTE_RAPIDO.md` - Pode estar desatualizado
- `docs/integrations/GUIA_TESTES_INTEGRACAO.md` - Pode estar desatualizado

**Ação:** Revisar e atualizar ou mover para `/deprecated/docs/`

### 5.2 Componente de Teste

⚠️ **DEV ONLY:**
- `src/components/test/WebSocketTestPanel.tsx` - Rota `/test/websocket`
  - **Status:** Usado apenas em desenvolvimento
  - **Ação:** Manter ou mover para `/deprecated/` se não for mais necessário

---

## 6. ARQUIVOS SUSPEITOS (POSSÍVEL LEGADO)

### 6.1 Hooks em `src/hooks/` (Re-exports e Legados)

**Re-exports (OK, mas pode ser consolidado):**
- ✅ `src/hooks/useMessages.ts` - Re-export de `modules/conversation/presentation/hooks/useMessages`
- ✅ `src/hooks/useConversations.ts` - Re-export de `modules/conversation/presentation/hooks/useConversations`

**Hooks Legados (ainda em uso, mas fora do padrão modular):**
- ⚠️ `src/hooks/usePipelines.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useKanbanState.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useConversationStages.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useContactClasses.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useGroupClasses.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useGroupConversations.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`
- ⚠️ `src/hooks/useContacts.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/` ou `modules/shared/`
- ⚠️ `src/hooks/useCreateConversation.ts` - **DEVERIA ESTAR EM** `modules/conversation/presentation/hooks/`
- ⚠️ `src/hooks/useForwardMessage.ts` - **DEVERIA ESTAR EM** `modules/conversation/presentation/hooks/`
- ⚠️ `src/hooks/useMessageReactions.ts` - **DEVERIA ESTAR EM** `modules/conversation/presentation/hooks/`
- ⚠️ `src/hooks/useConversationStages.ts` - **DEVERIA ESTAR EM** `modules/kanban/presentation/hooks/`

**Hooks Únicos (OK manter em `src/hooks/`):**
- ✅ `src/hooks/useAudioRecorder.ts` - Hook genérico
- ✅ `src/hooks/useImagePicker.ts` - Hook genérico
- ✅ `src/hooks/use-mobile.tsx` - Hook genérico
- ✅ `src/hooks/use-toast.ts` - Hook genérico
- ✅ `src/hooks/useWhatsappConnection.ts` - **DEVERIA ESTAR EM** `modules/conversation/presentation/hooks/`
- ✅ `src/hooks/useWhatsappNumbers.ts` - **DEVERIA ESTAR EM** `modules/conversation/presentation/hooks/`
- ✅ `src/hooks/useWorkspaceMembers.ts` - **DEVERIA ESTAR EM** `modules/workspace/presentation/hooks/`
- ✅ `src/hooks/useWorkspaceInvitations.ts` - **DEVERIA ESTAR EM** `modules/workspace/presentation/hooks/`
- ✅ `src/hooks/useUserRole.ts` - **DEVERIA ESTAR EM** `modules/workspace/presentation/hooks/`

### 6.2 Componentes Fora dos Módulos

**Componentes WhatsApp (deveriam estar em `modules/conversation/presentation/components/`):**
- ⚠️ `src/components/whatsapp/*` (15 arquivos)
  - Todos deveriam estar em `modules/conversation/presentation/components/`

**Componentes Kanban (deveriam estar em `modules/kanban/presentation/components/`):**
- ⚠️ `src/components/kanban/*` (26 arquivos)
  - Todos deveriam estar em `modules/kanban/presentation/components/`

**Componentes Workspace (deveriam estar em `modules/workspace/presentation/components/`):**
- ⚠️ `src/components/workspace/*` (6 arquivos)
  - Todos deveriam estar em `modules/workspace/presentation/components/`

### 6.3 Repositórios Duplicados

**Duplicação:**
- ⚠️ `src/infra/supabase/repositories/` - Repositórios usados por Kanban
- ⚠️ `src/core/ports/repositories/` - Interfaces (OK)
- ⚠️ `src/modules/workspace/infrastructure/repositories/` - Repositórios do módulo workspace

**Problema:** Kanban usa `src/infra/supabase/repositories/` diretamente, não segue padrão modular.

**Solução:** Migrar para `modules/kanban/infrastructure/repositories/`

---

## 7. ARQUIVOS CRÍTICOS DO FLUXO ATUAL

### 7.1 WebSocket (Fluxo Principal)

**Arquivos Críticos:**
1. ✅ `src/modules/conversation/infrastructure/websocket/WebSocketClient.ts`
   - Cliente WebSocket principal
   - Conecta ao ChatEngineWebSocket (VPS)
   - ⚠️ **FALTA:** Métodos `sendImage()` e `sendAudio()` (serão implementados futuramente)
   
2. ✅ `src/modules/conversation/infrastructure/websocket/WebSocketContext.tsx`
   - Provider React para WebSocket
   - Gerencia conexão automática
   
3. ✅ `src/modules/conversation/infrastructure/websocket/types.ts`
   - Tipos TypeScript para WebSocket
   - ✅ Já suporta `attachments` em `WebSocketMessage`
   
4. ✅ `src/modules/conversation/infrastructure/chatengine/config.ts`
   - Configuração de URLs (VITE_CHATENGINE_BASE_URL)
   
5. ✅ `src/modules/conversation/presentation/hooks/useChatEngineJwt.ts`
   - Gera JWT para autenticação WebSocket
   
6. ✅ `src/modules/conversation/presentation/hooks/useWebSocket.ts`
   - Hook para usar WebSocket em componentes
   
7. ✅ `src/modules/conversation/presentation/hooks/useMessages.ts`
   - Integra WebSocket + Supabase Realtime (fallback)
   - ✅ Já processa mensagens com attachments recebidas via WebSocket
   
8. ✅ `src/modules/conversation/presentation/hooks/useConversations.ts`
   - Integra WebSocket + Supabase Realtime (fallback)
   
9. ✅ `src/modules/conversation/presentation/hooks/useSendMessage.ts`
   - Envia mensagens de texto via WebSocket (com fallback para Edge Function)
   - ⚠️ **FALTA:** Integração para envio de imagem/áudio via WebSocket (atualmente usa Edge Functions)

### 7.2 Supabase Webhook (Fluxo Fallback)

**Arquivos Críticos:**
1. ✅ `supabase/functions/evolution-webhook/index.ts`
   - Entry point do webhook
   - Validação de API Key
   - Idempotência via `webhook_deliveries`
   
2. ✅ `supabase/functions/evolution-webhook/handlers/handleMessage.ts`
   - Processa mensagens recebidas
   - Insere no banco de dados
   
3. ✅ `supabase/functions/evolution-webhook/handlers/handleConnection.ts`
   - Processa atualizações de conexão
   
4. ✅ `supabase/functions/evolution-webhook/handlers/handleQrCode.ts`
   - Processa QR codes
   
5. ✅ `supabase/functions/evolution-webhook/services/*.ts`
   - Serviços de negócio (contact, conversation, media, delivery, whatsapp)

### 7.3 Envio de Mensagens (Fallback)

**Arquivos Críticos:**
1. ✅ `supabase/functions/whatsapp-send/index.ts`
   - Envio de mensagens de texto (fallback quando WebSocket não disponível)
   
2. ✅ `supabase/functions/whatsapp-send-image/index.ts`
   - Envio de imagens (fallback atual - será substituído por WebSocket)
   - ⚠️ **USADO ATUALMENTE** - `MessageInput.tsx` chama esta função
   - **Plano:** Migrar para WebSocket quando `WebSocketClient.sendImage()` for implementado
   
3. ✅ `supabase/functions/whatsapp-send-audio/index.ts`
   - Envio de áudio (fallback atual - será substituído por WebSocket)
   - ⚠️ **USADO ATUALMENTE** - `MessageInput.tsx` chama esta função
   - **Plano:** Migrar para WebSocket quando `WebSocketClient.sendAudio()` for implementado

---

## 8. DUPLICAÇÕES DE LÓGICA

### 8.1 Hooks Duplicados

**Re-exports (não é duplicação real, mas pode ser consolidado):**
- `src/hooks/useMessages.ts` → Re-export de `modules/conversation/presentation/hooks/useMessages`
- `src/hooks/useConversations.ts` → Re-export de `modules/conversation/presentation/hooks/useConversations`

**Ação:** Manter re-exports para compatibilidade ou remover e atualizar imports.

### 8.2 Repositórios Duplicados

**Problema:**
- `src/infra/supabase/repositories/` - Usado por Kanban
- `src/modules/workspace/infrastructure/repositories/` - Usado por Workspace
- `src/modules/conversation/` - Não tem repositórios próprios (usa core ports)

**Ação:** Migrar repositórios de Kanban para `modules/kanban/infrastructure/repositories/`

### 8.3 Mappers Duplicados

**Problema:**
- `src/infra/supabase/mappers/` - Usado por Kanban
- `src/modules/workspace/infrastructure/mappers/` - Usado por Workspace

**Ação:** Migrar mappers de Kanban para `modules/kanban/infrastructure/mappers/`

### 8.4 Lógica de Normalização

**Arquivos:**
- `src/lib/normalize.ts` - Funções de normalização genéricas
- `supabase/functions/evolution-webhook/utils/normalize.ts` - Normalização específica de webhook

**Status:** ✅ OK (diferentes contextos)

---

## 9. ENV VARS E CONFIGS

### 9.1 Variáveis de Ambiente Usadas

**Frontend (VITE_*):**
- ✅ `VITE_SUPABASE_URL` - URL do Supabase
- ✅ `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- ✅ `VITE_CHATENGINE_BASE_URL` - URL base do ChatEngine (WebSocket)
- ✅ `VITE_CHATENGINE_API_URL` - URL da API do ChatEngine (fallback para BASE_URL)

**Backend (Edge Functions):**
- ✅ `SUPABASE_URL` - URL do Supabase (service role)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase
- ✅ `EVOLUTION_BASE_URL` - URL do Evolution API (opcional)
- ✅ `EVOLUTION_API_KEY` - Chave da API do Evolution (opcional)

### 9.2 Variáveis de Ambiente NÃO Usadas (Mencionadas na Documentação)

⚠️ **Possivelmente Obsoletas:**
- `VITE_CHATENGINE_JWT_SECRET` - **NÃO ENCONTRADO NO CÓDIGO**
  - Documentação menciona, mas código usa `session.access_token` diretamente
  - **Ação:** Verificar se é necessário ou remover da documentação

- `VITE_CHATENGINE_WS_URL` - **NÃO ENCONTRADO NO CÓDIGO**
  - Documentação menciona, mas código deriva de `VITE_CHATENGINE_BASE_URL`
  - **Ação:** Remover da documentação ou implementar se necessário

### 9.3 Configurações

**Arquivo:** `src/modules/conversation/infrastructure/chatengine/config.ts`
```typescript
CHATENGINE_API_URL = import.meta.env.VITE_CHATENGINE_API_URL ?? ''
CHATENGINE_BASE_URL = import.meta.env.VITE_CHATENGINE_BASE_URL ?? CHATENGINE_API_URL
```

**Status:** ✅ OK (fallback implementado)

---

## 10. FUNCIONALIDADES FUTURAS: ENVIO/RECEBIMENTO DE MÍDIA VIA WEBSOCKET

### 10.1 Status Atual

**Envio:**
- ✅ **Texto:** Implementado via WebSocket (`WebSocketClient.sendMessage()`)
- ⚠️ **Imagem:** Atualmente usa Edge Function `whatsapp-send-image` (será migrado para WebSocket)
- ⚠️ **Áudio:** Atualmente usa Edge Function `whatsapp-send-audio` (será migrado para WebSocket)

**Recebimento:**
- ✅ **Texto:** Via WebSocket (principal) ou Supabase Realtime (fallback)
- ✅ **Imagem/Áudio:** Via Supabase Webhook (fallback) - já processa mídia corretamente

### 10.2 Estrutura Atual (Preparada para Mídia)

**Tipos WebSocket já suportam:**
```typescript
// src/modules/conversation/infrastructure/websocket/types.ts
export interface WebSocketMessage {
  type: 'text' | 'image' | 'video' | 'audio' | 'file'  // ✅ Já suporta
  attachments?: Array<{                                // ✅ Já suporta
    id: string
    type: 'image' | 'video' | 'audio' | 'file'
    url: string
    thumbnailUrl?: string
    metadata?: { filename?, size?, mimeType?, ... }
  }>
}
```

**WebSocketClient atual:**
- ✅ `sendMessage()` - Envia texto
- ⚠️ `sendImage()` - **FALTA IMPLEMENTAR**
- ⚠️ `sendAudio()` - **FALTA IMPLEMENTAR**

### 10.3 O Que Precisa Ser Implementado

**1. WebSocketClient - Métodos de Envio:**
```typescript
// src/modules/conversation/infrastructure/websocket/WebSocketClient.ts

sendImage(input: {
  conversationId: string
  imageBase64: string
  mimeType: string
  caption?: string
  messageId?: string
  replyToMessageId?: string
}): void

sendAudio(input: {
  conversationId: string
  audioBase64: string
  mimeType: string
  messageId?: string
  replyToMessageId?: string
}): void
```

**2. Hooks de Apresentação:**
```typescript
// src/modules/conversation/presentation/hooks/useSendImage.ts
export function useSendImage() {
  // Similar a useSendMessage, mas para imagens
  // Usa WebSocketClient.sendImage() quando disponível
  // Fallback para Edge Function quando WebSocket não disponível
}

// src/modules/conversation/presentation/hooks/useSendAudio.ts
export function useSendAudio() {
  // Similar a useSendMessage, mas para áudio
  // Usa WebSocketClient.sendAudio() quando disponível
  // Fallback para Edge Function quando WebSocket não disponível
}
```

**3. Use Cases (Opcional, mas recomendado):**
```typescript
// src/modules/conversation/application/useCases/SendImageMessageUseCase.ts
// src/modules/conversation/application/useCases/SendAudioMessageUseCase.ts
```

**4. Atualizar MessageInput.tsx:**
- Usar `useSendImage()` e `useSendAudio()` quando disponíveis
- Manter fallback para Edge Functions

### 10.4 Recomendações para Reorganização

**Ao reorganizar, garantir que:**
1. ✅ `WebSocketClient` fique em `modules/conversation/infrastructure/websocket/`
2. ✅ Hooks de envio fiquem em `modules/conversation/presentation/hooks/`
3. ✅ Use cases fiquem em `modules/conversation/application/useCases/`
4. ✅ `MessageInput.tsx` seja migrado para `modules/conversation/presentation/components/`
5. ✅ Edge Functions (`whatsapp-send-image`, `whatsapp-send-audio`) sejam mantidas como fallback

**Estrutura Final Recomendada:**
```
modules/conversation/
├── application/
│   ├── services/
│   │   └── ConversationService.ts
│   └── useCases/
│       ├── SendTextMessageUseCase.ts      ✅ (via ConversationService)
│       ├── SendImageMessageUseCase.ts     ⚠️ (criar quando implementar)
│       └── SendAudioMessageUseCase.ts    ⚠️ (criar quando implementar)
├── infrastructure/
│   └── websocket/
│       └── WebSocketClient.ts
│           ├── sendMessage()              ✅
│           ├── sendImage()                ⚠️ (implementar)
│           └── sendAudio()                ⚠️ (implementar)
└── presentation/
    ├── components/
    │   └── MessageInput.tsx              ⚠️ (mover de components/whatsapp/)
    └── hooks/
        ├── useSendMessage.ts              ✅
        ├── useSendImage.ts                ⚠️ (criar quando implementar)
        └── useSendAudio.ts                ⚠️ (criar quando implementar)
```

---

## 11. RECOMENDAÇÕES IMEDIATAS

### 11.1 Prioridade ALTA (Fase 2-3)

1. **Migrar Kanban para Módulo**
   - Criar `src/modules/kanban/`
   - Mover componentes de `src/components/kanban/`
   - Mover hooks de `src/hooks/` (usePipelines, useKanbanState, etc.)
   - Mover repositórios de `src/infra/supabase/repositories/`

2. **Migrar Componentes WhatsApp**
   - Mover `src/components/whatsapp/` → `src/modules/conversation/presentation/components/`

3. **Migrar Componentes Workspace**
   - Mover `src/components/workspace/` → `src/modules/workspace/presentation/components/`

4. **Consolidar Hooks**
   - Mover hooks específicos para seus módulos
   - Manter apenas hooks genéricos em `src/hooks/`

### 11.2 Prioridade MÉDIA (Fase 4)

1. **Criar Pipeline Único de Processamento**
   - Criar `ReceiveIncomingMessageUseCase` em `modules/conversation/application/useCases/`
   - Fazer WebSocket e Supabase Webhook chamarem o mesmo pipeline
   - Implementar deduplicação centralizada
   - ✅ **IMPORTANTE:** Garantir que o pipeline suporte processamento de mídia (imagens/áudio)

2. **Preparar Estrutura para Envio de Mídia via WebSocket** (Futuro)
   - Implementar `WebSocketClient.sendImage()` em `WebSocketClient.ts`
   - Implementar `WebSocketClient.sendAudio()` em `WebSocketClient.ts`
   - Criar hooks `useSendImage()` e `useSendAudio()` em `modules/conversation/presentation/hooks/`
   - Atualizar `MessageInput.tsx` para usar WebSocket quando disponível (com fallback para Edge Functions)
   - **Estrutura recomendada:**
     ```
     modules/conversation/
     ├── application/
     │   └── useCases/
     │       ├── SendTextMessageUseCase.ts      ✅ (já existe via ConversationService)
     │       ├── SendImageMessageUseCase.ts     ⚠️ (criar)
     │       └── SendAudioMessageUseCase.ts    ⚠️ (criar)
     ├── infrastructure/
     │   └── websocket/
     │       └── WebSocketClient.ts
     │           ├── sendMessage()              ✅ (já existe)
     │           ├── sendImage()                ⚠️ (implementar)
     │           └── sendAudio()                ⚠️ (implementar)
     └── presentation/
         └── hooks/
             ├── useSendMessage.ts              ✅ (já existe)
             ├── useSendImage.ts                ⚠️ (criar)
             └── useSendAudio.ts                ⚠️ (criar)
     ```

3. **Remover Re-exports Desnecessários**
   - Avaliar se `src/hooks/useMessages.ts` e `src/hooks/useConversations.ts` são necessários
   - Atualizar imports se remover

### 11.3 Prioridade BAIXA (Fase 6)

1. **Limpar Documentação**
   - Revisar `docs/integrations/*.md`
   - Atualizar ou mover para `/deprecated/docs/`

2. **Remover Componente de Teste (se não necessário)**
   - `src/components/test/WebSocketTestPanel.tsx`
   - Rota `/test/websocket`

---

## 📊 RESUMO EXECUTIVO

### ✅ O QUE ESTÁ BOM

1. **Módulo Conversation:** Bem estruturado, seguindo padrão Modular Monolith
2. **Módulo Workspace:** Bem estruturado, seguindo padrão Modular Monolith
3. **WebSocket:** Implementado e funcionando para texto
4. **Supabase Webhook:** Implementado como fallback (processa mídia)
5. **Core Domain:** Bem organizado com entidades e ports
6. **Tipos WebSocket:** Já suportam attachments (preparado para mídia)

### ⚠️ O QUE PRECISA SER CORRIGIDO

1. **Kanban:** Fora do padrão modular (componentes e hooks em locais errados)
2. **Componentes WhatsApp:** Fora do módulo conversation
3. **Componentes Workspace:** Fora do módulo workspace
4. **Hooks Legados:** Muitos hooks em `src/hooks/` deveriam estar nos módulos
5. **Repositórios Duplicados:** `src/infra/supabase/` usado por Kanban

### ⚠️ FUNCIONALIDADES PENDENTES (A SEREM IMPLEMENTADAS)

1. **Envio de Imagem via WebSocket:** 
   - Atualmente usa Edge Function `whatsapp-send-image`
   - Falta implementar `WebSocketClient.sendImage()`
   - Falta criar `useSendImage()` hook

2. **Envio de Áudio via WebSocket:**
   - Atualmente usa Edge Function `whatsapp-send-audio`
   - Falta implementar `WebSocketClient.sendAudio()`
   - Falta criar `useSendAudio()` hook

**Nota:** A estrutura já está preparada (tipos suportam attachments), apenas falta implementar os métodos.

### ❌ O QUE NÃO FOI ENCONTRADO (JÁ REMOVIDO)

1. **Chat Engine por Webhook:** ✅ Já foi removido (não encontrado no código)

### 📈 PRÓXIMOS PASSOS

1. **FASE 2:** Confirmar padrão Modular Monolith e criar estrutura para Kanban
2. **FASE 3:** Limpar legado (já está limpo, apenas organizar)
3. **FASE 4:** Consolidar pipeline de processamento de mensagens (garantir suporte a mídia)
4. **FASE 5:** Migrar Kanban e componentes para módulos
5. **FASE 6:** Limpeza final e validação
6. **FUTURO:** Implementar envio de imagem/áudio via WebSocket (estrutura já preparada)

---

**FIM DO RELATÓRIO FASE 1**
