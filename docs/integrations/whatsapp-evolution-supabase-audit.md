# Auditoria: Integração WhatsApp Evolution API ↔ Supabase

**Data:** 2024-12-23  
**Versão:** 1.0  
**Status:** Fase 1 - Diagnóstico Completo

---

## Resumo Executivo

Esta auditoria analisa a integração entre Evolution API (hospedada em VPS) e o CRM Lovable via Supabase. A análise revelou que **a infraestrutura de webhook para recebimento de eventos da Evolution API não está implementada**. Existe o schema de banco de dados preparado, mas falta a Edge Function para processar webhooks.

### Estado Atual

| Componente | Status | Severidade |
|------------|--------|------------|
| Edge Function webhook | ❌ Não existe | **CRITICAL** |
| Schema DB (webhook_deliveries) | ✅ Existe | OK |
| Schema DB (messages/conversations) | ✅ Completo | OK |
| Secrets Evolution API | ✅ Configurados | OK |
| RLS Policies | ✅ Implementadas | OK |
| Realtime | ⚠️ Não configurado | Medium |
| Idempotência | ❌ Não implementada | High |
| Validação de assinatura | ❌ Não implementada | **CRITICAL** |

---

## 1. Diagrama de Fluxo (ASCII)

### Fluxo Esperado (A Implementar)

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
    │                    │  {event, data}     │                     │                 │
    │                    │ ─────────────────► │                     │                 │
    │                    │                    │                     │                 │
    │                    │                    │ ┌─────────────────┐ │                 │
    │                    │                    │ │ 1. Validar HMAC │ │                 │
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
│                           FLUXO OUTBOUND (Envio de Mensagem)                     │
└─────────────────────────────────────────────────────────────────────────────────┘

    CRM UI           Edge Function        Evolution API        WhatsApp
       │                   │                    │                  │
       │  Enviar msg       │                    │                  │
       │ ─────────────────►│                    │                  │
       │                   │                    │                  │
       │                   │  POST /message     │                  │
       │                   │  /sendText         │                  │
       │                   │ ──────────────────►│                  │
       │                   │                    │                  │
       │                   │                    │  Msg entregue    │
       │                   │                    │ ────────────────►│
       │                   │                    │                  │
       │                   │  {messageId, ack}  │                  │
       │                   │ ◄──────────────────│                  │
       │                   │                    │                  │
       │  UPDATE status    │                    │                  │
       │ ◄─────────────────│                    │                  │
```

---

## 2. Inventário de Recursos

### 2.1 Secrets Configurados (Supabase)

| Secret | Propósito | Status |
|--------|-----------|--------|
| `EVOLUTION_API_KEY` | Autenticação na Evolution API | ✅ Configurado |
| `EVOLUTION_BASE_URL` | URL base da VPS | ✅ Configurado |
| `EVOLUTION_AUTH_HEADER` | Header de autenticação | ✅ Configurado |
| `EVOLUTION_WEBHOOK_URL` | URL do webhook Supabase | ✅ Configurado |
| `EVOLUTION_CREATE_INSTANCE_PATH` | Endpoint criar instância | ✅ Configurado |
| `EVOLUTION_GET_QR_PATH` | Endpoint obter QR code | ✅ Configurado |
| `EVOLUTION_SET_WEBHOOK_PATH` | Endpoint configurar webhook | ✅ Configurado |

### 2.2 Edge Functions Existentes

| Function | Propósito | Webhook? |
|----------|-----------|----------|
| `send-invitation` | Envio de convites workspace | Não |
| `accept-invitation` | Aceitar convites workspace | Não |
| **`evolution-webhook`** | **Receber eventos Evolution** | **❌ NÃO EXISTE** |

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

---

## 3. Achados da Auditoria

### 3.1 CRITICAL: Edge Function de Webhook Não Existe

**Severidade:** 🔴 CRITICAL  
**Impacto:** Sistema não recebe mensagens do WhatsApp

**Situação Atual:**
- Os secrets estão configurados
- O schema de banco está pronto (`webhook_deliveries`, `messages`, etc.)
- **Não existe Edge Function para processar webhooks da Evolution API**

**Ação Requerida:**
Criar `/supabase/functions/evolution-webhook/index.ts`

```typescript
// Exemplo de implementação mínima
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-evolution-signature",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[WhatsAppWebhook][${requestId}] Received webhook`);

  try {
    // 1. Validar assinatura HMAC (ver seção 3.2)
    const signature = req.headers.get("x-evolution-signature");
    // TODO: Implementar validação

    // 2. Parse payload
    const payload = await req.json();
    const eventType = payload.event || "unknown";
    const instanceName = payload.instance || payload.instanceName;

    console.log(`[WhatsAppWebhook][${requestId}] Event: ${eventType}, Instance: ${instanceName}`);

    // 3. Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 4. Gerar delivery_key para idempotência
    const deliveryKey = payload.id || payload.key?.id || `${eventType}-${Date.now()}`;

    // 5. Verificar idempotência
    const { data: existingDelivery } = await supabase
      .from("webhook_deliveries")
      .select("id")
      .eq("delivery_key", deliveryKey)
      .maybeSingle();

    if (existingDelivery) {
      console.log(`[WhatsAppWebhook][${requestId}] Duplicate webhook, skipping`);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Buscar workspace por instance_name
    const { data: whatsappNumber } = await supabase
      .from("whatsapp_numbers")
      .select("id, workspace_id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (!whatsappNumber) {
      console.error(`[WhatsAppWebhook][${requestId}] Instance not found: ${instanceName}`);
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Registrar webhook_delivery
    await supabase.from("webhook_deliveries").insert({
      workspace_id: whatsappNumber.workspace_id,
      provider: "evolution",
      event_type: eventType,
      instance_name: instanceName,
      delivery_key: deliveryKey,
      payload: payload,
      headers: Object.fromEntries(req.headers.entries()),
      status: "processing",
    });

    // 8. Processar evento (ver seção Event Handlers)
    await processEvent(supabase, whatsappNumber, payload, eventType, requestId);

    // 9. Atualizar status
    await supabase
      .from("webhook_deliveries")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("delivery_key", deliveryKey);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[WhatsAppWebhook][${requestId}] Error:`, error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processEvent(supabase: any, whatsappNumber: any, payload: any, eventType: string, requestId: string) {
  switch (eventType) {
    case "messages.upsert":
      await handleInboundMessage(supabase, whatsappNumber, payload, requestId);
      break;
    case "messages.update":
      await handleMessageStatus(supabase, payload, requestId);
      break;
    case "connection.update":
      await handleConnectionUpdate(supabase, whatsappNumber, payload, requestId);
      break;
    default:
      console.log(`[WhatsAppWebhook][${requestId}] Unhandled event: ${eventType}`);
  }
}

// ... implementar handlers
```

---

### 3.2 CRITICAL: Validação de Assinatura Não Implementada

**Severidade:** 🔴 CRITICAL  
**Impacto:** Qualquer pessoa pode enviar webhooks falsos

**Ação Requerida:**
Implementar validação HMAC no webhook:

```typescript
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

async function validateSignature(req: Request, body: string): Promise<boolean> {
  const signature = req.headers.get("x-evolution-signature");
  const secret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  
  if (!signature || !secret) {
    console.error("[WhatsAppWebhook] Missing signature or secret");
    return false;
  }
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return signature === expectedSignature;
}
```

**Secret necessário:** Adicionar `EVOLUTION_WEBHOOK_SECRET` nos secrets do Supabase.

---

### 3.3 HIGH: Falta de Idempotência

**Severidade:** 🟠 HIGH  
**Impacto:** Mensagens duplicadas se webhook for reenviado

**Situação Atual:**
- Tabela `webhook_deliveries` tem campo `delivery_key`
- Não há lógica para verificar duplicatas

**Ação Requerida:**
1. Criar índice único em `delivery_key`:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_delivery_key 
ON webhook_deliveries(delivery_key);
```

2. Verificar antes de processar (já no exemplo acima)

---

### 3.4 MEDIUM: Índices de Performance Ausentes

**Severidade:** 🟡 MEDIUM  
**Impacto:** Queries lentas em volume alto

**Índices Recomendados:**

```sql
-- Para busca de mensagens por conversa
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

-- Para busca de mensagens por external_id (idempotência)
CREATE INDEX IF NOT EXISTS idx_messages_external_id 
ON messages(external_id) WHERE external_id IS NOT NULL;

-- Para busca de conversas por contato
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id 
ON conversations(contact_id);

-- Para busca de conversas por whatsapp_number
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp_number_id 
ON conversations(whatsapp_number_id);

-- Para ordenação de mensagens
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(conversation_id, created_at DESC);

-- Para webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status 
ON webhook_deliveries(status, received_at);
```

---

### 3.5 MEDIUM: Realtime Não Configurado

**Severidade:** 🟡 MEDIUM  
**Impacto:** UI não atualiza em tempo real

**Ação Requerida:**

```sql
-- Habilitar REPLICA IDENTITY para realtime
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Adicionar à publicação (se não existir)
-- Nota: verificar se supabase_realtime publication existe
```

No código React, adicionar listener:
```typescript
useEffect(() => {
  const channel = supabase
    .channel('messages-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `workspace_id=eq.${workspaceId}`
    }, (payload) => {
      console.log('[Realtime] New message:', payload.new);
      // Atualizar estado
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [workspaceId]);
```

---

### 3.6 LOW: Logs Estruturados Incompletos

**Severidade:** 🟢 LOW  
**Impacto:** Dificuldade de debugging

**Recomendação:**
- Todos os logs devem usar prefixo `[WhatsAppWebhook]`
- Incluir `request_id` em todos os logs
- Logs estruturados com metadata

---

## 4. Payloads Esperados da Evolution API

### 4.1 Mensagem Recebida (`messages.upsert`)

```json
{
  "event": "messages.upsert",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABC123DEF456"
    },
    "pushName": "Nome do Contato",
    "message": {
      "conversation": "Olá, gostaria de informações"
    },
    "messageType": "conversation",
    "messageTimestamp": 1703361600
  }
}
```

### 4.2 Status de Mensagem (`messages.update`)

```json
{
  "event": "messages.update",
  "instance": "minha-instancia",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "id": "ABC123DEF456"
    },
    "update": {
      "status": 3
    }
  }
}
```

Status codes:
- `1` = PENDING
- `2` = SENT (server_ack)
- `3` = DELIVERED (delivery_ack)
- `4` = READ (read)

### 4.3 Conexão (`connection.update`)

```json
{
  "event": "connection.update",
  "instance": "minha-instancia",
  "data": {
    "state": "open",
    "statusReason": 200
  }
}
```

---

## 5. Checklist de Testes Ponta-a-Ponta

### 5.1 Pré-requisitos
- [ ] Edge Function `evolution-webhook` deployada
- [ ] Secret `EVOLUTION_WEBHOOK_SECRET` configurado
- [ ] Instância Evolution conectada
- [ ] WhatsApp number cadastrado no DB

### 5.2 Testes Funcionais

| # | Teste | Comando/Ação | Resultado Esperado |
|---|-------|--------------|-------------------|
| 1 | Mensagem inbound simples | Enviar "Olá" via WhatsApp | Mensagem aparece em `messages`, conversa atualizada |
| 2 | Inbound com mídia (imagem) | Enviar foto via WhatsApp | `media_url` populado, `type`=image |
| 3 | Outbound do CRM | Enviar via UI do CRM | Mensagem enviada, status atualizado |
| 4 | Status delivered | Aguardar delivery ack | `status` = delivered |
| 5 | Status read | Destinatário visualiza | `status` = read |
| 6 | Idempotência | Reenviar mesmo webhook | Nenhuma duplicata criada |
| 7 | Payload inválido | Enviar JSON malformado | Erro 400, log de erro |
| 8 | Sem assinatura | Omitir header assinatura | Erro 401 |
| 9 | Assinatura inválida | Enviar assinatura errada | Erro 401 |
| 10 | Alta concorrência | 50 webhooks simultâneos | Todos processados, sem duplicatas |

### 5.3 Exemplos de cURL para Testes

**Mensagem Inbound:**
```bash
curl -X POST \
  'https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/evolution-webhook' \
  -H 'Content-Type: application/json' \
  -H 'x-evolution-signature: SEU_HMAC_AQUI' \
  -d '{
    "event": "messages.upsert",
    "instance": "NOME_DA_INSTANCIA",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST123"
      },
      "pushName": "Teste",
      "message": {"conversation": "Mensagem de teste"},
      "messageType": "conversation",
      "messageTimestamp": 1703361600
    }
  }'
```

**Status Update:**
```bash
curl -X POST \
  'https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/evolution-webhook' \
  -H 'Content-Type: application/json' \
  -H 'x-evolution-signature: SEU_HMAC_AQUI' \
  -d '{
    "event": "messages.update",
    "instance": "NOME_DA_INSTANCIA",
    "data": {
      "key": {"remoteJid": "5511999999999@s.whatsapp.net", "id": "TEST123"},
      "update": {"status": 3}
    }
  }'
```

---

## 6. Plano de Implementação por Fases

### Fase 1: Diagnóstico ✅ COMPLETO
- [x] Inventário de recursos
- [x] Mapeamento de fluxo
- [x] Identificação de gaps
- [x] Relatório de auditoria

### Fase 2: Segurança Mínima (Próximo)
- [ ] Criar Edge Function `evolution-webhook`
- [ ] Implementar validação HMAC
- [ ] Implementar idempotência
- [ ] Adicionar índice único em `delivery_key`
- [ ] Adicionar secret `EVOLUTION_WEBHOOK_SECRET`

### Fase 3: Robustez
- [ ] Implementar handlers para todos eventos
- [ ] Tratamento de mídia (download/storage)
- [ ] Normalização de status
- [ ] Retries com backoff

### Fase 4: Observabilidade
- [ ] Logs estruturados completos
- [ ] Tabela `integration_logs` (opcional)
- [ ] Alertas para falhas
- [ ] Métricas de volume/latência

---

## 7. Riscos se Não Corrigir

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Sistema não recebe mensagens | 100% | CRÍTICO | Implementar Edge Function |
| Webhook spoofing (fraude) | Alta | CRÍTICO | Validação HMAC |
| Mensagens duplicadas | Alta | ALTO | Idempotência |
| Vazamento de dados cross-tenant | Baixa | CRÍTICO | RLS está OK |
| Performance degradada | Média | MÉDIO | Índices |
| Debug impossível | Alta | MÉDIO | Logs estruturados |

---

## 8. Configuração Necessária no VPS (Evolution API)

Para completar a integração, configure na Evolution API:

```javascript
// Configurar webhook na instância
POST /webhook/set/{instance_name}
{
  "url": "https://tiaojwumxgdnobknlyqp.supabase.co/functions/v1/evolution-webhook",
  "webhook_by_events": true,
  "events": [
    "messages.upsert",
    "messages.update", 
    "connection.update",
    "qrcode.updated"
  ]
}
```

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
├─────────────────┤     │
│ id (PK)         │─────┘
│ workspace_id    │
│ name            │
│ phone           │
│ email           │
└─────────────────┘
```

### B. Headers Esperados no Webhook

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| `Content-Type` | `application/json` | Sim |
| `x-evolution-signature` | HMAC-SHA256 do body | Sim (após implementar) |
| `User-Agent` | `Evolution-API/x.x.x` | Não |

---

*Relatório gerado automaticamente. Revisão manual recomendada antes de implementar mudanças.*
