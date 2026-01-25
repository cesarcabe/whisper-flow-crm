# Padronização: Leads e Clientes (Relacionamento e Estágios de Vendas)

## Resumo

Ambas as views de **Relacionamento** e **Estágios de Vendas** seguem o mesmo padrão:

1. ✅ Mostram **TODOS** os contatos reais e visíveis (leads)
2. ✅ Organizam contatos por classificação (`contact_class_id` ou `stage_id`)
3. ✅ Contatos sem classificação aparecem na primeira coluna padrão

---

## View: Relacionamento

### Origem dos Dados

**Hook:** `useContactClasses`
**Arquivo:** `src/modules/kanban/presentation/hooks/useContactClasses.ts`

### Filtros Aplicados

```typescript
// Busca TODOS os contatos reais e visíveis
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)    // ← Apenas visíveis
  .eq('is_real', true)       // ← Apenas reais (não grupos/LIDs)
  .order('name', { ascending: true });
```

### Organização

- **Coluna padrão:** "Sem Classificação" (contatos com `contact_class_id = null`)
- **Colunas de classificação:** Uma coluna para cada `contact_class_id` existente
- **Fonte da classificação:** Campo `contact_class_id` da tabela `contacts`

### Comportamento

1. Busca **TODOS** os contatos reais e visíveis
2. Exclui contatos que pertencem a grupos (aparecem na view de Grupos)
3. Organiza por `contact_class_id`:
   - Se `contact_class_id` é `null` → aparece em "Sem Classificação"
   - Se `contact_class_id` tem valor → aparece na coluna correspondente

### Atualização

Quando o usuário move um contato:
- Atualiza `contacts.contact_class_id` na tabela `contacts`

---

## View: Estágios de Vendas

### Origem dos Dados

**Hook:** `useConversationStages`
**Arquivo:** `src/modules/kanban/presentation/hooks/useConversationStages.ts`

### Filtros Aplicados

```typescript
// Busca TODOS os contatos reais e visíveis
const { data: contactsData } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)    // ← Apenas visíveis
  .eq('is_real', true)       // ← Apenas reais (não grupos/LIDs)
  .order('name', { ascending: true });

// Busca conversas do pipeline para pegar stage_id
const { data: conversationsData } = await supabase
  .from('conversations')
  .select('id, contact_id, stage_id, pipeline_id, ...')
  .eq('workspace_id', workspaceId)
  .eq('pipeline_id', pipelineId)
  .or('is_group.is.null,is_group.eq.false');

// LEFT JOIN: cada contato pega seu stage_id da conversation
const contactEntries = contactsData.map(contact => {
  const conversation = conversationsByContact.get(contact.id);
  return {
    contact_id: contact.id,
    stage_id: conversation?.stage_id || null,  // ← null se não tem conversa ou stage
    contact: contact,
  };
});
```

### Organização

- **Coluna padrão:** "Entrada de Leads" (contatos com `stage_id = null`)
- **Colunas de estágio:** Uma coluna para cada estágio (`stage`) do pipeline
- **Fonte da classificação:** Campo `stage_id` da tabela `conversations` (para o pipeline ativo)

### Comportamento

1. Busca **TODOS** os contatos reais e visíveis
2. Exclui contatos que pertencem a grupos (aparecem na view de Grupos)
3. Faz LEFT JOIN com `conversations` para pegar `stage_id`:
   - Se `stage_id` é `null` → aparece em "Entrada de Leads"
   - Se `stage_id` tem valor → aparece na coluna do estágio correspondente

### Atualização

Quando o usuário move um contato:
- Se já existe `conversation` → atualiza `conversations.stage_id`
- Se não existe `conversation` → cria nova `conversation` com `stage_id`

---

## Comparação: Padrão Unificado

| Aspecto | Relacionamento | Estágios de Vendas |
|---------|----------------|-------------------|
| **Fonte dos contatos** | `contacts` (todos reais e visíveis) | `contacts` (todos reais e visíveis) |
| **Filtros** | `is_visible = true`, `is_real = true` | `is_visible = true`, `is_real = true` |
| **Exclusão** | Exclui grupos | Exclui grupos |
| **Classificação** | `contacts.contact_class_id` | `conversations.stage_id` |
| **Coluna padrão** | "Sem Classificação" | "Entrada de Leads" |
| **Quando null** | `contact_class_id = null` | `stage_id = null` |
| **Tabela de atualização** | `contacts` | `conversations` |

---

## Garantias

### ✅ Todos os contatos aparecem

- **Relacionamento:** Todos os contatos reais e visíveis aparecem (com ou sem `contact_class_id`)
- **Estágios de Vendas:** Todos os contatos reais e visíveis aparecem (com ou sem `stage_id`)

### ✅ Contatos sem classificação

- **Relacionamento:** Contatos com `contact_class_id = null` aparecem em "Sem Classificação"
- **Estágios de Vendas:** Contatos com `stage_id = null` aparecem em "Entrada de Leads"

### ✅ Exclusão de grupos

- Ambas as views excluem contatos que pertencem a grupos (eles aparecem na view de Grupos)

### ✅ Atualização em tempo real

- Quando um contato é movido, a classificação é atualizada no banco de dados
- A view é atualizada automaticamente

---

## Implementação Técnica

### Relacionamento

**Arquivo:** `src/modules/kanban/presentation/hooks/useContactClasses.ts`

```typescript
// Busca todos os contatos
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)
  .eq('is_real', true);

// Organiza por contact_class_id
contacts.forEach((contact) => {
  if (contact.contact_class_id) {
    grouped[contact.contact_class_id].push(contact);
  } else {
    unclassified.push(contact);  // ← "Sem Classificação"
  }
});
```

### Estágios de Vendas

**Arquivo:** `src/modules/kanban/presentation/hooks/useConversationStages.ts`

```typescript
// Busca todos os contatos
const { data: contactsData } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)
  .eq('is_real', true);

// Busca conversas para pegar stage_id
const { data: conversationsData } = await supabase
  .from('conversations')
  .select('contact_id, stage_id, ...')
  .eq('pipeline_id', pipelineId);

// LEFT JOIN: cada contato pega seu stage_id
const contactEntries = contactsData.map(contact => {
  const conversation = conversationsByContact.get(contact.id);
  return {
    contact_id: contact.id,
    stage_id: conversation?.stage_id || null,  // ← null = "Entrada de Leads"
    contact: contact,
  };
});
```

---

## Conclusão

Ambas as views estão **padronizadas** e seguem o mesmo comportamento:

1. ✅ Mostram **TODOS** os contatos reais e visíveis
2. ✅ Organizam por classificação (`contact_class_id` ou `stage_id`)
3. ✅ Contatos sem classificação aparecem na primeira coluna padrão
4. ✅ Excluem grupos (que aparecem na view de Grupos)

O código foi atualizado com comentários explicativos para garantir que o comportamento seja claro e mantido.
