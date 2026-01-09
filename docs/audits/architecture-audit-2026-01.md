# Auditoria Técnica de Arquitetura - CRM WhatsApp

**Data**: 09/01/2026  
**Versão**: 1.0  
**Arquiteto**: Auditoria de Software Sênior

---

## 1. DIAGNÓSTICO GERAL DA ARQUITETURA

### 1.1 Situação Atual

O projeto é um **CRM com integração WhatsApp** construído em React + TypeScript com Supabase como backend. A arquitetura atual pode ser classificada como **"Feature-First Monolítica"** - não segue Clean Architecture nem padrões de separação de camadas claramente definidos.

### 1.2 Estrutura de Camadas Identificada

```
┌─────────────────────────────────────────────────────────────┐
│                         UI LAYER                             │
│  src/components/ + src/pages/                               │
│  ⚠️ Contém regras de negócio e chamadas diretas ao DB       │
├─────────────────────────────────────────────────────────────┤
│                     DATA ACCESS LAYER                        │
│  src/hooks/use*.ts                                          │
│  ⚠️ Mistura: fetch, mutations, business rules, state        │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│  src/integrations/supabase/ + supabase/functions/           │
│  ✅ Edge Functions bem isoladas                              │
├─────────────────────────────────────────────────────────────┤
│                      DOMAIN LAYER                            │
│  src/types/database.ts                                      │
│  ⚠️ Apenas tipos, sem regras de negócio                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Principais Problemas Identificados

1. **Ausência de camada de domínio** - Não existem entidades, value objects, ou serviços de domínio
2. **Hooks híbridos** - Os hooks (`usePipelines`, `useContacts`, etc.) combinam:
   - Acesso a dados (queries/mutations)
   - Estado local (useState)
   - Regras de negócio (validações, cálculos de posição)
   - Side effects (toast notifications)
3. **Componentes de UI com lógica de negócio** - `KanbanView.tsx` com 567 linhas contendo regras de negócio
4. **Dependência direta do SDK** - Componentes importam `supabase` diretamente

---

## 2. LISTA DE ACHADOS TÉCNICOS

### Achado #1: God Component - KanbanView.tsx
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Componente com 567+ linhas, gerenciando múltiplos domínios (pipelines, stages, contacts, classes, groups) |
| **Local** | `src/components/kanban/KanbanView.tsx` |
| **Princípio Violado** | SRP (Single Responsibility), Clean Architecture (UI faz tudo) |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Dificuldade de manutenção, testes impossíveis, regressões frequentes |

### Achado #2: Hook God Service - usePipelines.ts
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Hook com 413 linhas gerenciando pipelines, stages E cards. Combina fetch, mutations, regras de posição |
| **Local** | `src/hooks/usePipelines.ts` |
| **Princípio Violado** | SRP, DIP (dependência direta do Supabase) |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Impossível testar unitariamente, acoplamento forte |

### Achado #3: Regras de Negócio em Componentes UI
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | `MessageThread.tsx` (linha 62-87) contém lógica de atualização de estágio de venda direto no componente |
| **Local** | `src/components/whatsapp/MessageThread.tsx` |
| **Princípio Violado** | Clean Architecture (UI fazendo mutations), SRP |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Duplicação de lógica se mesma ação for necessária em outro lugar |

### Achado #4: Chamadas Diretas ao Supabase em Componentes
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | `KanbanView.tsx` (linha 446-460) faz `supabase.from('stages').update()` diretamente no onClick |
| **Local** | `src/components/kanban/KanbanView.tsx:446` |
| **Princípio Violado** | DIP, Clean Architecture (UI acessa infraestrutura) |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Violação de encapsulamento, código não testável |

### Achado #5: Duplicação de Tipos
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | `ContactClass` definida em `src/types/database.ts` E em `src/hooks/useContactClasses.ts` (linhas 7-15) |
| **Local** | `src/types/database.ts`, `src/hooks/useContactClasses.ts` |
| **Princípio Violado** | DRY (Don't Repeat Yourself), pode divergir |
| **Risco** | 🟡 **Baixo** |
| **Consequência** | Tipos podem ficar dessincronizados, bugs de tipagem |

### Achado #6: Acoplamento Contexto → Supabase
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | `WorkspaceContext.tsx` faz queries diretamente ao Supabase sem abstração |
| **Local** | `src/contexts/WorkspaceContext.tsx:30-75` |
| **Princípio Violado** | DIP (contexto de negócio depende de infraestrutura) |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Impossível mockar para testes, lock-in ao Supabase |

### Achado #7: Toast Notifications em Hooks de Dados
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Todos os hooks (`useContacts`, `usePipelines`, `useWorkspaceMembers`) disparam `toast.success/error` diretamente |
| **Local** | `src/hooks/*.ts` (múltiplos arquivos) |
| **Princípio Violado** | SRP (hooks fazem data access + UI feedback) |
| **Risco** | 🟡 **Baixo** |
| **Consequência** | Impossível reutilizar lógica sem mostrar toast, dificulta testes |

### Achado #8: Edge Function Gigante - evolution-webhook
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Arquivo com 824+ linhas, contendo múltiplos handlers de eventos misturados |
| **Local** | `supabase/functions/evolution-webhook/index.ts` |
| **Princípio Violado** | SRP, OCP (adicionar novo evento requer alterar arquivo existente) |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Alto risco de bugs ao adicionar features, difícil debugging |

### Achado #9: Ausência de Validação de Domínio
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Não existe validação de regras de negócio antes de mutations (ex: validar phone format, email format) |
| **Local** | Todos os hooks de criação (useContacts.createContact, usePipelines.createCard) |
| **Princípio Violado** | Domain-Driven Design, Clean Architecture |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Dados inválidos podem ser inseridos, dependência de validação do DB |

### Achado #10: Estado Duplicado entre Hooks
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | `usePipelines` e `useConversationStages` buscam os mesmos pipelines independentemente |
| **Local** | `src/hooks/usePipelines.ts`, `src/hooks/useConversationStages.ts` |
| **Princípio Violado** | DRY, ineficiência de recursos |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Dados dessincronizados, requests duplicados, inconsistência de UI |

### Achado #11: MessageInput com Lógica de Envio
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Componente de input contém toda a lógica de envio de mensagem (texto, imagem, áudio) |
| **Local** | `src/components/whatsapp/MessageInput.tsx` (435 linhas) |
| **Princípio Violado** | SRP (componente UI faz data mutations) |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Componente não reutilizável, difícil de testar |

### Achado #12: Falta de Camada de Repositório
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Queries SQL espalhadas por toda a aplicação sem abstração |
| **Local** | Todos os hooks e alguns componentes |
| **Princípio Violado** | Clean Architecture, DIP |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Mudanças no schema requerem alterações em múltiplos arquivos |

### Achado #13: useConversations com Lógica Complexa de Batching
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Hook contém lógica complexa de batching inline (deveria ser utilitário) |
| **Local** | `src/hooks/useConversations.ts:60-108` |
| **Princípio Violado** | SRP, reusabilidade |
| **Risco** | 🟡 **Baixo** |
| **Consequência** | Lógica não reutilizável para outros hooks que podem precisar de batching |

### Achado #14: Realtime Subscriptions Não Centralizadas
| Aspecto | Detalhes |
|---------|----------|
| **Problema** | Cada hook gerencia suas próprias subscriptions sem padrão centralizado |
| **Local** | `useConversations.ts:142-244`, `useMessages.ts:67-122` |
| **Princípio Violado** | DRY, gerenciamento de recursos |
| **Risco** | 🟠 **Médio** |
| **Consequência** | Memory leaks potenciais, subscriptions duplicadas, complexidade |

---

## 3. NOTA GERAL DE ARQUITETURA

| Critério | Nota (0-10) | Observação |
|----------|-------------|------------|
| Separação de Camadas | 3 | Quase inexistente |
| SOLID Compliance | 4 | Violações de SRP e DIP frequentes |
| Testabilidade | 2 | Quase impossível testar unitariamente |
| Manutenibilidade | 5 | Funciona, mas frágil |
| Escalabilidade | 4 | Problemas surgirão com crescimento |
| Reutilização | 4 | Componentes muito específicos |
| **NOTA FINAL** | **3.7/10** | Arquitetura funcional mas com débito técnico significativo |

---

## 4. SUGESTÃO DE REFATORAÇÃO INCREMENTAL

### 4.1 O Que Pode Ser Ajustado AGORA (Baixo Risco)

1. **Extrair utilitário de batching** - Mover lógica de `useConversations.ts:60-108` para `src/lib/supabase-utils.ts`

2. **Remover toasts dos hooks** - Retornar `{ success: boolean, error?: string }` e deixar chamador decidir feedback

3. **Unificar tipos** - Remover duplicação em `useContactClasses.ts`, usar apenas `src/types/database.ts`

4. **Extrair mutations de componentes** - Mover o `supabase.from().update()` do `KanbanView.tsx:446` para o hook existente

5. **Criar helper para realtime** - Centralizar lógica de subscription em `src/lib/realtime-manager.ts`

### 4.2 O Que Deve Ser Planejado DEPOIS (Médio Prazo)

1. **Dividir `usePipelines`** em:
   - `usePipelines` (apenas pipelines)
   - `useStages` (operações de stages)
   - `useCards` (operações de cards)

2. **Dividir `KanbanView`** em:
   - `KanbanView` (orquestrador simples)
   - `KanbanDialogsManager` (todos os dialogs)
   - `KanbanBoardSelector` (seleção de board type)

3. **Criar camada de repositório**:
   ```
   src/repositories/
   ├── PipelineRepository.ts
   ├── ContactRepository.ts
   ├── ConversationRepository.ts
   └── MessageRepository.ts
   ```

4. **Refatorar `evolution-webhook`** em handlers separados:
   ```
   supabase/functions/evolution-webhook/
   ├── handlers/
   │   ├── connection-update.ts
   │   ├── message-upsert.ts
   │   └── qrcode-updated.ts
   └── index.ts
   ```

### 4.3 O Que NÃO Deve Ser Mexido Agora

1. **AuthContext/WorkspaceContext** - Funcionam bem, refatorar pode quebrar auth flow
2. **Estrutura de páginas** - Atual é simples e funcional
3. **Edge functions de envio** (`whatsapp-send`, `whatsapp-send-image`) - Estão bem isoladas
4. **Sistema de realtime** - Funciona, mudar pode introduzir bugs de sincronização
5. **Tipos do Supabase** (`src/integrations/supabase/types.ts`) - Arquivo gerado automaticamente

---

## 5. ESTRUTURA IDEAL SUGERIDA (Referência Futura)

```
src/
├── domain/                      # CAMADA DE DOMÍNIO (núcleo)
│   ├── entities/
│   │   ├── Contact.ts           # Entidade com validações
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   └── Pipeline.ts
│   ├── value-objects/
│   │   ├── Phone.ts             # Validação de telefone
│   │   └── Email.ts
│   └── services/
│       ├── ConversationService.ts
│       └── MessageService.ts
│
├── application/                 # CAMADA DE APLICAÇÃO (use cases)
│   ├── use-cases/
│   │   ├── SendMessage.ts
│   │   ├── MoveContactToStage.ts
│   │   └── CreatePipeline.ts
│   └── ports/                   # Interfaces (contratos)
│       ├── IConversationRepository.ts
│       └── IMessageGateway.ts
│
├── infrastructure/              # CAMADA DE INFRAESTRUTURA
│   ├── repositories/
│   │   ├── SupabaseConversationRepository.ts
│   │   └── SupabasePipelineRepository.ts
│   ├── gateways/
│   │   └── EvolutionWhatsAppGateway.ts
│   └── supabase/
│       └── client.ts
│
├── presentation/                # CAMADA DE APRESENTAÇÃO
│   ├── components/
│   │   ├── kanban/
│   │   └── whatsapp/
│   ├── hooks/                   # Apenas binding de UI, sem lógica
│   │   ├── useConversationList.ts
│   │   └── useMessageThread.ts
│   ├── contexts/
│   └── pages/
│
└── shared/                      # UTILITÁRIOS COMPARTILHADOS
    ├── lib/
    └── types/
```

### Direção das Dependências (Clean Architecture)

```
┌──────────────────────────────────────────────────────────┐
│              PRESENTATION (UI, hooks, pages)              │
│                          ↓                                │
│             APPLICATION (use-cases, ports)                │
│                          ↓                                │
│                   DOMAIN (entities, VOs)                  │
│                          ↑                                │
│        INFRASTRUCTURE (repositories, gateways)           │
└──────────────────────────────────────────────────────────┘

Regra: Camadas internas NÃO conhecem camadas externas
```

---

## 6. FLUXOS PRINCIPAIS ANALISADOS

### Fluxo 1: Enviar Mensagem WhatsApp

```
UI (MessageInput.tsx)
    ↓ handleSendText() → supabase.functions.invoke('whatsapp-send')
    ↓
Edge Function (whatsapp-send/index.ts)
    ↓ Valida auth → Busca conversation → Insere message
    ↓ Chama Evolution API
    ↓
Supabase (messages table)
    ↓ Realtime trigger
    ↓
UI (useMessages hook)
    → Atualiza estado local

⚠️ PROBLEMAS:
- UI chama edge function diretamente (sem use case intermediário)
- Lógica de retry/error handling no componente
- Sem validação de domínio antes de envio
```

### Fluxo 2: Mover Card no Kanban

```
UI (KanbanCard via DnD)
    ↓ onDragEnd
    ↓
usePipelines.moveCard()
    ↓ supabase.from('cards').update({ stage_id, position })
    ↓
Supabase (cards table)
    ↓
usePipelines.fetchPipelineWithStages()
    → Refetch completo do pipeline

⚠️ PROBLEMAS:
- Full refetch após cada move (ineficiente)
- Regra de posição calculada no hook
- Toast disparado no hook
```

### Fluxo 3: Receber Mensagem via Webhook

```
Evolution API → Webhook
    ↓
Edge Function (evolution-webhook/index.ts)
    ↓ extractEvent() → normalizeEventType()
    ↓ ensureWhatsappNumber() → upsertContact() → upsertConversation()
    ↓ INSERT INTO messages
    ↓
Supabase Realtime
    ↓
useMessages hook (subscription)
    ↓
UI (MessageThread.tsx)

⚠️ PROBLEMAS:
- Edge function com 824 linhas (god function)
- Lógica de upsert complexa inline
- Sem separação de handlers por tipo de evento
```

---

## 7. CONCLUSÃO

O projeto está funcional mas carrega **débito técnico significativo**. A arquitetura atual dificulta:

1. **Testes automatizados** - Componentes e hooks fazem muito
2. **Onboarding de devs** - Arquivos grandes, lógica espalhada
3. **Adição de features** - Alto risco de regressões
4. **Manutenção** - Encontrar onde algo acontece é difícil

### Recomendação Final

Priorizar as **melhorias de baixo risco** (seção 4.1) antes de lançar em produção. Planejar refatorações maiores para sprints dedicadas após estabilização.

A nota **3.7/10** reflete uma arquitetura que funciona mas não escala bem. Com as melhorias sugeridas, é possível chegar a **6-7/10** sem reescrever o projeto.

---

*Documento gerado em 09/01/2026 - Auditoria de Arquitetura v1.0*
