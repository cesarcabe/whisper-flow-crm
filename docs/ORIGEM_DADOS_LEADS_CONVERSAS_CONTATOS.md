# Origem dos Dados: Leads e Clientes, Lista de Conversas e Contatos

## Resumo Executivo

| Componente | Tabela Principal | JOIN/Relacionamento | Hook | Arquivo |
|------------|------------------|---------------------|------|---------|
| **Cards em "Leads e Clientes"** | `cards` | `cards.contact_id` → `contacts.id` | `usePipelines` | `src/modules/kanban/presentation/hooks/usePipelines.ts` |
| **Lista de Conversas** | `conversations` | `conversations.contact_id` → `contacts.id` | `useConversations` | `src/modules/conversation/presentation/hooks/useConversations.ts` |
| **Cards em Contatos** | `contacts` | Direto (sem JOIN) | `useContacts` | `src/hooks/useContacts.ts` |

---

## 1. Cards em "Leads e Clientes" (Pipeline Kanban)

### Origem dos Dados

**Tabela Principal:** `cards`
**Relacionamento:** `cards.contact_id` → `contacts.id`

### Query SQL

```sql
SELECT 
  cards.*,
  contacts.*
FROM cards
INNER JOIN contacts ON cards.contact_id = contacts.id
WHERE cards.stage_id IN (stage_ids)
ORDER BY cards.position ASC
```

### Implementação no Código

**Arquivo:** `src/modules/kanban/presentation/hooks/usePipelines.ts`

**Linhas 83-90:**
```typescript
const { data: cards, error: cardsError } = await supabase
  .from('cards')
  .select(`
    *,
    contact:contacts(*)  // ← JOIN com contacts
  `)
  .in('stage_id', stageIds)
  .order('position', { ascending: true });
```

### Estrutura dos Dados

```typescript
interface Card {
  id: string;
  stage_id: string;
  contact_id: string;  // ← Referência ao contato
  title: string;       // ← Título do card (editável)
  description: string | null;
  position: number;
  contact: {           // ← Dados do contato (via JOIN)
    id: string;
    name: string;      // ← Nome exibido no card
    phone: string;
    avatar_url: string | null;
    // ... outros campos
  };
}
```

### Renderização

**Arquivo:** `src/components/kanban/KanbanCard.tsx`

- **Título do card:** `card.title` (campo da tabela `cards`)
- **Nome do contato:** `card.contact.name` (campo da tabela `contacts`)
- **Telefone:** `card.contact.phone` (campo da tabela `contacts`)

### Observações Importantes

1. **Cards são entidades separadas:** Um card é criado manualmente e associado a um contato
2. **Um contato pode ter múltiplos cards:** Em diferentes pipelines ou estágios
3. **O título do card é editável:** Pode ser diferente do nome do contato
4. **Filtros aplicados:**
   - Cards pertencem aos estágios do pipeline ativo
   - Ordenados por `position`

---

## 2. Lista de Conversas

### Origem dos Dados

**Tabela Principal:** `conversations`
**Relacionamento:** `conversations.contact_id` → `contacts.id`

### Query SQL (Simplificada)

```sql
-- 1. Busca conversas
SELECT 
  conversations.*
FROM conversations
WHERE conversations.whatsapp_number_id = :whatsappNumberId
  AND conversations.workspace_id = :workspaceId

-- 2. Busca contatos relacionados (em batch)
SELECT 
  contacts.*,
  contact_classes.*
FROM contacts
WHERE contacts.id IN (contact_ids)

-- 3. Busca última mensagem (para preview)
SELECT 
  messages.conversation_id,
  messages.body
FROM messages
WHERE messages.conversation_id IN (conversation_ids)
ORDER BY messages.created_at DESC
```

### Implementação no Código

**Arquivo:** `src/modules/conversation/presentation/hooks/useConversations.ts`

**Linhas 111-156:**
```typescript
// 1. Busca conversas via ConversationService
const result = await conversationService.listConversations(whatsappNumberId);
const domainConversations = result.data;

// 2. Enriquece com contatos, estágios e mensagens
const contactIds = [...new Set(domainConversations.map(c => c.contactId))];
const [contactsResult, stagesResult, messagesResult] = await Promise.all([
  fetchContactsBatch(contactIds),      // ← Busca contatos
  fetchStages(stageIds),
  fetchLastMessages(convIds),          // ← Busca última mensagem
]);

// 3. Combina os dados
const enrichedConversations = legacyConversations.map(conv => ({
  ...conv,
  contact: contactsResult.get(conv.contact_id) ?? null,
  stage: conv.stage_id ? stagesResult.get(conv.stage_id) ?? null : null,
  lastMessagePreview: messagesResult.get(conv.id) ?? '',
}));
```

**Função `fetchContactsBatch` (linhas 390-422):**
```typescript
async function fetchContactsBatch(contactIds: string[]): Promise<Map<string, ContactData>> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, contact_class:contact_classes(id, name, color)')
    .in('id', batch);
  // ...
}
```

### Estrutura dos Dados

```typescript
interface ConversationWithContact {
  id: string;
  contact_id: string;              // ← Referência ao contato
  whatsapp_number_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  contact: {                       // ← Dados do contato (via JOIN)
    id: string;
    name: string;                  // ← Nome exibido na lista
    phone: string;
    avatar_url: string | null;
    contact_class: {                // ← Classe do contato (opcional)
      id: string;
      name: string;
      color: string | null;
    } | null;
  } | null;
  lastMessagePreview: string;       // ← Preview da última mensagem
  stage: {                         // ← Estágio da pipeline (opcional)
    id: string;
    name: string;
    color: string | null;
  } | null;
}
```

### Renderização

**Arquivo:** `src/modules/conversation/presentation/components/ConversationItem.tsx`

- **Nome:** `conversation.contact.name` (linha 54)
- **Telefone:** `conversation.contact.phone`
- **Avatar:** `conversation.contact.avatar_url`
- **Preview da mensagem:** `conversation.lastMessagePreview`
- **Badge de classe:** `conversation.contact.contact_class`
- **Badge de estágio:** `conversation.stage`

### Observações Importantes

1. **Conversas são criadas automaticamente:** Quando há mensagens do WhatsApp
2. **Uma conversa = um contato:** Relação 1:1 entre conversa e contato (por `whatsapp_number_id`)
3. **Filtros aplicados:**
   - Por `whatsapp_number_id` (número WhatsApp selecionado)
   - Por `workspace_id`
   - Exclui grupos se `is_group = true`
4. **Ordenação:** Por `last_message_at` (mais recente primeiro)
5. **Atualização em tempo real:** Via WebSocket ou Supabase Realtime

---

## 3. Cards em Contatos

### Origem dos Dados

**Tabela Principal:** `contacts`
**Relacionamento:** Nenhum (dados diretos)

### Query SQL

```sql
SELECT 
  contacts.*
FROM contacts
WHERE contacts.workspace_id = :workspaceId
  AND contacts.is_visible = true
  AND contacts.is_real = true
ORDER BY contacts.name ASC
```

### Implementação no Código

**Arquivo:** `src/hooks/useContacts.ts`

**Linhas 47-53:**
```typescript
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)    // ← Apenas contatos visíveis
  .eq('is_real', true)       // ← Apenas contatos reais (não grupos/LID)
  .order('name', { ascending: true });
```

### Estrutura dos Dados

```typescript
interface Contact {
  id: string;
  workspace_id: string;
  name: string;              // ← Nome exibido no card
  phone: string;            // ← Telefone exibido
  email: string | null;
  avatar_url: string | null;
  status: string | null;    // ← 'active' | 'inactive' | 'blocked'
  contact_class_id: string | null;
  // ... outros campos
}
```

### Renderização

**Arquivo:** `src/modules/contacts/presentation/components/ContactCard.tsx`

- **Nome:** `contact.name` (linha 81)
- **Telefone:** `contact.phone.format()` (linha 89)
- **Email:** `contact.email` (linha 94)
- **Status:** `contact.status` (badge de ativo/inativo/bloqueado)
- **Classe:** `contact.contactClassId` → busca em `contactClasses`

### Observações Importantes

1. **Dados diretos da tabela:** Não há JOIN necessário
2. **Filtros aplicados:**
   - `is_visible = true` (apenas contatos visíveis)
   - `is_real = true` (exclui grupos e LIDs)
   - `workspace_id` (apenas do workspace atual)
3. **Ordenação:** Por nome (A-Z)
4. **Um contato pode ter múltiplas relações:**
   - Pode ter cards em pipelines
   - Pode ter conversas
   - Pode ter classe de contato

---

## Comparação: Diferenças entre as Três Visualizações

| Aspecto | Cards (Leads) | Conversas | Contatos |
|--------|--------------|-----------|----------|
| **Tabela Principal** | `cards` | `conversations` | `contacts` |
| **Criação** | Manual (usuário cria) | Automática (via mensagens) | Manual ou automática (via WhatsApp) |
| **Relacionamento** | `cards.contact_id` → `contacts` | `conversations.contact_id` → `contacts` | Direto |
| **Filtro por WhatsApp** | ❌ Não | ✅ Sim (`whatsapp_number_id`) | ❌ Não |
| **Filtro por Pipeline** | ✅ Sim (`stage_id` → `pipeline_id`) | ✅ Sim (opcional, via `stage_id`) | ❌ Não |
| **Ordenação** | Por `position` (dentro do estágio) | Por `last_message_at` (DESC) | Por `name` (ASC) |
| **Atualização em Tempo Real** | ❌ Não | ✅ Sim (WebSocket/Realtime) | ❌ Não |
| **Exibe Preview de Mensagem** | ❌ Não | ✅ Sim | ❌ Não |
| **Exibe Status** | ❌ Não | ❌ Não | ✅ Sim (ativo/inativo/bloqueado) |

---

## Problemas Comuns e Soluções

### Problema 1: Nome aparece como número de telefone

**Causa:** `contacts.name = contacts.phone` (contato criado sem `pushName`)

**Onde aparece:**
- ✅ Cards em "Leads e Clientes" (via `card.contact.name`)
- ✅ Lista de Conversas (via `conversation.contact.name`)
- ✅ Cards em Contatos (via `contact.name`)

**Solução:** Verificar e atualizar `contacts.name` na tabela

### Problema 2: Contatos de grupo aparecem onde não deveriam

**Causa:** `contacts.is_real = false` ou `contacts.phone LIKE 'group:%'` não filtrado

**Onde aparece:**
- ❌ Cards em "Leads e Clientes" (se `card.contact_id` apontar para grupo)
- ✅ Lista de Conversas (filtrado por `is_group = false`)
- ✅ Cards em Contatos (filtrado por `is_real = true`)

**Solução:** Verificar `cards.contact_id` e `conversations.contact_id` que apontam para grupos

### Problema 3: Conversas não aparecem na lista

**Causa:** `conversations.whatsapp_number_id` não corresponde ao número selecionado

**Onde aparece:**
- ❌ Lista de Conversas (filtrado por `whatsapp_number_id`)

**Solução:** Verificar se a conversa tem `whatsapp_number_id` correto

---

## Queries Úteis para Diagnóstico

### Verificar cards com contatos problemáticos

```sql
SELECT 
  c.id as card_id,
  c.title,
  c.contact_id,
  ct.name as contact_name,
  ct.phone as contact_phone,
  ct.is_real,
  ct.is_visible
FROM cards c
JOIN contacts ct ON c.contact_id = ct.id
WHERE ct.name = ct.phone
   OR ct.phone LIKE 'group:%'
   OR ct.phone LIKE 'lid:%'
   OR ct.is_real = false
LIMIT 20;
```

### Verificar conversas com contatos problemáticos

```sql
SELECT 
  conv.id as conversation_id,
  conv.contact_id,
  conv.whatsapp_number_id,
  ct.name as contact_name,
  ct.phone as contact_phone,
  ct.is_real,
  conv.is_group
FROM conversations conv
JOIN contacts ct ON conv.contact_id = ct.id
WHERE ct.name = ct.phone
   OR ct.phone LIKE 'group:%'
   OR ct.phone LIKE 'lid:%'
   OR (conv.is_group = false AND ct.is_real = false)
LIMIT 20;
```

### Verificar contatos com nome = telefone

```sql
SELECT 
  id,
  name,
  phone,
  is_real,
  is_visible,
  workspace_id
FROM contacts
WHERE name = phone
  AND phone NOT LIKE 'group:%'
  AND phone NOT LIKE 'lid:%'
  AND is_real = true
LIMIT 20;
```

---

## Conclusão

1. **Cards em "Leads e Clientes":** Vêm da tabela `cards` com JOIN em `contacts`
2. **Lista de Conversas:** Vêm da tabela `conversations` com JOIN em `contacts` e enriquecimento com mensagens
3. **Cards em Contatos:** Vêm diretamente da tabela `contacts` (sem JOIN)

Todos os três componentes dependem da tabela `contacts` para exibir informações do contato (nome, telefone, avatar). A diferença está na tabela principal que é consultada e nos filtros aplicados.
