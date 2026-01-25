# Análise: Origem dos Cards da Pipeline

## Resposta Direta

**Os cards da pipeline vêm de DOIS lugares diferentes, dependendo da view:**

### 1. Pipeline Tradicional (Kanban com Cards)
- **Tabela:** `cards` 
- **Referência:** `cards.contact_id` → `contacts.id`
- **Query:** `cards` com JOIN em `contacts(*)`
- **Arquivo:** `src/modules/kanban/presentation/hooks/usePipelines.ts` (linhas 84-88)
- **Renderização:** `KanbanCard.tsx` (linha 75: `card.title`, linha 93: `card.contact.name`)

### 2. Pipeline de Conversas (Conversation Stages)
- **Tabela:** `conversations` + `contacts`
- **Referência:** `conversations.contact_id` → `contacts.id`
- **Query:** `contacts` com LEFT JOIN em `conversations` (linhas 120-163 de `useConversationStages.ts`)
- **Renderização:** `StageCard.tsx` (linha 74: `conversation.contact.name`)

---

## Estrutura das Tabelas

### Tabela `cards`
```sql
CREATE TABLE public.cards (
  id UUID PRIMARY KEY,
  stage_id UUID REFERENCES stages(id),
  contact_id UUID REFERENCES contacts(id) NOT NULL,  -- ← Referencia contacts
  title TEXT NOT NULL,                                -- ← Título do card
  description TEXT,
  ...
);
```

### Tabela `conversations`
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id) NOT NULL,  -- ← Referencia contacts
  stage_id UUID REFERENCES stages(id),
  pipeline_id UUID REFERENCES pipelines(id),
  ...
);
```

### Tabela `contacts`
```sql
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,  -- ← Campo usado para exibir nome
  avatar_url TEXT,
  ...
);
```

---

## Como a UI Renderiza o Nome

### Pipeline Tradicional (Cards)
**Arquivo:** `src/modules/kanban/presentation/components/KanbanCard.tsx`

```typescript
// Linha 75: Título do card (campo title da tabela cards)
<h4 className="font-medium text-sm mb-2">{card.title}</h4>

// Linhas 85-97: Informações do contato
{card.contact && (
  <div>
    <Avatar name={card.contact.name} ... />  // ← Usa contact.name
    <p className="text-xs font-medium">{card.contact.name}</p>  // ← Usa contact.name
    <p className="text-xs text-muted-foreground">{card.contact.phone}</p>
  </div>
)}
```

**Query que popula:**
```typescript
// usePipelines.ts linha 84-88
const { data: cards } = await supabase
  .from('cards')
  .select(`
    *,
    contact:contacts(*)  // ← JOIN com contacts
  `)
  .in('stage_id', stageIds);
```

### Pipeline de Conversas (Conversation Stages)
**Arquivo:** `src/modules/kanban/presentation/components/StageCard.tsx`

```typescript
// Linha 69: Avatar
<Avatar name={conversation.contact.name} ... />  // ← Usa contact.name

// Linha 74: Nome do contato
<p className="font-medium text-sm truncate">{conversation.contact.name}</p>  // ← Usa contact.name

// Linha 76: Telefone
{conversation.contact.phone}
```

**Query que popula:**
```typescript
// useConversationStages.ts linhas 120-163
// 1) Busca TODOS os contacts
const { data: contactsData } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url')
  .eq('workspace_id', workspaceId);

// 2) Busca conversations
const { data: conversationsData } = await supabase
  .from('conversations')
  .select('id, contact_id, stage_id, ...')
  .eq('workspace_id', workspaceId)
  .eq('pipeline_id', pipelineId);

// 3) Faz LEFT JOIN manual (contactEntries)
const contactEntries = contactsData.map(contact => {
  const conversation = conversationsByContact.get(contact.id);
  return {
    ...conversation,
    contact: contact,  // ← contact.name vem daqui
  };
});
```

---

## Problema Identificado

### Se o nome aparece como número de telefone:

**Causa:** `contacts.name = phone` (ou seja, o campo `name` está com o valor do `phone`)

**Quando isso acontece:**
1. Contato criado sem `pushName` → `upsertContact()` usa `phone` como fallback:
   ```typescript
   // contactService.ts linha 206
   const contactName = pushName || phone;  // ← Se pushName é null, usa phone
   ```

2. Contatos de grupo criados incorretamente (antes do backfill):
   - Phone = ID do grupo (ex: "120363123456789")
   - Name = Phone (ex: "120363123456789")

3. Contatos LID sem pushName:
   - Phone = "lid:123456789"
   - Name = Phone (ex: "lid:123456789")

### Onde o problema aparece:

**Pipeline Tradicional (Cards):**
- `card.contact.name` → mostra número se `contacts.name = phone`
- `card.title` → pode ser editado manualmente, não afetado

**Pipeline de Conversas:**
- `conversation.contact.name` → mostra número se `contacts.name = phone`

---

## Impacto do Backfill

### O que o backfill corrigiu:
1. ✅ Contatos de grupo prefixados com `group:` no phone
2. ✅ Aliases criados para conversas existentes

### O que o backfill NÃO corrigiu:
1. ❌ `contacts.name` que está igual a `phone` (não foi alterado)
2. ❌ `cards.contact_id` que aponta para contatos incorretos (não foi verificado)
3. ❌ `conversations.contact_id` que aponta para contatos incorretos (não foi verificado)

---

## Onde Corrigir

### Se o problema é `contacts.name = phone`:

**Opção 1: Corrigir na tabela `contacts`**
```sql
-- Atualizar contatos onde name = phone (exceto placeholders)
UPDATE contacts
SET name = COALESCE(
  NULLIF(name, phone),  -- Se name = phone, vira NULL
  'Contato ' || SUBSTRING(phone, 1, 10)  -- Fallback genérico
)
WHERE name = phone
  AND phone NOT LIKE 'group:%'
  AND phone NOT LIKE 'lid:%';
```

**Opção 2: Corrigir no frontend (fallback)**
```typescript
// Em KanbanCard.tsx e StageCard.tsx
const displayName = card.contact.name !== card.contact.phone 
  ? card.contact.name 
  : `Contato ${card.contact.phone.substring(0, 10)}`;
```

### Se o problema é `cards.contact_id` ou `conversations.contact_id` apontando para contatos errados:

**Verificar:**
```sql
-- Cards com contatos de grupo
SELECT c.id, c.title, c.contact_id, ct.phone, ct.name
FROM cards c
JOIN contacts ct ON c.contact_id = ct.id
WHERE ct.phone LIKE 'group:%'
   OR ct.phone LIKE 'lid:%';

-- Conversations com contatos de grupo
SELECT conv.id, conv.contact_id, ct.phone, ct.name
FROM conversations conv
JOIN contacts ct ON conv.contact_id = ct.id
WHERE ct.phone LIKE 'group:%'
   OR ct.phone LIKE 'lid:%';
```

**Corrigir:**
- Se houver cards/conversations apontando para contatos de grupo, precisaria:
  1. Identificar o contato correto (via `conversation_aliases` ou `remote_jid`)
  2. Atualizar `contact_id` nos cards/conversations

---

## Recomendações

### 1. Verificar qual pipeline está sendo usado
- Se for **Pipeline Tradicional (cards)**: problema está em `cards.contact_id` → `contacts.name`
- Se for **Pipeline de Conversas**: problema está em `conversations.contact_id` → `contacts.name`

### 2. Verificar dados atuais
```sql
-- Contatos com name = phone
SELECT id, phone, name, workspace_id
FROM contacts
WHERE name = phone
  AND phone NOT LIKE 'group:%'
  AND phone NOT LIKE 'lid:%'
LIMIT 10;

-- Cards afetados
SELECT c.id, c.title, ct.name, ct.phone
FROM cards c
JOIN contacts ct ON c.contact_id = ct.id
WHERE ct.name = ct.phone
LIMIT 10;

-- Conversations afetadas
SELECT conv.id, ct.name, ct.phone
FROM conversations conv
JOIN contacts ct ON conv.contact_id = ct.id
WHERE ct.name = ct.phone
LIMIT 10;
```

### 3. Backfill adicional necessário
Se confirmar que `contacts.name = phone` em muitos registros:
- Criar script para atualizar `contacts.name` com fallback melhor
- Ou atualizar `cards.contact_id` / `conversations.contact_id` se apontarem para contatos errados

---

## Resumo Executivo

| Item | Resposta |
|------|----------|
| **Cards vêm de:** | `cards` (tabela) com JOIN em `contacts` |
| **Conversations vêm de:** | `conversations` (tabela) com JOIN em `contacts` |
| **Nome exibido:** | `contacts.name` (campo direto, não fallback no front) |
| **Problema:** | `contacts.name = phone` quando contato foi criado sem pushName |
| **Onde corrigir:** | Tabela `contacts` (campo `name`) OU frontend (adicionar fallback) |
| **Backfill necessário:** | Atualizar `contacts.name` onde `name = phone` |

---

**Conclusão:** O problema está na tabela `contacts` (campo `name` igual a `phone`), não na referência `contact_id` dos cards/conversations. O backfill atual não corrigiu isso porque apenas prefixou phones de grupo, mas não atualizou os nomes.
