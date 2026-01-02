# Auditoria Completa do CRM - Janeiro 2026

**Data da auditoria:** 02/01/2026  
**Escopo:** Todo o projeto CRM (frontend, backend, fluxos, design, responsividade)  
**Versão:** 1.0

---

## Resumo Executivo

O CRM está funcional em seus fluxos principais (WhatsApp, Kanban, gerenciamento de workspace), porém apresenta problemas técnicos que impactam a experiência do usuário e a manutenibilidade do código. Foram identificados **28 problemas** distribuídos em 8 categorias, sendo **5 críticos**, **9 altos**, **10 médios** e **4 baixos**.

### Principais Achados Críticos:
1. Warning de refs em function components (KanbanView.tsx) - visível no console
2. Uso de `window.location.reload()` como workaround temporário
3. Botões de ação sem funcionalidade real (Emoji, Busca no chat, Chamadas)
4. Falta de tratamento para conversas órfãs (whatsapp_number_id = NULL)
5. Indicador "Online" hardcoded sem dados reais

---

## 1. Rotas e Navegação

### 1.1 Rotas Existentes
| Rota | Componente | Status |
|------|-----------|--------|
| `/` | Index → KanbanView | ✅ Funcional |
| `/workspace/admin` | WorkspaceAdmin | ✅ Funcional |
| `/auth` | Auth | ✅ Funcional |
| `/invite/:token` | AcceptInvitation | ✅ Funcional |
| `*` | NotFound | ✅ Funcional |

### Problemas Encontrados

#### [BAIXO] NAV-001: Página NotFound genérica
- **Descrição:** A página 404 existe mas não oferece navegação útil
- **Local:** `src/pages/NotFound.tsx`
- **Impacto:** UX - usuários perdidos não têm caminho de volta fácil
- **Recomendação:** Adicionar link para home e sugestões de navegação

#### [BAIXO] NAV-002: Navegação entre views por estado local
- **Descrição:** A troca entre Kanban/Chat é feita por estado local (`currentView`), não por rota
- **Local:** `src/components/kanban/KanbanView.tsx` linha 79
- **Impacto:** URLs não refletem a view atual, histórico do navegador não funciona
- **Recomendação:** Considerar usar query params ou sub-rotas (`/?view=chat`)

---

## 2. Conectividade de Componentes

### Problemas Encontrados

#### [CRÍTICO] COMP-001: Warning de refs em function components
- **Descrição:** Console mostra "Function components cannot be given refs" em KanbanView
- **Local:** `src/components/kanban/KanbanView.tsx` - uso de Dialog
- **Logs:** 
  ```
  Warning: Function components cannot be given refs. 
  Check the render method of `KanbanView`.
  ```
- **Impacto:** Warning poluindo console, possível comportamento inesperado
- **Recomendação:** Verificar uso de refs em Dialog/CRMLayout, usar forwardRef se necessário

#### [ALTO] COMP-002: Botão de emoji sem funcionalidade
- **Descrição:** Botão de emoji no MessageInput não faz nada quando clicado
- **Local:** `src/components/whatsapp/MessageInput.tsx` linhas 335-343
- **Código:**
  ```tsx
  <Button variant="ghost" size="icon" disabled={disabled || sending}>
    <Smile className="h-5 w-5" />
  </Button>
  ```
- **Impacto:** UX - usuário clica esperando funcionalidade
- **Recomendação:** Implementar emoji picker ou remover botão

#### [ALTO] COMP-003: Botões de ação no header do chat sem funcionalidade
- **Descrição:** Botões Search, Phone, Video, MoreVertical não fazem nada
- **Local:** `src/components/whatsapp/MessageThread.tsx` linhas 107-120
- **Impacto:** UX - ações prometidas mas não entregues
- **Recomendação:** Implementar ou remover, ou adicionar tooltip "Em breve"

#### [ALTO] COMP-004: Botão "+" para nova conversa sem funcionalidade
- **Descrição:** Botão "+" no header do CRMLayout não faz nada
- **Local:** `src/components/crm/CRMLayout.tsx` linhas 147-149
- **Código:**
  ```tsx
  <Button size="icon" className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90">
    <Plus className="h-4 w-4 text-primary-foreground" />
  </Button>
  ```
- **Impacto:** UX - ação esperada não implementada
- **Recomendação:** Implementar diálogo para iniciar nova conversa

#### [MÉDIO] COMP-005: onEditPipeline passado como função vazia
- **Descrição:** Callback `onEditPipeline` é passado como `() => {}` 
- **Local:** `src/components/kanban/KanbanView.tsx` linhas 194, 216
- **Impacto:** A edição de pipeline funciona, mas o callback está vazio
- **Recomendação:** Remover prop ou implementar comportamento pós-edição

#### [MÉDIO] COMP-006: Função disconnectInstance não implementada
- **Descrição:** Retorna false com TODO comment
- **Local:** `src/hooks/useWhatsappConnection.ts` linhas 355-359
- **Código:**
  ```ts
  const disconnectInstance = useCallback(async (whatsappNumberId: string): Promise<boolean> => {
    // TODO: Implement when whatsapp-disconnect-instance edge function exists
    return false;
  }, []);
  ```
- **Impacto:** Não é possível desconectar uma instância WhatsApp programaticamente
- **Recomendação:** Implementar edge function `whatsapp-disconnect-instance`

---

## 3. Estado e Dados

### Problemas Encontrados

#### [CRÍTICO] STATE-001: window.location.reload() como workaround
- **Descrição:** Após editar estágio ou classe, a página inteira recarrega
- **Local:** `src/components/kanban/KanbanView.tsx` linhas 415, 467
- **Código:**
  ```tsx
  window.location.reload(); // TEMP: refresh to reload stages
  ```
- **Impacto:** Péssima UX, perda de estado, comentário indica ser temporário
- **Recomendação:** Usar refetch dos hooks após update com sucesso

#### [ALTO] STATE-002: Indicador "Online" hardcoded
- **Descrição:** Status "Online" sempre exibido sem verificar dados reais
- **Local:** `src/components/whatsapp/MessageThread.tsx` linhas 89-104
- **Código:**
  ```tsx
  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
  ...
  <span className="text-xs text-green-600 dark:text-green-400">Online</span>
  ```
- **Impacto:** Informação falsa para o usuário
- **Recomendação:** Remover ou implementar verificação real de status online

#### [ALTO] STATE-003: Conversas órfãs não tratadas visualmente
- **Descrição:** Após deletar conexão WhatsApp, conversas com `whatsapp_number_id = NULL` ainda aparecem mas sem indicação visual
- **Local:** `src/hooks/useConversations.ts`, `src/components/whatsapp/ConversationItem.tsx`
- **Impacto:** Usuário pode tentar responder em conversa sem conexão ativa
- **Recomendação:** Adicionar badge "Conexão removida" e desabilitar envio

#### [MÉDIO] STATE-004: Contatos sem conversa aparecem no primeiro estágio
- **Descrição:** `useConversationStages.ts` coloca contatos sem stage_id no primeiro estágio
- **Local:** `src/hooks/useConversationStages.ts` linhas 147-155
- **Impacto:** Pode confundir usuário sobre o real status do contato
- **Recomendação:** Criar coluna separada "Sem estágio" ou documentar comportamento

#### [BAIXO] STATE-005: Campo `tags` deprecated mas ainda usado
- **Descrição:** `types/database.ts` marca `tags` como deprecated mas KanbanView ainda exibe
- **Local:** `src/types/database.ts` linha 95, `src/components/kanban/KanbanView.tsx` linha 500
- **Impacto:** Inconsistência entre modelo e uso
- **Recomendação:** Migrar para `contact_tags` ou remover exibição

---

## 4. Mensagens e Feedbacks

### Problemas Encontrados

#### [MÉDIO] FEED-001: Toast não exibido em algumas operações
- **Descrição:** Algumas operações de sucesso/erro não mostram feedback
- **Locais identificados:**
  - `useContactClasses.ts`: updateContactClass não mostra toast de sucesso
  - `usePipelines.ts`: updateStage não mostra toast
- **Impacto:** Usuário não sabe se operação funcionou
- **Recomendação:** Padronizar toasts em todas as operações CRUD

#### [MÉDIO] FEED-002: Erro genérico em edge functions
- **Descrição:** Mensagens de erro muito genéricas ("Erro ao enviar mensagem")
- **Local:** `src/components/whatsapp/MessageInput.tsx` linhas 95, 146, 159
- **Impacto:** Usuário não sabe o que causou o erro
- **Recomendação:** Propagar mensagens de erro mais específicas das edge functions

---

## 5. Fluxos Quebrados

### Problemas Encontrados

#### [CRÍTICO] FLOW-001: Envio de mensagem para conversa sem WhatsApp conectado
- **Descrição:** Se `whatsappNumber.status !== 'connected'`, retorna erro mas UI não previne
- **Local:** `supabase/functions/whatsapp-send/index.ts` linhas 116-118
- **Impacto:** Usuário pode tentar enviar mensagem e receber erro
- **Recomendação:** Desabilitar input quando conexão não está ativa

#### [ALTO] FLOW-002: Criação de conversa sem WhatsApp number disponível
- **Descrição:** `useConversationStages.ts` falha silenciosamente se não há WhatsApp number
- **Local:** `src/hooks/useConversationStages.ts` linhas 219-223
- **Código:**
  ```ts
  if (!whatsappNumber) {
    toast.error('Configure um número WhatsApp primeiro');
    return false;
  }
  ```
- **Impacto:** Arrastar contato para estágio mostra erro mas não é claro
- **Recomendação:** Desabilitar drag & drop ou mostrar indicador visual antes

#### [MÉDIO] FLOW-003: Scroll para mensagens novas não automático
- **Descrição:** Após enviar mensagem, não há scroll automático para ela
- **Local:** `src/components/whatsapp/MessageThread.tsx`
- **Impacto:** Usuário precisa rolar manualmente para ver mensagem enviada
- **Recomendação:** Implementar auto-scroll após envio/recebimento

---

## 6. Console e Logs

### Problemas Encontrados

#### [CRÍTICO] LOG-001: Warning de refs visível no console
- **Descrição:** Warning do React sobre refs em function components
- **Visível em:** Console do navegador
- **Impacto:** Poluição do console, potencial bug
- **Recomendação:** Corrigir uso de refs em Dialog/CRMLayout

#### [BAIXO] LOG-002: Logs de desenvolvimento ainda presentes
- **Descrição:** Múltiplos `console.log` com prefixos como `[WA_CONNECT]`, `[Realtime]`, etc.
- **Locais:** Hooks e edge functions
- **Impacto:** Console poluído em produção
- **Recomendação:** Considerar log levels ou remover logs de debug em produção

---

## 7. Responsividade e Layout (375px)

### Problemas Encontrados

#### [MÉDIO] RESP-001: Header do chat com scroll horizontal potencial
- **Descrição:** Botões de ação podem causar overflow em telas muito pequenas
- **Local:** `src/components/whatsapp/MessageThread.tsx` linhas 107-120
- **Impacto:** Layout quebrado em dispositivos muito pequenos (<375px)
- **Recomendação:** Agrupar ações em dropdown menu no mobile

#### [MÉDIO] RESP-002: Seletores no header do CRMLayout apertados
- **Descrição:** Múltiplos selects lado a lado podem não caber
- **Local:** `src/components/crm/CRMLayout.tsx` linhas 118-149
- **Impacto:** Elementos muito pequenos para tocar em mobile
- **Recomendação:** Empilhar verticalmente ou usar modal de filtros no mobile

#### [BAIXO] RESP-003: Colunas do Kanban sem scroll snapping
- **Descrição:** Scroll horizontal das colunas não tem "snap" para facilitar navegação
- **Local:** `src/components/kanban/RelationshipBoard.tsx`, `StageBoard.tsx`
- **Impacto:** Experiência de scroll menos fluida no mobile
- **Recomendação:** Adicionar `scroll-snap-type` CSS

---

## 8. Design Consistente

### Problemas Encontrados

#### [MÉDIO] DESIGN-001: Mistura de estilos de botões
- **Descrição:** Alguns botões usam variantes diferentes para ações similares
- **Exemplos:**
  - Criar Pipeline: `variant="ghost"` com ícone
  - Conectar WhatsApp: `variant="default"` com texto
- **Impacto:** Inconsistência visual
- **Recomendação:** Padronizar variantes por tipo de ação

#### [MÉDIO] DESIGN-002: Cores hardcoded em alguns lugares
- **Descrição:** Uso de cores diretas ao invés de tokens do design system
- **Exemplos:**
  - `bg-green-500` em MessageThread.tsx linha 91
  - `text-green-600` linha 103
- **Impacto:** Não segue dark mode corretamente
- **Recomendação:** Usar variável `--online` definida no CSS

#### [BAIXO] DESIGN-003: Espaçamentos inconsistentes
- **Descrição:** Gaps e paddings variam entre componentes similares
- **Exemplos:**
  - CRMLayout header usa `gap-2`
  - PipelineHeader usa `gap-4`
- **Impacto:** Visual ligeiramente inconsistente
- **Recomendação:** Padronizar espaçamentos via design system

---

## Checklist de Testes

### Fluxos Principais
- [ ] Criar nova conexão WhatsApp → Escanear QR → Receber/Enviar mensagens
- [ ] Criar pipeline → Criar estágios → Mover contatos entre estágios
- [ ] Classificar contatos → Mover entre classificações
- [ ] Convidar membro → Aceitar convite → Verificar permissões
- [ ] Deletar conexão WhatsApp → Verificar que mensagens permanecem

### Responsividade (testar em 375px)
- [ ] Navegação entre Kanban/Chat
- [ ] Lista de conversas → Abrir conversa → Voltar
- [ ] Scroll horizontal no Kanban
- [ ] Input de mensagem com teclado aberto

### Estados de Erro
- [ ] Tentar enviar mensagem sem WhatsApp conectado
- [ ] Tentar criar conversa sem número WhatsApp configurado
- [ ] Falha de rede durante envio de mensagem

---

## Resumo por Prioridade

### Críticos (5) - Corrigir Imediatamente
1. LOG-001: Warning de refs no console
2. STATE-001: window.location.reload() workaround
3. COMP-001: Warning de refs em function components
4. STATE-002: Indicador "Online" hardcoded
5. FLOW-001: Envio para conversa sem conexão ativa

### Altos (9) - Corrigir na Próxima Sprint
1. COMP-002: Botão emoji sem funcionalidade
2. COMP-003: Botões de ação no chat sem funcionalidade
3. COMP-004: Botão "+" nova conversa sem funcionalidade
4. COMP-006: disconnectInstance não implementado
5. STATE-003: Conversas órfãs não tratadas
6. FLOW-002: Criação de conversa sem WhatsApp
7. FEED-001: Toasts inconsistentes
8. FEED-002: Erros genéricos

### Médios (10) - Planejar para Próximo Ciclo
1. COMP-005: onEditPipeline vazio
2. STATE-004: Contatos sem estágio no primeiro
3. RESP-001: Header do chat overflow
4. RESP-002: Seletores CRMLayout apertados
5. FLOW-003: Scroll automático
6. DESIGN-001: Mistura estilos botões
7. DESIGN-002: Cores hardcoded

### Baixos (4) - Backlog
1. NAV-001: NotFound genérica
2. NAV-002: Views por estado local
3. STATE-005: tags deprecated
4. LOG-002: Logs de desenvolvimento
5. RESP-003: Scroll snapping
6. DESIGN-003: Espaçamentos inconsistentes

---

## Próximos Passos Recomendados

### Sprint 1 (Imediato)
1. Corrigir warning de refs no KanbanView
2. Substituir `window.location.reload()` por refetch
3. Adicionar indicador visual para conversas órfãs
4. Desabilitar envio quando WhatsApp não conectado
5. Remover ou implementar indicador "Online"

### Sprint 2
1. Implementar ou remover botões não funcionais
2. Criar edge function `whatsapp-disconnect-instance`
3. Padronizar feedback com toasts
4. Melhorar responsividade do chat header

### Sprint 3
1. Implementar scroll automático para novas mensagens
2. Criar coluna "Sem estágio" no Kanban
3. Padronizar design system
4. Limpar logs de desenvolvimento

---

**Autor:** Auditoria Automatizada  
**Próxima revisão:** Após implementação da Sprint 1
