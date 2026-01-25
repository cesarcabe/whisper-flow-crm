# Diagnóstico: Relacionamento Vazio no Workspace

## Problema

No workspace `cd42b484-dbc0-4366-8387-65aaa7b14876`, não aparecem cards na visualização de "Relacionamento" dentro de "Leads e Clientes".

## Filtros Aplicados na View de Relacionamento

A view de Relacionamento usa `useContactClasses` que aplica os seguintes filtros:

**Arquivo:** `src/modules/kanban/presentation/hooks/useContactClasses.ts` (linhas 70-76)

```typescript
const { data: contacts, error } = await supabase
  .from('contacts')
  .select('id, name, phone, email, avatar_url, contact_class_id, workspace_id')
  .eq('workspace_id', workspaceId)
  .eq('is_visible', true)    // ← Filtro 1
  .eq('is_real', true)       // ← Filtro 2
  .order('name', { ascending: true });
```

**Depois exclui contatos de grupos (linhas 62-89):**
```typescript
// First, get contacts that belong to groups
const { data: groupConversations } = await supabase
  .from('conversations')
  .select('contact_id')
  .eq('workspace_id', workspaceId)
  .eq('is_group', true);

const groupContactIds = new Set((groupConversations || []).map(c => c.contact_id));

// Skip contacts that belong to groups
(contacts || []).forEach((contact) => {
  if (groupContactIds.has(contact.id)) return;  // ← Filtro 3: Exclui grupos
  // ...
});
```

## Queries de Diagnóstico

### 1. Verificar Total de Contatos no Workspace

```sql
SELECT 
  COUNT(*) as total_contacts,
  COUNT(*) FILTER (WHERE is_visible = true) as visible_contacts,
  COUNT(*) FILTER (WHERE is_real = true) as real_contacts,
  COUNT(*) FILTER (WHERE is_visible = true AND is_real = true) as visible_and_real
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876';
```

**Resultado esperado:**
- Se `total_contacts = 0`: Não há contatos no workspace
- Se `visible_and_real = 0`: Contatos existem mas não atendem aos filtros

---

### 2. Verificar Contatos que Atendem aos Filtros

```sql
SELECT 
  id,
  name,
  phone,
  is_visible,
  is_real,
  contact_class_id,
  created_at
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_visible = true
  AND is_real = true
ORDER BY name;
```

**Resultado esperado:**
- Se retornar vazio: Contatos não atendem aos filtros `is_visible = true` e `is_real = true`

---

### 3. Verificar Contatos que Pertencem a Grupos

```sql
-- Contatos que são grupos (serão excluídos)
SELECT 
  c.id,
  c.name,
  c.phone,
  c.is_real,
  c.is_visible,
  conv.is_group
FROM contacts c
INNER JOIN conversations conv ON c.id = conv.contact_id
WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND conv.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND conv.is_group = true
  AND c.is_visible = true
  AND c.is_real = true;
```

**Resultado esperado:**
- Se retornar muitos contatos: Eles serão excluídos da view de Relacionamento

---

### 4. Verificar Contatos que DEVEM Aparecer (Filtro Final)

```sql
-- Contatos que DEVEM aparecer na view de Relacionamento
WITH group_contacts AS (
  SELECT DISTINCT contact_id
  FROM conversations
  WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
    AND is_group = true
)
SELECT 
  c.id,
  c.name,
  c.phone,
  c.email,
  c.contact_class_id,
  c.is_visible,
  c.is_real
FROM contacts c
WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND c.is_visible = true
  AND c.is_real = true
  AND c.id NOT IN (SELECT contact_id FROM group_contacts)
ORDER BY c.name;
```

**Resultado esperado:**
- Se retornar vazio: Não há contatos que atendem TODOS os critérios
- Se retornar contatos: Eles DEVEM aparecer na view

---

### 5. Diagnóstico Completo (Todas as Causas Possíveis)

```sql
-- Diagnóstico completo
WITH stats AS (
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_visible = true) as visible,
    COUNT(*) FILTER (WHERE is_real = true) as real,
    COUNT(*) FILTER (WHERE is_visible = true AND is_real = true) as visible_and_real
  FROM contacts
  WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
),
group_contacts AS (
  SELECT DISTINCT contact_id
  FROM conversations
  WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
    AND is_group = true
),
final_contacts AS (
  SELECT COUNT(*) as final_count
  FROM contacts c
  WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
    AND c.is_visible = true
    AND c.is_real = true
    AND c.id NOT IN (SELECT contact_id FROM group_contacts)
)
SELECT 
  s.total as total_contacts,
  s.visible as visible_contacts,
  s.real as real_contacts,
  s.visible_and_real as visible_and_real_contacts,
  (SELECT COUNT(*) FROM group_contacts) as group_contacts_count,
  fc.final_count as contacts_that_should_appear
FROM stats s
CROSS JOIN final_contacts fc;
```

---

## Possíveis Causas e Soluções

### Causa 1: Não há contatos no workspace

**Sintoma:** `total_contacts = 0`

**Solução:**
- Verificar se contatos foram criados
- Verificar se contatos foram importados do WhatsApp
- Verificar se há mensagens/conversas que deveriam criar contatos

---

### Causa 2: Contatos com `is_visible = false`

**Sintoma:** `visible_contacts < total_contacts`

**Query para verificar:**
```sql
SELECT id, name, phone, is_visible, is_real
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_visible = false;
```

**Solução:**
```sql
-- Atualizar contatos para serem visíveis
UPDATE contacts
SET is_visible = true
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_visible = false
  AND is_real = true;
```

---

### Causa 3: Contatos com `is_real = false`

**Sintoma:** `real_contacts < total_contacts`

**Query para verificar:**
```sql
SELECT id, name, phone, is_visible, is_real, phone
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_real = false;
```

**Possíveis razões:**
- Contatos são grupos (phone LIKE 'group:%')
- Contatos são LIDs (phone LIKE 'lid:%')
- Contatos foram marcados como não reais

**Solução (apenas para contatos reais que foram marcados incorretamente):**
```sql
-- ATENÇÃO: Verificar antes de executar!
-- Isso não deve incluir grupos ou LIDs
UPDATE contacts
SET is_real = true
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_real = false
  AND is_visible = true
  AND phone NOT LIKE 'group:%'
  AND phone NOT LIKE 'lid:%';
```

---

### Causa 4: Todos os contatos pertencem a grupos

**Sintoma:** `group_contacts_count = visible_and_real_contacts`

**Query para verificar:**
```sql
SELECT 
  c.id,
  c.name,
  c.phone,
  conv.is_group
FROM contacts c
INNER JOIN conversations conv ON c.id = conv.contact_id
WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND c.is_visible = true
  AND c.is_real = true
  AND conv.is_group = true;
```

**Solução:**
- Isso é esperado: grupos não devem aparecer em Relacionamento
- Verificar se há contatos reais (não grupos) no workspace
- Se não houver, criar ou importar contatos reais

---

### Causa 5: Erro na Query (Console do Navegador)

**Sintoma:** Erro no console do navegador

**Verificar:**
1. Abrir DevTools (F12)
2. Ir para Console
3. Procurar por erros relacionados a `[ContactClasses]`
4. Verificar Network tab para ver se a query está falhando

**Possíveis erros:**
- Permissões RLS (Row Level Security) no Supabase
- Token de autenticação inválido
- Workspace ID incorreto

---

## Query de Correção Rápida (Use com Cautela)

Se você confirmar que os contatos devem aparecer mas não aparecem, execute esta query para diagnosticar:

```sql
-- Diagnóstico completo em uma query
SELECT 
  'Total de contatos' as categoria,
  COUNT(*) as quantidade
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'

UNION ALL

SELECT 
  'Contatos visíveis',
  COUNT(*)
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_visible = true

UNION ALL

SELECT 
  'Contatos reais',
  COUNT(*)
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_real = true

UNION ALL

SELECT 
  'Contatos visíveis E reais',
  COUNT(*)
FROM contacts
WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND is_visible = true
  AND is_real = true

UNION ALL

SELECT 
  'Contatos que são grupos',
  COUNT(DISTINCT c.id)
FROM contacts c
INNER JOIN conversations conv ON c.id = conv.contact_id
WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND conv.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND conv.is_group = true
  AND c.is_visible = true
  AND c.is_real = true

UNION ALL

SELECT 
  'Contatos que DEVEM aparecer',
  COUNT(*)
FROM contacts c
WHERE c.workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
  AND c.is_visible = true
  AND c.is_real = true
  AND c.id NOT IN (
    SELECT DISTINCT contact_id
    FROM conversations
    WHERE workspace_id = 'cd42b484-dbc0-4366-8387-65aaa7b14876'
      AND is_group = true
  );
```

---

## Checklist de Verificação

Execute as queries acima e verifique:

- [ ] Há contatos no workspace? (`total_contacts > 0`)
- [ ] Contatos são visíveis? (`visible_contacts > 0`)
- [ ] Contatos são reais? (`real_contacts > 0`)
- [ ] Contatos atendem ambos os filtros? (`visible_and_real > 0`)
- [ ] Contatos não são grupos? (`contacts_that_should_appear > 0`)
- [ ] Não há erros no console do navegador?
- [ ] Workspace ID está correto?

---

## Próximos Passos

1. Execute a query de diagnóstico completo (Causa 5)
2. Identifique qual filtro está excluindo os contatos
3. Aplique a solução correspondente
4. Recarregue a página e verifique se os cards aparecem

---

## Nota Importante

**NÃO execute UPDATEs sem verificar primeiro!**

Sempre execute as queries SELECT primeiro para entender o problema antes de fazer alterações nos dados.
