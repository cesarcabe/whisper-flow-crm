# Diagnóstico: Classificação e Identificação de Conversas e Contatos
## Problema: remoteJid @lid, Grupos @g.us e participant

**Data:** 2026-01-25  
**Módulo:** Evolution API Webhook Handler  
**Objetivo:** Documentar como o sistema atualmente classifica conversas/contatos e identificar problemas com @lid, grupos e participant

---

## A) HANDLERS DO WEBHOOK EVOLUTION

### Arquivos e Funções Encontradas

#### 1. **Entry Point - Webhook Handler**
**Arquivo:** `supabase/functions/evolution-webhook/index.ts`

- **Função principal:** `Deno.serve(async (req: Request))`
- **Linhas críticas:**
  - `89-95`: Extração de `providerEventId` (tenta `data.id`, `data.messageId`, `data.key.id`, `data.message.key`)
  - `98`: Geração de `deliveryKey` para idempotência
  - `146-148`: Roteamento para `handleMessage` quando `eventType === "messages.upsert"` ou `"messages.update"`

#### 2. **Handler de Mensagens**
**Arquivo:** `supabase/functions/evolution-webhook/handlers/handleMessage.ts`

- **Função:** `handleMessage(ctx: WebhookContext)`
- **Linhas críticas:**
  - `26-32`: Extração de `remoteJid` (tenta `key.remoteJid`, `data.remoteJid`, `data.from`, `data.sender`, `message.key.remoteJid`)
  - `34`: Normalização de `phone` via `normalizePhone(remoteJid)` - **PROBLEMA: @lid não gera phone válido**
  - `40`: Extração de `isFromMe` de `key.fromMe`
  - `42-48`: Extração de `pushName`
  - `57`: Verificação de grupo (`!remoteJid?.endsWith('@g.us')`) para buscar avatar
  - `61`: Criação/atualização de contato via `upsertContact(workspaceId, phone, pushName, avatarUrl)`
  - `62`: Criação/atualização de conversa via `upsertConversation(workspaceId, contactId, wa.id, remoteJid)`
  - `74-91`: Tratamento de `messages.update` - atualiza status por `external_id = providerEventId`
  - `133-143`: Inserção de mensagem em `messages.upsert`

#### 3. **Serviço de Conversas**
**Arquivo:** `supabase/functions/evolution-webhook/services/conversationService.ts`

- **Função:** `upsertConversation(supabase, workspaceId, contactId, whatsappNumberId, remoteJid)`
- **Lógica atual:**
  - `10`: Detecta grupo: `isGroup = remoteJid?.endsWith('@g.us')`
  - `14-23`: Busca conversa existente por `remote_jid` (workspace_id + whatsapp_number_id + remote_jid)
  - `25-34`: Se não encontrou por `remote_jid`, busca por `contact_id` (workspace_id + contact_id + whatsapp_number_id)
  - `36-44`: Se encontrou e `remote_jid` estava NULL, atualiza com o `remoteJid` recebido
  - `47-60`: Cria nova conversa se não encontrou nenhuma

**PROBLEMAS IDENTIFICADOS:**
- ❌ Não verifica `remoteJidAlt` (LID quando vem PN)
- ❌ Não cria aliases entre PN e LID
- ❌ Busca por `contact_id` pode retornar conversa errada se o mesmo contato tiver PN e LID
- ❌ Não trata `participant` em grupos

#### 4. **Serviço de Contatos**
**Arquivo:** `supabase/functions/evolution-webhook/services/contactService.ts`

- **Função:** `upsertContact(supabase, workspaceId, phone, pushName, avatarUrl)`
- **Lógica atual:**
  - `64-69`: Busca contato existente por `workspace_id + phone`
  - `71-94`: Se encontrou, atualiza `name` e `avatar_url` se necessário
  - `111-124`: Cria novo contato se não encontrou

**PROBLEMAS IDENTIFICADOS:**
- ❌ `phone` vem de `normalizePhone(remoteJid)` que falha para `@lid` (retorna `null`)
- ❌ Não cria contato quando `remoteJid` é `@lid` sem telefone
- ❌ Não associa múltiplos `remoteJid` (PN e LID) ao mesmo contato

#### 5. **Normalização**
**Arquivo:** `supabase/functions/evolution-webhook/utils/normalize.ts`

- **Função:** `normalizePhone(raw: string | null): string | null`
  - `1-6`: Remove caracteres não numéricos, retorna `null` se < 8 dígitos
  - **PROBLEMA:** `"103208533893348@lid"` → remove `@lid` → `"103208533893348"` → retorna o número, mas não identifica como LID
  - **PROBLEMA:** `"5511972491690@s.whatsapp.net"` → remove `@s.whatsapp.net` → `"5511972491690"` → OK

---

## B) COMO O SISTEMA CRIA/IDENTIFICA UMA CONVERSA HOJE

### Fluxo Atual (messages.upsert)

```
1. handleMessage recebe evento
2. Extrai remoteJid de key.remoteJid (ou fallbacks)
3. Normaliza phone = normalizePhone(remoteJid)
   → Se remoteJid = "103208533893348@lid": phone = "103208533893348" (OK, mas perde informação de LID)
   → Se remoteJid = "5511972491690@s.whatsapp.net": phone = "5511972491690" (OK)
4. Se phone é null → IGNORA evento (retorna "ignored")
5. upsertContact(workspaceId, phone, pushName, avatarUrl)
   → Busca contato por workspace_id + phone
   → Cria/atualiza contato
6. upsertConversation(workspaceId, contactId, wa.id, remoteJid)
   → Busca conversa por workspace_id + whatsapp_number_id + remote_jid
   → Se não encontrou, busca por workspace_id + contact_id + whatsapp_number_id
   → Cria conversa com remote_jid, is_group
```

### Campos Usados para Identificação

1. **Conversa (conversations):**
   - **Chave primária de busca:** `workspace_id + whatsapp_number_id + remote_jid`
   - **Chave secundária:** `workspace_id + contact_id + whatsapp_number_id`
   - **Campos armazenados:**
     - `id` (UUID)
     - `workspace_id` (UUID)
     - `contact_id` (UUID) - FK para contacts
     - `whatsapp_number_id` (UUID) - FK para whatsapp_numbers
     - `remote_jid` (TEXT) - **Armazena o remoteJid completo** (ex: "5511972491690@s.whatsapp.net" ou "103208533893348@lid")
     - `is_group` (BOOLEAN) - Detectado por `remoteJid.endsWith('@g.us')`

2. **Contato (contacts):**
   - **Chave de busca:** `workspace_id + phone`
   - **Campos armazenados:**
     - `id` (UUID)
     - `workspace_id` (UUID)
     - `phone` (TEXT) - **Apenas dígitos** (ex: "5511972491690")
     - `name` (TEXT) - pushName ou phone
     - `avatar_url` (TEXT)

### Distinção DM vs Grupo

- ✅ **Detecta grupo:** `remoteJid.endsWith('@g.us')` → `is_group = true`
- ❌ **NÃO trata participant:** Em grupos, quem envia é `participant`, mas o código não extrai esse campo
- ❌ **NÃO diferencia remetente em grupo:** Todas mensagens de grupo ficam associadas ao mesmo `contact_id` (do grupo)

### Lógica de Canonicalização (PN vs LID)

- ❌ **NÃO EXISTE canonicalização**
- ❌ **NÃO verifica `remoteJidAlt`** (campo que vem em messages.upsert com o LID quando remoteJid é PN)
- ❌ **NÃO cria aliases** entre PN e LID
- ❌ **Cria conversas duplicadas:** Se receber primeiro evento com PN e depois com LID (ou vice-versa), cria 2 conversas diferentes

### Dedupe para Evitar Duplicatas

- ✅ **Existe dedupe por `remote_jid`:** Busca conversa por `workspace_id + whatsapp_number_id + remote_jid`
- ❌ **NÃO dedupe PN vs LID:** Se remoteJid mudar de PN para LID (ou vice-versa), cria nova conversa
- ❌ **Dedupe por `contact_id` é falho:** Se o mesmo contato tiver PN e LID, pode criar 2 contatos diferentes (se `normalizePhone` gerar phones diferentes)

---

## C) COMO O SISTEMA IDENTIFICA "QUEM ENVIOU" A MENSAGEM

### DM (Direct Message)

- **Campo usado:** `remoteJid` (ex: "5511972491690@s.whatsapp.net")
- **Fluxo:**
  1. `remoteJid` → `normalizePhone()` → `phone`
  2. `upsertContact(phone)` → `contactId`
  3. `upsertConversation(contactId, remoteJid)` → `conversationId`
  4. Mensagem inserida com `conversation_id = conversationId`, `is_outgoing = key.fromMe`

- ✅ **Funciona para DM com PN**
- ❌ **Falha para DM com LID:** Se `normalizePhone` retornar `null` (caso raro), ignora evento
- ❌ **NÃO trata `remoteJidAlt`:** Se vier PN + LID, usa apenas o PN

### Grupo (@g.us)

- **Campo usado:** `remoteJid` (grupo) + **NÃO usa `participant`**
- **Fluxo atual:**
  1. `remoteJid = "120363123456789012@g.us"` (grupo)
  2. `normalizePhone(remoteJid)` → `phone = "120363123456789012"` (número do grupo)
  3. `upsertContact(phone)` → Cria contato com phone do grupo
  4. `upsertConversation(contactId, remoteJid)` → Cria conversa com `is_group = true`
  5. Mensagem inserida com `conversation_id` do grupo

- ❌ **PROBLEMA CRÍTICO:** `participant` (quem enviou no grupo) **NÃO É EXTRAÍDO**
- ❌ **Todas mensagens de grupo ficam com o mesmo `contact_id`** (do grupo, não do participante)
- ❌ **`is_outgoing` usa `key.fromMe`** (se eu enviei), mas não identifica quem mais enviou

### Se participant vier vazio

- ❌ **Código atual não verifica `participant`**
- ❌ **Em DM, `participant` geralmente vem vazio** (correto, mas código não trata)
- ❌ **Em grupo, `participant` deveria ter o remetente, mas código ignora**

### Onde salva pushName

- **Tabela:** `contacts.name`
- **Fluxo:**
  1. Extrai `pushName` de `data.pushName`, `message.pushName`, `data.contact.name`, `data.contact.pushname`
  2. Se `isFromMe = true`, `pushName = null`
  3. `upsertContact(phone, pushName, avatarUrl)` → salva em `contacts.name`
- ✅ **Funciona para DM**
- ❌ **Em grupos, salva pushName do grupo, não do participant**

---

## D) COMO O SISTEMA ATUALIZA STATUS DE MENSAGEM (DELIVERY_ACK/READ)

### messages.update - Fluxo Atual

**Arquivo:** `supabase/functions/evolution-webhook/handlers/handleMessage.ts` (linhas 74-91)

```typescript
if (eventType === "messages.update") {
  const update = data?.update as Record<string, unknown> | undefined;
  const newStatus = safeString(
    data?.status ?? data?.ack ?? message?.status ?? update?.status ?? null
  ) ?? null;

  if (providerEventId) {
    await supabase
      .from("messages")
      .update({ status: newStatus })
      .eq("workspace_id", workspaceId)
      .eq("whatsapp_number_id", wa.id)
      .eq("external_id", providerEventId);
  }
  // ...
}
```

### Chave de Busca para Update

- **Campos usados:**
  1. `workspace_id` (do workspace da instância)
  2. `whatsapp_number_id` (da instância)
  3. `external_id` = `providerEventId`

- **Como `providerEventId` é extraído:**
  - `index.ts` linhas 89-95:
    ```typescript
    const providerEventId =
      safeString(data?.id) ??
      safeString(data?.messageId) ??
      safeString((data?.key as Record<string, unknown>)?.id) ??
      safeString((data?.message as Record<string, unknown>)?.key) ??
      null;
    ```

### Dependência de remoteJid

- ✅ **Update NÃO depende de `remoteJid`** - usa apenas `external_id` (messageId)
- ✅ **Isso é correto** - messageId é único e não muda

### Risco de Update em Conversa Diferente (PN vs LID)

- ⚠️ **RISCO BAIXO:** Como update usa apenas `external_id`, não depende de `remoteJid`
- ⚠️ **RISCO MÉDIO:** Se a mensagem original foi inserida com `external_id` em uma conversa (PN) e o update vier com `remoteJid` diferente (LID), o update ainda funciona porque busca por `external_id`
- ❌ **PROBLEMA:** Se a mensagem original não foi inserida (porque `remoteJid` era `@lid` e `normalizePhone` falhou), o update não encontra a mensagem

### Exemplo do Problema

**Cenário 1: messages.upsert com LID**
```
1. Evento: remoteJid = "103208533893348@lid", messageId = "ABC123"
2. normalizePhone("103208533893348@lid") = "103208533893348" (OK)
3. Cria contato com phone = "103208533893348"
4. Cria conversa com remote_jid = "103208533893348@lid"
5. Insere mensagem com external_id = "ABC123"
```

**Cenário 2: messages.update com LID**
```
1. Evento: remoteJid = "103208533893348@lid", messageId = "ABC123", status = "READ"
2. normalizePhone("103208533893348@lid") = "103208533893348" (OK)
3. Busca mensagem por external_id = "ABC123" → ENCONTRA ✅
4. Atualiza status → OK ✅
```

**Cenário 3: messages.update com LID (sem telefone válido)**
```
1. Evento: remoteJid = "103208533893348@lid", messageId = "ABC123", status = "READ"
2. normalizePhone("103208533893348@lid") = "103208533893348" (OK, mas se fosse outro formato poderia falhar)
3. Se normalizePhone retornasse null, evento seria ignorado ANTES de chegar no update
4. Update nunca executaria ❌
```

---

## E) AUDITORIA DO BANCO DE DADOS

### Tabelas Envolvidas

#### 1. **conversations**
**Migration:** `20251211223111_11740b66-b3d8-4235-9ee3-73d038fdf21c.sql` (criação) + `20251224132755_20489eaf-e542-4528-b85b-b174595bb92e.sql` (remote_jid)

**Colunas relevantes:**
- `id` (UUID, PK)
- `workspace_id` (UUID, FK → workspaces) - **Adicionado em migration posterior**
- `contact_id` (UUID, FK → contacts)
- `whatsapp_number_id` (UUID, FK → whatsapp_numbers)
- `remote_jid` (TEXT, nullable) - **Adicionado em 20251224132755**
- `is_group` (BOOLEAN, default false) - **Adicionado em 20251224132755**
- `last_message_at` (TIMESTAMP)
- `unread_count` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

**Índices:**
- `idx_conversations_remote_jid` ON `(workspace_id, remote_jid)` - **Migration 20251224132755**
- `idx_conversations_contact_id` ON `(contact_id)`
- **NÃO existe UNIQUE constraint** para `(workspace_id, whatsapp_number_id, remote_jid)`

#### 2. **contacts**
**Migration:** `20251211223111_11740b66-b3d8-4235-9ee3-73d038fdf21c.sql`

**Colunas relevantes:**
- `id` (UUID, PK)
- `workspace_id` (UUID, FK → workspaces) - **Adicionado em migration posterior**
- `user_id` (UUID, FK → users) - **Legado, mantido para compatibilidade**
- `phone` (TEXT, NOT NULL) - **Apenas dígitos**
- `name` (TEXT, NOT NULL) - pushName ou phone
- `avatar_url` (TEXT, nullable)
- `status` (TEXT, default 'active')
- `created_at`, `updated_at` (TIMESTAMP)

**Índices:**
- `idx_contacts_user_id` ON `(user_id)` - **Legado**
- **NÃO existe índice** em `(workspace_id, phone)`
- **NÃO existe UNIQUE constraint** para `(workspace_id, phone)`

#### 3. **messages**
**Migration:** `20251211223111_11740b66-b3d8-4235-9ee3-73d038fdf21c.sql`

**Colunas relevantes:**
- `id` (UUID, PK)
- `workspace_id` (UUID) - **Adicionado em migration posterior**
- `conversation_id` (UUID, FK → conversations)
- `whatsapp_number_id` (UUID, FK → whatsapp_numbers)
- `external_id` (TEXT, nullable) - **messageId do Evolution**
- `body` (TEXT, NOT NULL)
- `type` (TEXT, default 'text')
- `status` (TEXT, default 'sending')
- `is_outgoing` (BOOLEAN, default true)
- `media_url` (TEXT, nullable)
- `created_at` (TIMESTAMP)

**Índices:**
- `idx_messages_conversation_id` ON `(conversation_id)`
- `uq_messages_external_id` UNIQUE ON `(workspace_id, external_id)` WHERE `external_id IS NOT NULL` - **Migration 20251224132755**
- ✅ **Existe UNIQUE constraint** para evitar duplicatas de mensagem

#### 4. **conversation_events** (se existir)
**Status:** Tabela referenciada no código (`handleMessage.ts` linha 64) mas **NÃO encontrada nas migrations**

**Uso no código:**
```typescript
await supabase.from("conversation_events").insert({
  workspace_id: workspaceId,
  conversation_id: conversationId,
  provider: "evolution",
  event_type: eventType,
  provider_event_id: providerEventId,
  metadata: { raw: data },
});
```

**Possível estrutura (inferida do código):**
- `id` (UUID, PK)
- `workspace_id` (UUID)
- `conversation_id` (UUID, FK → conversations)
- `provider` (TEXT) - "evolution"
- `event_type` (TEXT) - "messages.upsert", "messages.update", etc.
- `provider_event_id` (TEXT, nullable)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

**⚠️ TABELA PODE NÃO EXISTIR** - pode causar erro em runtime

#### 5. **webhook_deliveries** (idempotência)
**Status:** Usada no código, estrutura não verificada nas migrations analisadas

**Uso no código:**
- `insertDelivery()` - insere delivery com `delivery_key` (hash do evento)
- `markDelivery()` - marca delivery como "processed", "ignored", "failed"

### Tabela de Aliases

- ❌ **NÃO EXISTE tabela `conversation_aliases`**
- ❌ **NÃO EXISTE tabela `contact_aliases`**
- ❌ **NÃO existe mecanismo para associar PN e LID ao mesmo contato/conversa**

### Constraints UNIQUE/INDEX

#### Conversas
- ✅ `idx_conversations_remote_jid` ON `(workspace_id, remote_jid)` - **Existe**
- ❌ **NÃO existe UNIQUE** em `(workspace_id, whatsapp_number_id, remote_jid)` - **Permite duplicatas se inserir manualmente**
- ❌ **NÃO existe índice** considerando `remoteJidAlt`

#### Contatos
- ❌ **NÃO existe UNIQUE** em `(workspace_id, phone)` - **Permite contatos duplicados**
- ❌ **NÃO existe índice** em `(workspace_id, phone)` - **Busca pode ser lenta**

#### Mensagens
- ✅ `uq_messages_external_id` UNIQUE ON `(workspace_id, external_id)` - **Existe e funciona**

---

## F) DIAGNÓSTICO FINAL

### Por que messages.update com remoteJid @lid ficam "sem identificação"?

**Causa raiz:**

1. **Em `handleMessage.ts` linha 34-38:**
   ```typescript
   const phone = normalizePhone(remoteJid);
   if (!phone) {
     await markDelivery(supabase, deliveryId, "ignored", "Could not extract phone from payload");
     return json({ ok: true, ignored: true });
   }
   ```
   - Se `normalizePhone("103208533893348@lid")` retornar `null` (caso raro, mas possível se formato for diferente), o evento é **ignorado ANTES** de chegar no bloco de `messages.update`
   - O update nunca executa

2. **Mas normalmente funciona:**
   - `normalizePhone("103208533893348@lid")` remove `@lid` e retorna `"103208533893348"` (OK)
   - O problema real é que **não há tratamento específico para LID**
   - O sistema trata LID como se fosse um número de telefone normal

3. **Problema de identificação:**
   - Se o contato foi criado com phone extraído de LID, pode não corresponder ao contato real (se houver PN também)
   - Duas conversas podem existir: uma com `remote_jid = "5511972491690@s.whatsapp.net"` e outra com `remote_jid = "143899154722944@lid"`

### Em quais pontos o sistema cria conversa duplicada (PN e LID como duas conversas)?

**Pontos confirmados:**

1. **messages.upsert com PN primeiro:**
   ```
   Evento 1: remoteJid = "5511972491690@s.whatsapp.net", remoteJidAlt = "143899154722944@lid"
   → normalizePhone("5511972491690@s.whatsapp.net") = "5511972491690"
   → Cria contato com phone = "5511972491690"
   → Cria conversa com remote_jid = "5511972491690@s.whatsapp.net"
   → remoteJidAlt é IGNORADO ❌
   ```

2. **messages.upsert com LID depois:**
   ```
   Evento 2: remoteJid = "143899154722944@lid" (sem remoteJidAlt)
   → normalizePhone("143899154722944@lid") = "143899154722944"
   → Cria contato com phone = "143899154722944" (DIFERENTE do anterior)
   → Busca conversa por remote_jid = "143899154722944@lid" → NÃO ENCONTRA
   → Busca conversa por contact_id → NÃO ENCONTRA (contact_id diferente)
   → Cria NOVA conversa com remote_jid = "143899154722944@lid" ❌
   → DUPLICATA CRIADA
   ```

3. **messages.update com LID:**
   ```
   Evento: remoteJid = "103208533893348@lid", messageId = "ABC123"
   → normalizePhone("103208533893348@lid") = "103208533893348"
   → Busca contato por phone = "103208533893348"
   → Se não existir, cria novo contato
   → Busca conversa por remote_jid = "103208533893348@lid"
   → Se não existir, cria nova conversa
   → Update da mensagem funciona (por external_id), mas conversa pode estar errada
   ```

### Como isso afeta o status (READ/DELIVERY_ACK)?

**Impacto:**

1. **Update funciona (por external_id):**
   - ✅ Update busca mensagem por `external_id` (messageId), não por `remoteJid`
   - ✅ Se a mensagem foi inserida corretamente, o update encontra e atualiza

2. **Mas pode atualizar mensagem na conversa errada:**
   - ⚠️ Se houver 2 conversas (PN e LID) e a mensagem foi inserida na conversa PN, mas o update vier com LID:
     - Update busca por `external_id` → encontra mensagem na conversa PN ✅
     - Mas o código também busca/ cria conversa com LID (linha 62) → pode criar conversa duplicada ❌

3. **Status não é afetado diretamente:**
   - O status é atualizado corretamente na mensagem
   - O problema é a **organização das conversas** (duplicatas)

---

## MAPA DO FLUXO ATUAL

### Fluxo: messages.upsert

```
1. evolution-webhook/index.ts
   ├─ Recebe POST
   ├─ Valida API key → workspace_id
   ├─ Extrai eventType, instanceName, data
   ├─ Extrai providerEventId (data.id, data.messageId, data.key.id, etc.)
   ├─ Gera deliveryKey para idempotência
   ├─ Insere webhook_deliveries
   └─ Roteia para handleMessage (se messages.upsert)

2. handleMessage.ts
   ├─ ensureWhatsappNumber(instanceName) → wa (workspace_id, id)
   ├─ Extrai remoteJid (key.remoteJid, data.remoteJid, etc.)
   ├─ normalizePhone(remoteJid) → phone
   │  └─ Se phone = null → IGNORA evento ❌
   ├─ Extrai isFromMe (key.fromMe)
   ├─ Extrai pushName (data.pushName, message.pushName, etc.)
   ├─ fetchProfilePicture() (se não for grupo)
   ├─ upsertContact(workspaceId, phone, pushName, avatarUrl)
   │  └─ Busca contato por workspace_id + phone
   │  └─ Cria/atualiza contato
   ├─ upsertConversation(workspaceId, contactId, wa.id, remoteJid)
   │  └─ Busca conversa por workspace_id + whatsapp_number_id + remote_jid
   │  └─ Se não encontrou, busca por workspace_id + contact_id + whatsapp_number_id
   │  └─ Cria conversa se não encontrou
   ├─ Insere conversation_events (se tabela existir)
   ├─ Extrai texto/mídia da mensagem
   ├─ downloadAndStoreMedia() (se necessário)
   └─ Insere mensagem em messages
      └─ external_id = providerEventId
      └─ conversation_id = conversationId
      └─ status = "sent" (se fromMe) ou "delivered"
```

### Fluxo: messages.update

```
1. evolution-webhook/index.ts
   └─ (mesmo fluxo até roteamento)

2. handleMessage.ts
   ├─ ensureWhatsappNumber(instanceName) → wa
   ├─ Extrai remoteJid
   ├─ normalizePhone(remoteJid) → phone
   │  └─ Se phone = null → IGNORA evento ❌
   ├─ upsertContact() → contactId
   ├─ upsertConversation() → conversationId
   ├─ Insere conversation_events
   ├─ if (eventType === "messages.update")
   │  ├─ Extrai newStatus (data.status, data.ack, etc.)
   │  └─ Update messages
   │     └─ WHERE workspace_id + whatsapp_number_id + external_id = providerEventId
   │     └─ SET status = newStatus
   └─ markDelivery("processed")
```

**Observações:**
- ⚠️ `messages.update` também chama `upsertContact` e `upsertConversation` (linhas 61-62) - **pode criar contato/conversa desnecessariamente**
- ⚠️ Se `remoteJid` for `@lid` e `normalizePhone` falhar, update nunca executa

---

## CHECKLIST DO QUE PRECISA SER ALTERADO

### ✅ Suporte a DM PN + LID (aliases)

- [ ] **Criar tabela `conversation_aliases`** ou `contact_aliases`
  - Campos: `id`, `workspace_id`, `contact_id` (ou `conversation_id`), `remote_jid` (PN ou LID), `type` ('pn' ou 'lid'), `created_at`
  - Índice UNIQUE em `(workspace_id, remote_jid)`

- [ ] **Modificar `upsertContact` para aceitar múltiplos remoteJid**
  - Receber `remoteJid` e `remoteJidAlt`
  - Buscar contato por qualquer um dos dois
  - Criar/atualizar aliases

- [ ] **Modificar `upsertConversation` para usar aliases**
  - Buscar conversa por `remote_jid` OU por alias
  - Se encontrar por alias, usar a conversa existente
  - Criar alias se receber `remoteJidAlt`

- [ ] **Modificar `handleMessage` para extrair `remoteJidAlt`**
  - Extrair `key.remoteJidAlt` ou `data.remoteJidAlt`
  - Passar para `upsertContact` e `upsertConversation`

- [ ] **Canonicalização: escolher PN como "principal"**
  - Se receber PN e LID, usar PN como `remote_jid` principal
  - LID vira alias

### ✅ Suporte a Grupo @g.us + participant

- [ ] **Extrair `participant` em grupos**
  - Em `handleMessage`, extrair `key.participant` ou `data.participant`
  - Se `remoteJid.endsWith('@g.us')` e `participant` existe, tratar como remetente

- [ ] **Criar/identificar contato do participant**
  - Se grupo: `upsertContact(participant)` para o remetente
  - Se grupo: `upsertContact(remoteJid)` para o grupo (se necessário)

- [ ] **Associar mensagem ao participant (não ao grupo)**
  - Em grupos, `conversation_id` deve ser da conversa do grupo
  - Mas criar campo `sender_contact_id` ou similar para identificar quem enviou
  - OU: criar mensagem com `contact_id` do participant (mas `conversation_id` do grupo)

- [ ] **Salvar pushName do participant**
  - Em grupos, extrair `pushName` do participant, não do grupo

### ✅ Update de status sempre por messageId independente do remoteJid

- [ ] **Modificar `messages.update` para NÃO criar contato/conversa**
  - Remover chamadas a `upsertContact` e `upsertConversation` no bloco de update
  - Apenas buscar mensagem por `external_id` e atualizar status

- [ ] **Garantir que `providerEventId` seja extraído corretamente**
  - Verificar se `data.key.id` ou `data.messageId` está sendo capturado
  - Adicionar logs para debug

- [ ] **Tratar caso de mensagem não encontrada**
  - Se update não encontrar mensagem por `external_id`, logar warning mas não falhar
  - Possivelmente buscar por outros campos (workspace_id + whatsapp_number_id + remoteJid + messageId)

### ✅ Melhorias adicionais

- [ ] **Adicionar validação de `conversation_events`**
  - Verificar se tabela existe, senão criar migration
  - Ou remover referência se não for necessária

- [ ] **Adicionar índices UNIQUE**
  - `(workspace_id, phone)` em `contacts`
  - `(workspace_id, whatsapp_number_id, remote_jid)` em `conversations`

- [ ] **Melhorar `normalizePhone` para identificar LID**
  - Retornar objeto `{ phone: string, type: 'pn' | 'lid' | 'group' }`
  - Ou manter função simples mas adicionar validação de formato

- [ ] **Adicionar logs detalhados**
  - Logar `remoteJid`, `remoteJidAlt`, `participant` em cada evento
  - Logar qual contato/conversa foi encontrado/criado

---

## RESUMO EXECUTIVO

### Problemas Confirmados

1. ❌ **LID não é tratado como alias de PN** → cria conversas duplicadas
2. ❌ **`remoteJidAlt` é ignorado** → perde informação de LID quando vem PN
3. ❌ **`participant` não é extraído em grupos** → não identifica quem enviou
4. ❌ **Grupos usam mesmo `contact_id` para todas mensagens** → não diferencia remetentes
5. ⚠️ **`messages.update` cria contato/conversa desnecessariamente** → overhead e possível duplicata
6. ⚠️ **Falta tabela de aliases** → não há como associar PN e LID
7. ⚠️ **Falta UNIQUE constraints** → permite duplicatas manuais
8. ⚠️ **`conversation_events` pode não existir** → pode causar erro em runtime

### Arquivos que Precisam ser Modificados

1. `supabase/functions/evolution-webhook/handlers/handleMessage.ts`
2. `supabase/functions/evolution-webhook/services/conversationService.ts`
3. `supabase/functions/evolution-webhook/services/contactService.ts`
4. `supabase/functions/evolution-webhook/utils/normalize.ts` (opcional)
5. Nova migration para criar tabela de aliases
6. Nova migration para adicionar UNIQUE constraints

### Prioridade de Correção

1. **ALTA:** Criar tabela de aliases e modificar lógica para suportar PN + LID
2. **ALTA:** Extrair e tratar `participant` em grupos
3. **MÉDIA:** Otimizar `messages.update` para não criar contato/conversa
4. **MÉDIA:** Adicionar UNIQUE constraints
5. **BAIXA:** Melhorar logs e validações

---

**Fim do Diagnóstico**
