# Quem Insere Dados na Tabela `cards`

## Resumo Executivo

**A tabela `cards` recebe inserções APENAS através de ação manual do usuário no frontend.**

Não há inserções automáticas via triggers, webhooks ou funções do banco de dados. Todos os cards são criados manualmente pelo usuário através da interface.

---

## Fluxo Completo de Criação de Card

### 1. Interface do Usuário (Frontend)

**Componente:** `CreateCardDialog`
**Arquivo:** `src/modules/kanban/presentation/components/dialogs/CreateCardDialog.tsx`

O usuário interage com um diálogo modal que permite:
- Selecionar um contato existente
- Digitar um título para o card
- Opcionalmente, adicionar uma descrição

### 2. Ação do Usuário

**Como o usuário abre o diálogo:**

**Arquivo:** `src/modules/kanban/presentation/hooks/useKanbanState.ts`

**Linha 127-130:**
```typescript
const handleAddCard = useCallback((stageId: string) => {
  setSelectedItems(prev => ({ ...prev, stageId }));
  openDialog('showCreateCard');
}, [openDialog]);
```

O usuário clica em um botão "Adicionar Card" em um estágio (stage) do Kanban, que:
1. Define o `stageId` selecionado
2. Abre o diálogo `CreateCardDialog`

### 3. Submissão do Formulário

**Arquivo:** `src/modules/kanban/presentation/components/dialogs/CreateCardDialog.tsx`

**Linhas 45-56:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!contactId || !title.trim()) return;

  setIsLoading(true);
  await onSubmit(contactId, title.trim(), description.trim() || undefined);
  setIsLoading(false);
  setContactId('');
  setTitle('');
  setDescription('');
  onOpenChange(false);
};
```

Quando o usuário submete o formulário, chama a função `onSubmit` passada como prop.

### 4. Chamada do Hook

**Arquivo:** `src/components/kanban/KanbanView.tsx` ou `src/modules/kanban/presentation/components/KanbanView.tsx`

**Linhas 175-183:**
```typescript
<CreateCardDialog
  open={dialogs.showCreateCard}
  onOpenChange={(open) => setDialogOpen('showCreateCard', open)}
  contacts={contacts as unknown as Contact[]}
  onSubmit={async (contactId, title, description) => {
    if (selectedItems.stageId) {
      await createCard(selectedItems.stageId, contactId, title, description);
    }
  }}
  // ...
/>
```

O `onSubmit` chama a função `createCard` do hook `usePipelines`.

### 5. Função de Criação (Hook)

**Arquivo:** `src/modules/kanban/presentation/hooks/usePipelines.ts`

**Linhas 308-342:**
```typescript
const createCard = async (stageId: string, contactId: string, title: string, description?: string) => {
  if (!activePipeline || !workspaceId) return null;

  try {
    // Get next position using pure function
    const stage = activePipeline.stages.find(s => s.id === stageId);
    const nextPosition = calculateNextCardPosition(stage?.cards || []);

    const { data, error } = await supabase
      .from('cards')
      .insert({
        stage_id: stageId,
        workspace_id: workspaceId,
        contact_id: contactId,
        title,
        description,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('[CRM Kanban] Error creating card:', error);
      toast.error('Erro ao criar card');
      return null;
    }

    toast.success('Card criado!');
    await fetchPipelineWithStages(activePipeline.id);
    return data;
  } catch (err) {
    console.error('[CRM Kanban] Exception creating card:', err);
    return null;
  }
};
```

Esta é a **única função que faz INSERT na tabela `cards`**.

### 6. Inserção no Banco de Dados

**Query SQL executada:**
```sql
INSERT INTO cards (
  stage_id,
  workspace_id,
  contact_id,
  title,
  description,
  position
) VALUES (
  :stageId,
  :workspaceId,
  :contactId,
  :title,
  :description,
  :nextPosition
)
RETURNING *;
```

---

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário clica em "Adicionar Card" em um Stage            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. handleAddCard()                                         │
│    - Define stageId selecionado                             │
│    - Abre CreateCardDialog                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CreateCardDialog (Modal)                                 │
│    - Usuário seleciona contato                             │
│    - Usuário digita título                                  │
│    - Usuário (opcionalmente) digita descrição              │
│    - Usuário clica em "Criar Card"                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. handleSubmit() no CreateCardDialog                      │
│    - Valida campos                                          │
│    - Chama onSubmit(contactId, title, description)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. KanbanView.onSubmit                                      │
│    - Chama createCard(stageId, contactId, title, desc)     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. usePipelines.createCard()                                │
│    - Calcula próxima posição                               │
│    - Executa INSERT via Supabase                           │
│    - Atualiza UI (refetch)                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Supabase INSERT na tabela cards                         │
│    ✅ Card criado no banco de dados                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Outras Operações na Tabela `cards`

### UPDATE (Atualização)

**Arquivo:** `supabase/functions/evolution-webhook/services/contactService.ts`

**Linhas 363-367:**
```typescript
// Migrar cards se existirem
await supabase
  .from("cards")
  .update({ contact_id: realContactId })
  .eq("workspace_id", workspaceId)
  .eq("contact_id", placeholder.id);
```

**Quando acontece:** Quando um contato placeholder é substituído por um contato real durante a migração de dados do WhatsApp.

**Não é INSERT:** Apenas atualiza o `contact_id` de cards existentes.

### SELECT (Leitura)

**Arquivo:** `src/modules/kanban/presentation/hooks/usePipelines.ts`

**Linhas 83-90:**
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

**Quando acontece:** Para carregar os cards existentes ao abrir um pipeline.

---

## Verificação: Não Há Inserções Automáticas

### ❌ Não há triggers no banco de dados

Busca por triggers que inserem cards:
```sql
-- Não encontrado nenhum trigger
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%card%';
```

### ❌ Não há funções que inserem cards automaticamente

Nenhuma função do Supabase (Edge Function) faz INSERT em `cards`:
- `evolution-webhook`: Apenas atualiza `contact_id` em cards existentes
- `whatsapp-send*`: Não mexe com cards
- Outras funções: Não têm referência a `cards`

### ❌ Não há webhooks externos que inserem cards

Nenhum webhook do Evolution API ou outro serviço cria cards automaticamente.

---

## Resumo: Quem Insere Cards

| Origem | Tipo | Quando | Arquivo |
|--------|------|--------|---------|
| **Usuário (Frontend)** | Manual | Quando usuário cria card via UI | `usePipelines.createCard()` |
| **Migração de Contatos** | UPDATE apenas | Quando placeholder é substituído | `contactService.ts` (linha 363) |
| **Triggers/Webhooks** | ❌ Não existe | - | - |

---

## Conclusão

**A tabela `cards` recebe inserções APENAS através de:**

1. ✅ **Ação manual do usuário** no frontend através do componente `CreateCardDialog`
2. ✅ **Função `createCard`** do hook `usePipelines` que executa o INSERT via Supabase

**Não há:**
- ❌ Inserções automáticas via triggers
- ❌ Inserções automáticas via webhooks
- ❌ Inserções automáticas via funções do banco
- ❌ Inserções automáticas quando uma conversa é criada
- ❌ Inserções automáticas quando um contato é criado

**Cards são entidades criadas manualmente pelo usuário para gerenciar leads e clientes na pipeline Kanban.**
