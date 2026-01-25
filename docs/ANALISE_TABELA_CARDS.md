# Análise: Uso da Tabela `cards` nas Views de "Leads e Clientes"

## Resumo Executivo

**A tabela `cards` NÃO é usada nas views de Relacionamento, Estágios de Vendas e Grupos.**

Todas as três views já funcionam corretamente:
- ✅ **Relacionamento**: Mostra TODOS os contatos reais (via `useContactClasses`)
- ✅ **Estágios de Vendas**: Mostra TODOS os contatos reais (via `useConversationStages`)
- ✅ **Grupos**: Mostra apenas grupos (via `useGroupClasses`)

A tabela `cards` existe apenas para uma funcionalidade antiga (Pipeline Tradicional) que pode não estar mais em uso.

---

## Análise das Views Atuais

### 1. View "Relacionamento" (RelationshipBoard)

**Hook:** `useContactClasses`
**Arquivo:** `src/modules/kanban/presentation/hooks/useContactClasses.ts`

**Query utilizada (linhas 70-76):**
```typescript
const { data: contacts, error } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)
  .eq('is_real', true)  // ← Apenas contatos reais
  .order('name', { ascending: true });
```

**Filtros aplicados:**
- ✅ `is_visible = true`
- ✅ `is_real = true` (exclui grupos e LIDs)
- ✅ Exclui contatos que pertencem a grupos (via `groupConversations`)

**Usa tabela `cards`?** ❌ **NÃO**

**Resultado:** Mostra TODOS os contatos reais, organizados por classes de relacionamento.

---

### 2. View "Estágios de Vendas" (StageBoard)

**Hook:** `useConversationStages`
**Arquivo:** `src/modules/kanban/presentation/hooks/useConversationStages.ts`

**Query utilizada (linhas 120-125):**
```typescript
// Fetch ALL contacts (not just those with conversations) - only real, visible contacts
const { data: contactsData, error: contactsError } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)
  .eq('is_real', true);  // ← Apenas contatos reais
```

**Depois faz LEFT JOIN com `conversations` (linhas 132-165):**
```typescript
// Fetch conversations for this pipeline (excluding groups)
const { data: conversationsData } = await supabase
  .from('conversations')
  .select('id, contact_id, stage_id, pipeline_id, last_message_at, unread_count, is_group')
  .eq('workspace_id', workspaceId)
  .eq('pipeline_id', pipelineId)
  .or('is_group.is.null,is_group.eq.false');

// Build contact entries with LEFT JOIN logic, excluding group contacts
const contactEntries: ConversationWithStage[] = (contactsData || [])
  .filter(contact => !groupContactIds.has(contact.id))
  .map(contact => {
    const conversation = conversationsByContact.get(contact.id);
    return {
      id: conversation?.id || null,
      contact_id: contact.id,
      stage_id: conversation?.stage_id || null,  // ← Pega stage_id da conversation
      // ...
      contact: contact,
    };
  });
```

**Filtros aplicados:**
- ✅ `is_visible = true`
- ✅ `is_real = true` (exclui grupos e LIDs)
- ✅ Exclui contatos que pertencem a grupos
- ✅ LEFT JOIN com `conversations` para pegar `stage_id` (não usa `cards`)

**Usa tabela `cards`?** ❌ **NÃO**

**Resultado:** Mostra TODOS os contatos reais, organizados por estágios da pipeline (via `conversations.stage_id`).

---

### 3. View "Grupos" (GroupsBoard)

**Hook:** `useGroupClasses`
**Arquivo:** `src/modules/kanban/presentation/hooks/useGroupClasses.ts`

**Query utilizada (linhas 41-60):**
```typescript
const { data: groupsData, error: groupsError } = await supabase
  .from('conversations')
  .select(`
    id,
    contact_id,
    remote_jid,
    last_message_at,
    unread_count,
    whatsapp_number_id,
    contacts!inner (
      id,
      name,
      phone,
      avatar_url,
      group_class_id
    )
  `)
  .eq('workspace_id', workspaceId)
  .eq('is_group', true)  // ← Apenas grupos
  .order('last_message_at', { ascending: false, nullsFirst: false });
```

**Filtros aplicados:**
- ✅ `is_group = true` (apenas grupos)

**Usa tabela `cards`?** ❌ **NÃO**

**Resultado:** Mostra apenas grupos, organizados por classes de grupos.

---

## Onde a Tabela `cards` é Usada

### Pipeline Tradicional (Código Legado - NÃO Usado)

**Componente:** `KanbanBoard`
**Arquivo:** `src/modules/kanban/presentation/components/KanbanBoard.tsx`

**Hook:** `usePipelines`
**Arquivo:** `src/modules/kanban/presentation/hooks/usePipelines.ts`

**Query utilizada (linhas 83-90):**
```typescript
const { data: cards, error: cardsError } = await supabase
  .from('cards')
  .select(`
    *,
    contact:contacts(*)
  `)
  .in('stage_id', stageIds)
  .order('position', { ascending: true });
```

**Status:**
- ❌ **NÃO é usado** nas views principais (`KanbanMainView` usa apenas `RelationshipBoard`, `StageBoard` e `GroupsBoard`)
- ❌ **NÃO é importado** em `KanbanMainView.tsx`
- ⚠️ **Código legado** que pode ser removido

**Verificação:**
- `KanbanMainView` renderiza apenas: `RelationshipBoard`, `StageBoard`, `GroupsBoard`
- `KanbanBoard` (que usa `cards`) não é usado em nenhum lugar nas views principais

**Observação:** A tabela `cards` e o componente `KanbanBoard` são código legado que não está mais em uso.

---

## Conclusão

### ✅ Situação Atual (Correta)

1. **Relacionamento**: Mostra TODOS os contatos reais ✅
2. **Estágios de Vendas**: Mostra TODOS os contatos reais ✅
3. **Grupos**: Mostra apenas grupos ✅

**Nenhuma dessas views usa a tabela `cards`.**

### ⚠️ Tabela `cards` - Status

A tabela `cards` existe no banco de dados, mas:
- ❌ Não é usada nas views principais (Relacionamento, Estágios, Grupos)
- ⚠️ É usada apenas na Pipeline Tradicional (que pode não estar mais em uso)
- ⚠️ Cards são criados manualmente pelo usuário (não automaticamente)

### 📋 Recomendações

1. **Remover código legado:**
   - ✅ **Confirmado:** `KanbanBoard` não é usado nas views principais
   - ✅ **Confirmado:** A tabela `cards` não é necessária para as views atuais
   - 🔧 **Ação recomendada:** Remover ou arquivar:
     - Tabela `cards` do banco de dados
     - Componente `KanbanBoard.tsx`
     - Componente `KanbanCard.tsx`
     - Função `createCard` de `usePipelines.ts`
     - Componente `CreateCardDialog.tsx`
     - Funções relacionadas a cards em `usePipelines.ts` (`moveCard`, `updateCard`, `deleteCard`)

2. **Manter apenas o necessário:**
   - Manter `usePipelines` apenas para gerenciar pipelines e stages (sem cards)
   - Ou criar um hook separado `usePipelineManagement` sem funcionalidades de cards

3. **Verificar dependências:**
   - Verificar se `usePipelines` é usado em outros lugares apenas para pipelines/stages (não cards)
   - Verificar se há migrações ou scripts que dependem da tabela `cards`

---

## Verificação: Referências à Tabela `cards`

### Onde `cards` é mencionado no código:

1. **`usePipelines.ts`** - Pipeline Tradicional (não usada nas views principais)
2. **`contactService.ts`** - Apenas UPDATE (migração de contatos placeholder)
3. **Documentação** - Análises e documentação

### Onde `cards` NÃO é mencionado (Views Principais):

- ❌ `useContactClasses.ts` (Relacionamento)
- ❌ `useConversationStages.ts` (Estágios de Vendas)
- ❌ `useGroupClasses.ts` (Grupos)
- ❌ `RelationshipBoard.tsx`
- ❌ `StageBoard.tsx`
- ❌ `GroupsBoard.tsx`
- ❌ `KanbanMainView.tsx` (não importa `KanbanBoard`)

### Onde `cards` É mencionado (Código Legado):

- ⚠️ `KanbanBoard.tsx` (não usado)
- ⚠️ `KanbanCard.tsx` (não usado)
- ⚠️ `usePipelines.ts` (funções de cards não usadas)
- ⚠️ `CreateCardDialog.tsx` (não usado)

---

## Resumo Final

| View | Usa `cards`? | Origem dos Dados | Filtros |
|------|--------------|------------------|---------|
| **Relacionamento** | ❌ Não | `contacts` (todos reais) | `is_real = true`, `is_visible = true`, exclui grupos |
| **Estágios de Vendas** | ❌ Não | `contacts` (todos reais) + LEFT JOIN `conversations` | `is_real = true`, `is_visible = true`, exclui grupos |
| **Grupos** | ❌ Não | `conversations` com `is_group = true` | `is_group = true` |
| **Pipeline Tradicional** | ✅ Sim | `cards` com JOIN `contacts` | Apenas cards criados manualmente |

**Conclusão:** A tabela `cards` não é necessária para as views principais. Ela existe apenas para uma funcionalidade antiga (Pipeline Tradicional) que pode não estar mais em uso.
