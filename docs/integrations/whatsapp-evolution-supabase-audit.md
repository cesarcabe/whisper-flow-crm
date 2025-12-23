# Auditoria: Integração WhatsApp Evolution API ↔ Supabase

**Data:** 2024-12-23  
**Última Atualização:** 2024-12-23  
**Versão:** 2.0  
**Status:** Fase 2 - Implementação Completa

---

## Resumo Executivo

Esta auditoria analisa a integração entre Evolution API (hospedada em VPS) e o CRM Lovable via Supabase. **As Edge Functions foram implementadas e estão funcionais.**

### Estado Atual

| Componente | Status | Severidade |
|------------|--------|------------|
| Edge Function `evolution-webhook` | ✅ Implementada | OK |
| Edge Function `whatsapp-create-instance` | ✅ Implementada | OK |
| Edge Function `whatsapp-get-qr` | ✅ Implementada | OK |
| Edge Function `provision-workspace` | ✅ Implementada | OK |
| Schema DB (webhook_deliveries) | ✅ Existe | OK |
| Schema DB (messages/conversations) | ✅ Completo | OK |
| Secrets Evolution API | ✅ Configurados | OK |
| RLS Policies | ✅ Implementadas | OK |
| Idempotência | ✅ Implementada | OK |
| Validação por API Key | ✅ Implementada | OK |
| Realtime | ⚠️ A configurar no frontend | Medium |

---

## 1. Diagrama de Fluxo (ASCII)

### Fluxo Inbound (Mensagem Recebida) - IMPLEMENTADO ✅

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO INBOUND (Mensagem Recebida)                      │
└─────────────────────────────────────────────────────────────────────────────────┘

 WhatsApp          Evolution API         Supabase Edge          Database          CRM UI
    │                  (VPS)               Function                                   │
    │                    │                    │                     │                 │
    │  Msg enviada       │                    │                     │                 │
    │ ─────────────────► │                    │                     │                 │
    │                    │                    │                     │                 │
    │                    │  POST /webhook     │                     │                 │
    │                    │  + x-api-key       │                     │                 │
    │                    │ ─────────────────► │                     │                 │
    │                    │                    │                     │                 │
    │                    │                    │ ┌─────────────────┐ │                 │
    │                    │                    │ │ 1. Validar Key  │ │                 │
    │                    │                    │ │ 2. Check Idempot│ │                 │
    │                    │                    │ │ 3. Parse Payload│ │                 │
    │                    │                    │ └────────┬────────┘ │                 │
    │                    │                    │          │          │                 │
    │                    │                    │          ▼          │                 │
    │                    │                    │  INSERT webhook_    │                 │
    │                    │                    │  deliveries         │                 │
    │                    │                    │ ─────────────────► │                 │
    │                    │                    │                     │                 │
    │                    │                    │  UPSERT contact     │                 │
    │                    │                    │ ─────────────────► │                 │
    │                    │                    │                     │                 │
    │                    │                    │  UPSERT conversation│                 │
    │                    │                    │ ─────────────────► │                 │
    │                    │                    │                     │                 │
    │                    │                    │  INSERT message     │                 │
    │                    │                    │ ─────────────────► │                 │
    │                    │                    │                     │                 │
    │                    │     200 OK         │                     │ Realtime        │
    │                    │ ◄───────────────── │                     │ ───────────────►│
    │                    │                    │                     │                 │


┌─────────────────────────────────────────────────────────────────────────────────┐
│                      FLUXO CRIAÇÃO DE INSTÂNCIA - IMPLEMENTADO ✅                │
└─────────────────────────────────────────────────────────────────────────────────┘

    CRM UI           whatsapp-create       Evolution API        Database
       │              -instance                  │                  │
       │                   │                     │                  │
       │  POST /create     │                     │                  │
       │  {workspace_id}   │                     │                  │
       │ ─────────────────►│                     │                  │
       │                   │                     │                  │
       │                   │  POST /instance/    │                  │
       │                   │  create             │                  │
       │                   │ ───────────────────►│                  │
       │                   │                     │                  │
       │                   │  {instanceName,     │                  │
       │                   │   qrcode, token}    │                  │
       │                   │ ◄───────────────────│                  │
       │                   │                     │                  │
       │                   │  INSERT whatsapp_   │                  │
       │                   │  numbers            │                  │
       │                   │ ─────────────────────────────────────►│
       │                   │                     │                  │
       │                   │  POST /webhook/set  │                  │
       │                   │ ───────────────────►│                  │
       │                   │                     │                  │
       │   {ok, instance}  │                     │                  │
       │ ◄─────────────────│                     │                  │
```

---

## 2. Inventário de Recursos

### 2.1 Secrets Configurados (Supabase) ✅

| Secret | Propósito | Status |
|--------|-----------|--------|
| `EVOLUTION_API_KEY` | Autenticação na Evolution API | ✅ Configurado |
| `EVOLUTION_BASE_URL` | URL base da VPS | ✅ Configurado |
| `EVOLUTION_AUTH_HEADER` | Header de autenticação | ✅ Configurado |
| `EVOLUTION_WEBHOOK_URL` | URL do webhook Supabase | ✅ Configurado |
| `EVOLUTION_CREATE_INSTANCE_PATH` | Endpoint criar instância | ✅ Configurado |
| `EVOLUTION_GET_QR_PATH` | Endpoint obter QR code | ✅ Configurado |
| `EVOLUTION_SET_WEBHOOK_PATH` | Endpoint configurar webhook | ✅ Configurado |

### 2.2 Edge Functions Implementadas ✅

| Function | Arquivo | Propósito | verify_jwt |
|----------|---------|-----------|------------|
| `evolution-webhook` | `supabase/functions/evolution-webhook/index.ts` | Receber eventos Evolution | OFF |
| `whatsapp-create-instance` | `supabase/functions/whatsapp-create-instance/index.ts` | Criar instância WhatsApp | OFF |
| `whatsapp-get-qr` | `supabase/functions/whatsapp-get-qr/index.ts` | Obter QR code | OFF |
| `provision-workspace` | `supabase/functions/provision-workspace/index.ts` | Criar workspace | OFF |
| `send-invitation` | `supabase/functions/send-invitation/index.ts` | Enviar convites | OFF |
| `accept-invitation` | `supabase/functions/accept-invitation/index.ts` | Aceitar convites | OFF |

### 2.3 Tabelas Relevantes

#### `whatsapp_numbers`
```sql
id, user_id, workspace_id, phone_number, status, webhook_url,
instance_name, api_key, provider, pipeline_preferential_id,
last_connected_at, last_qr, is_active, internal_name
```

#### `conversations`
```sql
id, contact_id, whatsapp_number_id, workspace_id, pipeline_id, 
stage_id, last_message_at, unread_count, is_typing
```

#### `messages`
```sql
id, conversation_id, whatsapp_number_id, workspace_id, body,
type, status, is_outgoing, media_url, external_id, error_message,
sent_by_user_id
```

#### `webhook_deliveries`
```sql
id, workspace_id, provider, event_type, instance_name,
delivery_key, payload, headers, status, error_message,
received_at, processed_at
```

#### `workspace_api_keys`
```sql
id, workspace_id, api_key, is_active, name, created_at, rotated_at
```

---

## 3. Funcionalidades Implementadas

### 3.1 Edge Function: `evolution-webhook`

**Localização:** `supabase/functions/evolution-webhook/index.ts`

**Funcionalidades:**
- ✅ Validação por API Key (header `x-api-key`)
- ✅ Idempotência via `delivery_key` (SHA-256 hash)
- ✅ Registro em `webhook_deliveries`
- ✅ Normalização de eventos (UPPERCASE → lowercase)
- ✅ Handler `connection.update` - atualiza status/QR
- ✅ Handler `messages.upsert` - cria contato/conversa/mensagem
- ✅ Handler `messages.update` - atualiza status mensagem
- ✅ Upsert de contatos por `workspace_id + phone`
- ✅ Upsert de conversas por `workspace_id + contact_id + whatsapp_number_id`
- ✅ Registro de eventos em `conversation_events`

**Eventos Suportados:**
| Evento Evolution | Evento Normalizado | Ação |
|------------------|-------------------|------|
| `CONNECTION_UPDATE` | `connection.update` | Atualiza `whatsapp_numbers.status` |
| `MESSAGES_UPSERT` | `messages.upsert` | Cria/atualiza contato, conversa, mensagem |
| `MESSAGES_UPDATE` | `messages.update` | Atualiza `messages.status` |
| `QRCODE_UPDATED` | `qrcode.updated` | (ignorado, usar `whatsapp-get-qr`) |

---

### 3.2 Edge Function: `whatsapp-create-instance`

**Localização:** `supabase/functions/whatsapp-create-instance/index.ts`

**Funcionalidades:**
- ✅ Validação de `workspace_id`
- ✅ Busca API Key do workspace
- ✅ Geração automática de `instance_name`
- ✅ Criação de instância na Evolution API
- ✅ Configuração automática de webhook na Evolution
- ✅ Registro em `whatsapp_numbers`

**Payload de Entrada:**
```json
{
  "workspace_id": "uuid",
  "phone_number": "5511999999999", // opcional
  "instance_name": "custom_name",   // opcional
  "instance_token": "custom_token"  // opcional
}
```

**Resposta:**
```json
{
  "ok": true,
  "workspace_id": "uuid",
  "instance_name": "ws_abc123_def456",
  "instance_token": "token_gerado",
  "phone_number": "5511999999999",
  "webhook": { "ok": true, "status": 200 },
  "evolution_create_response": { ... }
}
```

---

### 3.3 Edge Function: `whatsapp-get-qr`

**Localização:** `supabase/functions/whatsapp-get-qr/index.ts`

**Funcionalidades:**
- ✅ Busca instância por `workspace_id`
- ✅ Obtém QR code da Evolution API
- ✅ Atualiza `whatsapp_numbers.last_qr`
- ✅ Retorna QR code e pairing code

**Uso:**
```
GET /functions/v1/whatsapp-get-qr?workspace_id=UUID
```

**Resposta:**
```json
{
  "ok": true,
  "instance_name": "ws_abc123",
  "pairingCode": "XXXX-XXXX",
  "code": "base64_qr_image",
  "count": 1
}
```

---

### 3.4 Edge Function: `provision-workspace`

**Localização:** `supabase/functions/provision-workspace/index.ts`

**Funcionalidades:**
- ✅ Autenticação via JWT
- ✅ Criação de workspace
- ✅ Criação de membership (owner)
- ✅ Geração de API Key
- ✅ Seed de pipeline/stages iniciais

---

## 4. Segurança Implementada

### 4.1 Autenticação por API Key

O webhook usa `x-api-key` header para identificar o workspace:

```typescript
const apiKey = getHeader(req, "x-api-key");
if (!apiKey) return json({ code: 401, message: "Missing x-api-key" }, 401);

const { data: wsKey } = await supabase
  .from("workspace_api_keys")
  .select("workspace_id, is_active")
  .eq("api_key", apiKey)
  .eq("is_active", true)
  .maybeSingle();
```

### 4.2 Idempotência

Implementada via `delivery_key` usando SHA-256:

```typescript
async function makeDeliveryKey(provider, eventType, instanceName, bodyText, providerEventId) {
  const base = `${provider}:${eventType}:${instanceName}:`;
  if (providerEventId) return base + providerEventId;
  return base + (await sha256Hex(bodyText));
}
```

Verificação antes de processar:
```typescript
const { error: deliveryErr } = await supabase
  .from("webhook_deliveries")
  .insert({ delivery_key: deliveryKey, ... });

if (deliveryErr?.message?.includes("duplicate")) {
  return json({ ok: true, idempotent: true });
}
```

### 4.3 RLS Policies

Todas as tabelas têm RLS habilitado com policies baseadas em `is_workspace_member()`.

---

## 5. Configuração na Evolution API

### 5.1 Webhook Automático

A função `whatsapp-create-instance` configura o webhook automaticamente:

```json
POST /webhook/set/{instanceName}
{
  "webhook": {
    "enabled": true,
    "url": "https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/evolution-webhook",
    "webhook_by_events": true,
    "webhook_base64": true,
    "events": ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
    "headers": { "x-api-key": "WORKSPACE_API_KEY" }
  }
}
```

---

## 6. Testes Recomendados

### 6.1 Teste de Criação de Instância

```bash
curl -X POST \
  'https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/whatsapp-create-instance' \
  -H 'Content-Type: application/json' \
  -d '{"workspace_id": "SEU_WORKSPACE_ID"}'
```

### 6.2 Teste de QR Code

```bash
curl 'https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/whatsapp-get-qr?workspace_id=SEU_WORKSPACE_ID'
```

### 6.3 Teste de Webhook (Simulado)

```bash
curl -X POST \
  'https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/evolution-webhook' \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: SUA_WORKSPACE_API_KEY' \
  -d '{
    "event": "MESSAGES_UPSERT",
    "instance": "NOME_DA_INSTANCIA",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST123"
      },
      "pushName": "Teste",
      "message": {"conversation": "Mensagem de teste"}
    }
  }'
```

---

## 7. Checklist de Validação

### 7.1 Edge Functions ✅
- [x] `evolution-webhook` - Recebe e processa webhooks
- [x] `whatsapp-create-instance` - Cria instâncias
- [x] `whatsapp-get-qr` - Obtém QR code
- [x] `provision-workspace` - Cria workspaces

### 7.2 Segurança ✅
- [x] Validação por API Key
- [x] Idempotência implementada
- [x] RLS policies ativas
- [x] Webhook configurado com headers seguros

### 7.3 Pendentes
- [ ] Configurar Realtime no frontend para atualização automática
- [ ] Adicionar índices de performance (opcional)
- [ ] Implementar envio de mensagens (outbound)
- [ ] Handler para mídia (imagens, áudio, documentos)

---

## 8. Próximos Passos

### Fase 3: Frontend Integration
1. Criar componente de conexão WhatsApp
2. Exibir QR code para pareamento
3. Listar conversas/mensagens
4. Implementar Realtime listeners

### Fase 4: Outbound Messages
1. Criar Edge Function `whatsapp-send-message`
2. Integrar com Evolution API `/message/sendText`
3. Atualizar status via webhooks

### Fase 5: Mídia
1. Handler para mensagens com mídia
2. Upload para Supabase Storage
3. Exibição no chat

---

## Anexos

### A. Diagrama ER Simplificado

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ whatsapp_numbers│      │  conversations  │      │    messages     │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK)         │◄────┐│ id (PK)         │◄────┐│ id (PK)         │
│ workspace_id    │     ││ contact_id (FK) │     ││ conversation_id │
│ instance_name   │     ││ whatsapp_number │─────┘│ external_id     │
│ phone_number    │     ││ workspace_id    │      │ body            │
│ status          │     ││ stage_id        │      │ status          │
│ api_key         │     ││ pipeline_id     │      │ type            │
└─────────────────┘     ││ last_message_at │      │ is_outgoing     │
                        │└─────────────────┘      │ media_url       │
┌─────────────────┐     │                         └─────────────────┘
│    contacts     │     │
├─────────────────┤     │      ┌─────────────────┐
│ id (PK)         │─────┘      │workspace_api_keys│
│ workspace_id    │            ├─────────────────┤
│ name            │            │ id (PK)         │
│ phone           │            │ workspace_id    │
│ email           │            │ api_key         │
└─────────────────┘            │ is_active       │
                               └─────────────────┘
```

### B. Headers do Webhook

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `x-api-key` | API Key do workspace | Sim |
| `User-Agent` | `Evolution-API/x.x.x` | Não |

### C. Status de Mensagens

| Código | Status | Descrição |
|--------|--------|-----------|
| 1 | PENDING | Aguardando envio |
| 2 | SENT | Enviado ao servidor |
| 3 | DELIVERED | Entregue ao destinatário |
| 4 | READ | Lido pelo destinatário |

---

*Relatório atualizado em 2024-12-23. Edge Functions implementadas e funcionais.*
