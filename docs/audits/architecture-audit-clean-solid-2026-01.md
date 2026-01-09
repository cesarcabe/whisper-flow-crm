# Auditoria Técnica de Arquitetura - CRM WhatsApp

**Data:** 2026-01-09  
**Versão do Projeto:** 1.0.0  
**Auditor:** Lovable AI Architect  

---

## 1. DIAGNÓSTICO GERAL DA ARQUITETURA

### Situação Atual

O projeto é um **CRM com integração WhatsApp** construído em React + TypeScript + Supabase. A arquitetura atual pode ser classificada como **"Hooks-Driven Architecture"** - uma abordagem comum em projetos React, mas que apresenta desafios significativos de manutenção e escalabilidade conforme o projeto cresce.

### Estrutura de Pastas Atual

```
src/
├── components/          # Componentes de UI (kanban, whatsapp, workspace)
├── contexts/            # Contextos React (Auth, Workspace)
├── hooks/               # Hooks customizados (~20 arquivos, ~4000+ linhas)
├── pages/               # Páginas/Rotas
├── core/                # Tentativa inicial de domain layer (quase vazio)
│   ├── domain/          # Vazio
│   ├── ports/           # Vazio
│   └── use-cases/       # 1 arquivo (calculateCardPosition.ts)
├── infra/               # Infraestrutura (vazio, apenas .gitkeep)
├── integrations/        # Cliente Supabase
├── types/               # Tipos TypeScript
└── lib/                 # Utilitários
```

### Resumo Executivo

| Aspecto | Status | Observação |
|---------|--------|------------|
| **Camada de Domínio** | 🔴 Ausente | Sem entidades, value objects ou regras de negócio isoladas |
| **Casos de Uso** | 🟡 Incipiente | Apenas 1 arquivo criado recentemente |
| **Separação UI/Lógica** | 🔴 Fraca | Hooks misturam estado, lógica e chamadas Supabase |
| **Inversão de Dependências** | 🔴 Ausente | Supabase SDK usado diretamente em toda aplicação |
| **Testabilidade** | 🔴 Baixa | Sem abstrações, difícil mockar dependências |
| **Escalabilidade** | 🟡 Limitada | Código funcional mas rígido |

---

## 2. ANÁLISE DETALHADA - CLEAN ARCHITECTURE

### 2.1 Regras de Negócio

**Onde estão hoje?**

As regras de negócio estão **espalhadas** em múltiplas camadas:

| Local | Exemplo de Regra de Negócio |
|-------|----------------------------|
| `usePipelines.ts` | Cálculo de posição de cards, lógica de movimentação |
| `useConversationStages.ts` | Regras de movimentação de conversas entre estágios |
| `evolution-webhook/index.ts` | Normalização de telefone, criação de contatos, regras de upsert |
| `useContactClasses.ts` | Lógica de classificação de contatos |
| `KanbanView.tsx` | Decisões sobre qual board exibir, lógica de filtros |
| `MessageThread.tsx` | Regras de agrupamento de mensagens por data |

**Problemas identificados:**

1. **Sem camada de domínio**: Não existem entidades de domínio que encapsulem regras (Contact, Conversation, Pipeline são apenas tipos)
2. **Lógica duplicada**: Normalização de telefone existe em múltiplos lugares
3. **Regras acopladas a infraestrutura**: Validações ocorrem dentro de chamadas Supabase

### 2.2 Casos de Uso / Lógica de Aplicação

**Situação atual:**

- **Hooks como "God Services"**: Cada hook (`usePipelines`, `useConversations`, etc.) é uma combinação de:
  - Estado local
  - Fetching de dados
  - Mutations
  - Side effects (toasts, refetch)
  - Subscriptions realtime
  
- **Ausência de Use Cases explícitos**: Ações como "mover card para outro estágio" ou "enviar mensagem WhatsApp" não são operações isoladas e testáveis

### 2.3 Camada de Interface (UI)

**Componentes tomando decisões de negócio:**

| Componente | Decisão de Negócio Indevida |
|------------|---------------------------|
| `KanbanView.tsx` (567 linhas) | Orquestra 4 hooks, gerencia 15+ estados, toma decisões de navegação |
| `MessageThread.tsx` | Agrupa mensagens por data, decide status de estágios |
| `CRMLayout.tsx` | Filtra conversas, gerencia estado de conexão |
| `MessageInput.tsx` | Valida tipos/tamanhos de arquivo (regra de negócio) |

### 2.4 Direção das Dependências

```
┌─────────────────────────────────────────────────────────────────┐
│                          ATUAL (Incorreto)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Pages → Components → Hooks → Supabase SDK                     │
│              ↓                    ↓                              │
│          contexts ─────────→ Supabase SDK                       │
│                                                                  │
│   Edge Functions → Supabase SDK (diretamente)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          IDEAL (Clean Architecture)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Frameworks (React/Supabase)                                   │
│         ↓                                                        │
│   Adapters (Repositories, Controllers)                          │
│         ↓                                                        │
│   Use Cases (Application Layer)                                 │
│         ↓                                                        │
│   Entities (Domain Layer) ← Núcleo estável                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. ANÁLISE SOLID

### 3.1 SRP - Single Responsibility Principle

| Arquivo | Linhas | Responsabilidades Identificadas | Violação |
|---------|--------|--------------------------------|----------|
| `usePipelines.ts` | 411 | Fetch pipelines, fetch stages, fetch cards, CRUD pipeline, CRUD stage, CRUD cards, estado, subscriptions | ✅ Grave |
| `useConversationStages.ts` | 323 | Fetch pipelines, fetch conversations, fetch contacts, move conversation, update stage, estado | ✅ Grave |
| `useConversations.ts` | 256 | Fetch conversations, fetch contacts, fetch messages preview, realtime subscriptions, batching | ✅ Moderado |
| `KanbanView.tsx` | 567 | Renderização, 15 estados de diálogo, orquestração de 4 hooks, navegação, handlers | ✅ Grave |
| `evolution-webhook/index.ts` | 824 | Parse webhook, idempotência, upsert contact, upsert conversation, handle messages, handle status, download media | ✅ Grave |
| `MessageInput.tsx` | 435 | Renderização, validação de arquivo, conversão base64, gravação de áudio, envio de 3 tipos diferentes | ✅ Moderado |

### 3.2 OCP - Open/Closed Principle

**Pontos que exigem modificação de código existente:**

1. **Adicionar novo tipo de mensagem** (ex: vídeo, documento):
   - Modificar `MessageInput.tsx` (adicionar handler)
   - Modificar `MessageBubble.tsx` (renderização)
   - Modificar `evolution-webhook/index.ts` (parsing)
   - Criar nova Edge Function

2. **Adicionar novo provider de WhatsApp**:
   - Modificar `evolution-webhook/index.ts`
   - Modificar todas Edge Functions de envio

3. **Adicionar novo tipo de board**:
   - Modificar `KanbanView.tsx` diretamente

### 3.3 LSP - Liskov Substitution Principle

**Não há interfaces/abstrações** para verificar LSP propriamente, mas existem inconsistências:

- `useConversationStages` e `usePipelines` ambos gerenciam "pipelines" mas com contratos diferentes
- Funções `updateStage` em diferentes hooks têm comportamentos distintos (uma dispara toast, outra não)

### 3.4 ISP - Interface Segregation Principle

**Hooks expõem interfaces muito grandes:**

```typescript
// usePipelines retorna 13 métodos/propriedades
return {
  pipelines, activePipeline, loading,
  setActivePipeline, fetchPipelines,
  createPipeline, updatePipeline, deletePipeline,
  createStage, updateStage, deleteStage,
  moveCard, createCard, updateCard, deleteCard,
};
```

**Problema**: Componentes que só precisam ler pipelines são forçados a receber toda a interface de mutations.

### 3.5 DIP - Dependency Inversion Principle

**Violação sistemática em todo o projeto:**

```typescript
// Padrão em TODOS os hooks:
import { supabase } from '@/integrations/supabase/client';

// Dependência direta do SDK concreto
const { data, error } = await supabase.from('pipelines').select('*');
```

**Consequências:**
- Impossível testar hooks sem Supabase real
- Impossível trocar provider de banco
- Lógica de negócio acoplada a detalhes de implementação

---

## 4. RISCOS ARQUITETURAIS

### 4.1 "God Services"

| Arquivo | Linhas | Risco |
|---------|--------|-------|
| `evolution-webhook/index.ts` | 824+ | 🔴 **Crítico** - Toda lógica de webhook em um arquivo |
| `KanbanView.tsx` | 567 | 🔴 **Alto** - Componente orquestra sistema inteiro |
| `usePipelines.ts` | 411 | 🟡 **Médio** - Hook com muitas responsabilidades |
| `useConversationStages.ts` | 323 | 🟡 **Médio** - Duplica lógica de pipelines |

### 4.2 Regras de Negócio Espalhadas

```
📁 Normalização de telefone:
   - evolution-webhook/index.ts (linha 35-40)
   - Potencialmente em outros places

📁 Cálculo de posição:
   - calculateCardPosition.ts ✅ (extraído)
   - useContactClasses.ts (linha 116-117) - ainda inline

📁 Validação de arquivos:
   - MessageInput.tsx (linhas 19-20, 64-75)
```

### 4.3 Lógica Crítica em UI

| Componente | Lógica Crítica |
|------------|----------------|
| `MessageThread.tsx` | Agrupamento de mensagens por data (função pura misturada com UI) |
| `ConversationFilters.tsx` | Hook `useConversationFilters` com lógica de filtro |
| `KanbanView.tsx` | Decisões de qual board exibir baseado em estado |

### 4.4 Acoplamento entre Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ KanbanView.tsx                                              │
├─────────────────────────────────────────────────────────────┤
│ Depende de:                                                 │
│   • usePipelines (Supabase → pipelines, stages, cards)     │
│   • useContacts (Supabase → contacts)                       │
│   • useContactClasses (Supabase → contact_classes)         │
│   • useConversationStages (Supabase → pipelines, convs)    │
│   • useGroupClasses (Supabase → group_classes)             │
│   • useAuth (Contexto)                                      │
│   • react-router-dom (URL params)                           │
│   • sonner (Toasts)                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Baixa Testabilidade

- **0% de cobertura de testes unitários** (sem arquivos de teste)
- **Impossível testar hooks** sem ambiente Supabase
- **Funções puras misturadas com side effects** dificultam isolamento

---

## 5. FLUXOS PRINCIPAIS

### 5.1 Fluxo: Receber Mensagem WhatsApp

```
┌─────────────────────────────────────────────────────────────────┐
│ Evolution API → Webhook                                         │
│      ↓                                                          │
│ evolution-webhook/index.ts                                      │
│   ├── Valida API Key (workspace_api_keys)                      │
│   ├── Idempotência (webhook_deliveries)                        │
│   ├── Normaliza evento                                          │
│   ├── upsertContact() ← REGRA DE NEGÓCIO NO EDGE              │
│   │     └── Decide nome do contato                             │
│   ├── upsertConversation() ← REGRA DE NEGÓCIO NO EDGE         │
│   │     └── Cria/atualiza conversa                             │
│   ├── downloadAndStoreMedia() ← LÓGICA DE STORAGE             │
│   └── Insert message                                            │
│      ↓                                                          │
│ Realtime Subscription (useConversations/useMessages)           │
│      ↓                                                          │
│ UI atualiza automaticamente                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Problemas identificados:**
- ❌ Regras de negócio (upsert contact, normalização) estão na Edge Function
- ❌ Impossível reutilizar lógica de upsert em outro contexto
- ❌ Edge Function com 824 linhas - impossível testar partes isoladas

### 5.2 Fluxo: Mover Conversa para Outro Estágio

```
┌─────────────────────────────────────────────────────────────────┐
│ MessageThread.tsx → handleStageChange(newStageId)              │
│      ↓                                                          │
│ useConversationStages.updateConversationStage()                │
│   ├── supabase.from('conversations').update()                  │
│   └── fetchPipelineWithConversations() ← REFETCH COMPLETO     │
│      ↓                                                          │
│ UI atualiza (estado local do hook)                              │
│      ↓                                                          │
│ MessageThread.tsx → toast.success()                             │
└─────────────────────────────────────────────────────────────────┘
```

**Problemas identificados:**
- ❌ Componente UI (MessageThread) gerencia toast
- ❌ Refetch completo após cada mudança (performance)
- ❌ Sem validação de regra de negócio (ex: estágio existe? pertence ao pipeline?)

### 5.3 Fluxo: Enviar Mensagem de Texto

```
┌─────────────────────────────────────────────────────────────────┐
│ MessageInput.tsx → handleSendText()                             │
│   ├── Validação inline (message.trim())                        │
│   └── supabase.functions.invoke('whatsapp-send')               │
│         ↓                                                       │
│ whatsapp-send/index.ts                                          │
│   ├── Busca conversation, contact, whatsapp_number             │
│   ├── Chama Evolution API                                       │
│   └── Insert message no banco                                   │
│         ↓                                                       │
│ Realtime → useMessages atualiza                                 │
│         ↓                                                       │
│ MessageThread re-renderiza                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Problemas identificados:**
- ⚠️ Edge Function faz fetches múltiplos (3 queries separadas)
- ⚠️ Validação mínima no frontend
- ❌ Sem retry/queue para falhas

---

## 6. LISTA DE ACHADOS TÉCNICOS (MÍNIMO 10)

### Achado #1: God Hook - usePipelines

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Hook com 411 linhas gerenciando estado, CRUD de 3 entidades, subscriptions |
| **Onde** | `src/hooks/usePipelines.ts` |
| **Princípio Violado** | SRP, DIP |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Impossível testar partes isoladas; mudança em pipelines afeta stages e cards |

### Achado #2: Edge Function Monolítica

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Arquivo de 824+ linhas com toda lógica de webhook, criação de contatos, conversas, media |
| **Onde** | `supabase/functions/evolution-webhook/index.ts` |
| **Princípio Violado** | SRP, OCP |
| **Risco** | 🔴 **Crítico** |
| **Consequência** | Manutenção extremamente difícil; qualquer mudança pode quebrar fluxo inteiro |

### Achado #3: KanbanView como Orquestrador

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Componente com 567 linhas, 15+ useState, 4 hooks de dados, lógica de navegação |
| **Onde** | `src/components/kanban/KanbanView.tsx` |
| **Princípio Violado** | SRP |
| **Risco** | 🔴 **Alto** |
| **Consequência** | Componente frágil; qualquer mudança de UI pode afetar lógica de negócio |

### Achado #4: Dependência Direta do Supabase SDK

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Todos os hooks importam e usam `supabase` diretamente |
| **Onde** | `src/hooks/*`, `src/contexts/*`, `src/components/whatsapp/MessageInput.tsx` |
| **Princípio Violado** | DIP |
| **Risco** | 🟡 **Médio** |
| **Consequência** | Zero testabilidade; impossível trocar provider; lógica acoplada a SDK |

### Achado #5: Duplicação de Lógica de Pipelines

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | `usePipelines` e `useConversationStages` ambos gerenciam pipelines com lógicas diferentes |
| **Onde** | `src/hooks/usePipelines.ts`, `src/hooks/useConversationStages.ts` |
| **Princípio Violado** | DRY, SRP |
| **Risco** | 🟡 **Médio** |
| **Consequência** | Bugs por inconsistência; manutenção dobrada |

### Achado #6: Camada de Domínio Vazia

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Pasta `src/core/domain/` criada mas vazia; sem entidades de domínio |
| **Onde** | `src/core/` |
| **Princípio Violado** | Clean Architecture (ausência de camada) |
| **Risco** | 🟡 **Médio** |
| **Consequência** | Regras de negócio dispersas; validações duplicadas |

### Achado #7: Validações de Negócio em UI

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Validações de arquivo (tipo, tamanho) feitas no componente de input |
| **Onde** | `src/components/whatsapp/MessageInput.tsx` (linhas 64-75) |
| **Princípio Violado** | Clean Architecture (UI com regras) |
| **Risco** | 🟢 **Baixo** |
| **Consequência** | Validações não reutilizáveis; inconsistência se houver outro input |

### Achado #8: Side Effects Misturados com Queries

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Funções de mutation disparam toast e refetch no mesmo local |
| **Onde** | `src/hooks/useContacts.ts`, `src/hooks/useContactClasses.ts` |
| **Princípio Violado** | SRP |
| **Risco** | 🟢 **Baixo** |
| **Consequência** | Impossível chamar mutation sem side effects; dificulta composição |

### Achado #9: Hooks com Interfaces Grandes

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | `usePipelines` retorna 14 itens; componentes recebem mais do que precisam |
| **Onde** | `src/hooks/usePipelines.ts` (retorno) |
| **Princípio Violado** | ISP |
| **Risco** | 🟢 **Baixo** |
| **Consequência** | Acoplamento desnecessário; re-renders por mudanças não utilizadas |

### Achado #10: Ausência de Repository Pattern

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Queries Supabase inline em cada hook; sem abstração de acesso a dados |
| **Onde** | Todos os hooks em `src/hooks/` |
| **Princípio Violado** | DIP, Clean Architecture |
| **Risco** | 🟡 **Médio** |
| **Consequência** | Queries duplicadas; impossível cachear ou otimizar centralmente |

### Achado #11: Lógica de Data em Componente

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | Função `MessagesWithDateSeparators` contém lógica de agrupamento misturada com renderização |
| **Onde** | `src/components/whatsapp/MessageThread.tsx` (linhas 389-438) |
| **Princípio Violado** | SRP |
| **Risco** | 🟢 **Baixo** |
| **Consequência** | Lógica pura não testável isoladamente |

### Achado #12: Tipos Duplicados

| Aspecto | Detalhe |
|---------|---------|
| **Problema** | `ContactClass` definido em `useContactClasses.ts` e `types/database.ts` |
| **Onde** | `src/hooks/useContactClasses.ts`, `src/types/database.ts` |
| **Princípio Violado** | DRY |
| **Risco** | 🟢 **Baixo** |
| **Consequência** | Inconsistência potencial; confusão sobre qual tipo usar |

---

## 7. NOTA GERAL DE ARQUITETURA

| Critério | Nota | Peso | Ponderado |
|----------|------|------|-----------|
| Separação de Camadas | 2/10 | 25% | 0.50 |
| Princípios SOLID | 3/10 | 25% | 0.75 |
| Testabilidade | 1/10 | 20% | 0.20 |
| Manutenibilidade | 4/10 | 15% | 0.60 |
| Escalabilidade | 3/10 | 15% | 0.45 |

### **NOTA FINAL: 2.5/10**

**Observação**: O código é funcional e entrega valor, mas a arquitetura não suporta crescimento. A nota reflete a distância entre o estado atual e as boas práticas de Clean Architecture/SOLID.

---

## 8. SUGESTÃO DE REFATORAÇÃO INCREMENTAL

### 8.1 O que pode ser ajustado AGORA (baixo risco)

1. **Extrair funções puras dos hooks**
   - `normalizePhone()` → `src/core/domain/value-objects/phone.ts`
   - `groupMessagesByDate()` → `src/core/use-cases/messages/groupByDate.ts`
   - `calculateNextPosition()` → ✅ Já feito

2. **Separar queries de mutations nos hooks existentes**
   - Padrão: mutations retornam `true/false`, quem chama decide toast
   - ✅ Parcialmente feito em `updateStage`, `updateConversationStage`

3. **Criar tipos/interfaces em `src/core/domain/`**
   - Entidades: `Contact`, `Conversation`, `Pipeline`, `Stage`, `Message`
   - Value Objects: `Phone`, `MessageType`, `StagePosition`

### 8.2 O que deve ser planejado DEPOIS

1. **Criar Repository interfaces**
   ```typescript
   // src/core/ports/ContactRepository.ts
   interface ContactRepository {
     findById(id: string): Promise<Contact | null>;
     findByPhone(phone: Phone): Promise<Contact | null>;
     save(contact: Contact): Promise<void>;
   }
   ```

2. **Implementar Use Cases**
   ```typescript
   // src/core/use-cases/conversations/MoveConversationToStage.ts
   class MoveConversationToStage {
     constructor(private conversationRepo: ConversationRepository) {}
     
     async execute(conversationId: string, stageId: string): Promise<Result<void>> {
       // Validações de negócio
       // Persistência via repository
     }
   }
   ```

3. **Refatorar Edge Functions**
   - Extrair handlers para arquivos separados
   - Criar service layer compartilhado

4. **Quebrar KanbanView**
   - `KanbanContainer` (orquestração)
   - `RelationshipBoardContainer`
   - `StageBoardContainer`
   - `GroupsBoardContainer`

### 8.3 O que NÃO deve ser mexido neste momento

1. **Subscriptions Realtime** - Funcionam bem, complexidade alta para refatorar
2. **Estrutura de Edge Functions** - Requer redesign completo de deployment
3. **Contextos Auth/Workspace** - Estáveis, baixo benefício/risco
4. **Componentes UI básicos** (`MessageBubble`, `ConversationItem`) - Simples, sem lógica crítica

---

## 9. ESTRUTURA IDEAL SUGERIDA (Referência Futura)

```
src/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Contact.ts
│   │   │   ├── Conversation.ts
│   │   │   ├── Message.ts
│   │   │   ├── Pipeline.ts
│   │   │   └── Stage.ts
│   │   ├── value-objects/
│   │   │   ├── Phone.ts
│   │   │   ├── MessageType.ts
│   │   │   └── StagePosition.ts
│   │   └── errors/
│   │       └── DomainError.ts
│   │
│   ├── ports/
│   │   ├── repositories/
│   │   │   ├── ContactRepository.ts
│   │   │   ├── ConversationRepository.ts
│   │   │   └── PipelineRepository.ts
│   │   └── services/
│   │       ├── WhatsAppService.ts
│   │       └── MediaStorageService.ts
│   │
│   └── use-cases/
│       ├── contacts/
│       │   ├── CreateContact.ts
│       │   └── ClassifyContact.ts
│       ├── conversations/
│       │   ├── MoveToStage.ts
│       │   └── SendMessage.ts
│       └── pipelines/
│           ├── CreatePipeline.ts
│           └── MoveCard.ts
│
├── infra/
│   ├── supabase/
│   │   ├── repositories/
│   │   │   ├── SupabaseContactRepository.ts
│   │   │   └── SupabasePipelineRepository.ts
│   │   ├── services/
│   │   │   └── SupabaseMediaService.ts
│   │   └── client.ts
│   └── evolution/
│       └── EvolutionWhatsAppService.ts
│
├── presentation/
│   ├── hooks/
│   │   ├── useContacts.ts (consume use-cases)
│   │   └── usePipelines.ts (consume use-cases)
│   ├── components/
│   │   └── (componentes de UI)
│   └── pages/
│
└── shared/
    ├── types/
    └── utils/
```

---

## 10. PRÓXIMOS PASSOS RECOMENDADOS

| Prioridade | Ação | Esforço | Impacto |
|------------|------|---------|---------|
| 1 | Extrair funções puras (normalizePhone, groupMessages) | Baixo | Médio |
| 2 | Criar entidades de domínio básicas | Médio | Alto |
| 3 | Padronizar mutations (sem toast interno) | Baixo | Médio |
| 4 | Criar interface Repository para Contacts | Médio | Alto |
| 5 | Quebrar evolution-webhook em handlers | Alto | Alto |

---

*Documento gerado em 2026-01-09 por Lovable AI Architect*
