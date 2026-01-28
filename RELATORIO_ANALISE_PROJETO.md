# Relatório de Análise — Whisper Flow CRM

**Data:** 28/01/2025  
**Escopo:** Análise do projeto Whisper Flow CRM (Modular Monolith + Clean Architecture + SOLID)  
**Objetivo:** Mapear funcionalidades operacionais, lacunas e oportunidades de melhoria. Nenhuma alteração de código foi realizada.

---

## 1. Visão Geral do Projeto

O **Whisper Flow CRM** é um CRM para gestão de conversas e relacionamento com clientes via **WhatsApp**, integrado à **Evolution API**. O frontend é React (Vite, TypeScript) com **shadcn/ui** e **Tailwind**; o backend é **Supabase** (PostgreSQL, Auth, Edge Functions, Storage). A integração em tempo real opcional usa **ChatEngine** (WebSocket via Socket.io).

### Stack principal
- **Frontend:** React 18, TypeScript, Vite, TanStack Query, React Router v6, React Hook Form, Zod, dnd-kit (drag-and-drop), Recharts, Socket.io-client.
- **Backend/Infra:** Supabase (Auth, DB, RLS, Edge Functions), Evolution API (WhatsApp).
- **Pagamentos:** Stripe (webhook para assinaturas e tiers).
- **Arquitetura declarada:** Modular Monolith, Clean Architecture, SOLID.

---

## 2. Arquitetura

### 2.1 Estrutura de pastas

```
src/
├── core/                    # Núcleo compartilhado
│   ├── domain/              # Entidades e value objects
│   │   ├── entities/        # Contact, Conversation, Message, Pipeline, Stage
│   │   └── value-objects/   # Phone, MessageType, StagePosition
│   ├── ports/               # Interfaces de repositórios
│   └── use-cases/           # calculateCardPosition (pipeline)
├── infra/supabase/          # Adaptadores Supabase
│   ├── mappers/             # Contact, Conversation, Message, Pipeline, Stage
│   └── repositories/        # Supabase*Repository para cada entidade core
├── integrations/supabase/   # Client e types gerados
├── modules/
│   ├── conversation/        # application, infrastructure (websocket), presentation
│   ├── dashboard/           # application, domain, infrastructure, presentation
│   ├── reports/             # application, domain, infrastructure, presentation
│   ├── workspace/           # domain, infrastructure, presentation
│   ├── contacts/            # apenas presentation
│   └── kanban/              # apenas presentation
├── pages/                   # Páginas (Auth, Dashboard, Kanban, Conversations, etc.)
├── components/              # UI compartilhada e layout
├── contexts/                # AuthContext, WorkspaceContext
├── hooks/                   # Hooks globais (useContacts, usePipelines, useConversationStages, etc.)
├── lib/                     # Utilitários (date, message, normalize, tier-config)
└── types/                   # database.ts, ui.ts
```

### 2.2 Alinhamento com Clean Architecture e SOLID

| Aspecto | Situação |
|--------|----------|
| **Domain no core** | Entidades ricas (Contact, Conversation, Message, Pipeline, Stage) com comportamentos; value objects (Phone, MessageType, StagePosition). |
| **Ports (interfaces)** | Repositórios definidos em `core/ports`; `ConversationRepository`, `MessageRepository`, `ContactRepository`, etc. |
| **Infrastructure** | `infra/supabase` com repositórios e mappers; `conversation/infrastructure` (WebSocket). |
| **Application (use-cases/serviços)** | `ConversationService`, `SendTextMessageUseCase`, `ReceiveIncomingMessageUseCase`, `ReportsService`, `AgentDashboardService`. |
| **Inversão de dependência** | Serviços recebem repositórios por construtor; em vários pontos a instanciação é feita em hooks/context (ex.: `new SupabaseWorkspaceRepository()`), sem container de DI. |
| **Módulos auto-contidos** | `conversation`, `dashboard`, `reports`, `workspace` seguem camadas; `contacts` e `kanban` têm só presentation. |

---

## 3. Funcionalidades Operacionais

### 3.1 Autenticação e perfil
- Login/registro com Supabase Auth (email/senha).
- Perfil em `profiles` (full_name, avatar_url).
- Redirecionamento: não autenticado → `/auth`; sem workspace → `/setup-workspace`.
- `AuthContext` com `user`, `session`, `profile`, `signIn`, `signUp`, `signOut`.

### 3.2 Workspace e multi-tenant
- Criação de workspace (`provision-workspace`), membership (owner/admin/agent) e `workspace_api_keys`.
- `WorkspaceContext`: múltiplos workspaces, workspace ativo em `localStorage`, `selectWorkspace`, `refetchWorkspace`.
- `WorkspaceSelector` / `ConnectedWorkspaceSelector` no layout.
- Convites: `send-invitation`, `accept-invitation`; página `/invite/:token`.

### 3.3 Configurações do workspace (WorkspaceAdmin)
- **Membros:** `WorkspaceMembersList`, `AddMemberDialog`, `InviteMemberDialog`, `PendingInvitations`; roles e tier (limite de membros via `tier-config`).
- **WhatsApp:** `WhatsappSettingsTab` (Evolution): criar/desconectar instâncias, QR Code; Edge Functions: `whatsapp-create-instance`, `whatsapp-delete-instance`, `whatsapp-disconnect-instance`, `whatsapp-get-qr`.

### 3.4 Evolution API e webhook
- **Webhook** (`evolution-webhook`): valida `x-api-key` em `workspace_api_keys`; resolve workspace via `whatsapp_numbers`; idempotência com `webhook_deliveries`.
- **Eventos:** `connection.update`, `qrcode.updated`, `messages.upsert`, `messages.update`; suporte a DM/grupos, `conversation_aliases` (PN/LID), `conversation_events`.
- **Fluxo de mensagem:** `envelopeNormalizer` → `resolveContact`, `resolveConversation` → mídia (`mediaService`) → inserção em `messages`; pipeline preferencial em novo contato.

### 3.5 Envio de mensagens (Edge Functions)
- `whatsapp-send` (texto), `whatsapp-send-image`, `whatsapp-send-audio`, `whatsapp-send-video`.
- Autorização via JWT; resolução de `conversations` + `contacts` + `whatsapp_numbers`; envio à Evolution; gravação em `messages`.

### 3.6 Conversas (módulo conversation)
- **Lista:** `ConversationService` + `SupabaseConversationRepository`; filtros (tipo, classe de contato, estágio); busca; ordenação por `last_message_at`; indicador de não lidas.
- **Mensagens:** paginação, histórico; `MessageBubble` (texto, mídia, reply, status, reações).
- **Input:** texto, imagem (preview, tamanho/tipo), áudio (gravador), resposta (reply), reações (`ReactionPicker`).
- **Envio:** `SendTextMessageUseCase` (WebSocket se conectado, senão Edge `whatsapp-send`); `useSendMessage` com optimistic updates; imagens/áudios via Edge.
- **Encaminhar:** `useForwardMessage`, `ForwardMessageDialog`.
- **Reações:** `useMessageReactions`, tabela `message_reactions`.
- **WebSocket (ChatEngine):** `WebSocketClient`, `WebSocketContext`; `useWebSocket` para inscrição em conversa; eventos `message`, `conversation`, `message:status`, `typing`; JWT `useChatEngineJwt`; opcional via `VITE_CHATENGINE_BASE_URL`.
- **Componentes de mídia:** `ImageViewer`, `VideoViewer`, `AudioPlayer`.

### 3.7 Pipeline e Kanban
- **Pipeline/Estágios:** CRUD (CreatePipelineDialog, CreateStageDialog, EditStageDialog, DeleteConfirmDialog); `usePipelines`; posição com `calculateNextStagePosition`.
- **Três visões:**
  - **Estágios de venda (stage):** `StageBoard`, `StageColumn`, `StageCard`; conversas em estágios + Lead Inbox; drag-and-drop com `useConversationStages` e `moveConversation`.
  - **Relacionamento (relationship):** `RelationshipBoard`, `RelationshipColumn`, `RelationshipCard`; classes de contato (`contact_classes`), `useContactClasses`, `moveContact`.
  - **Grupos:** `GroupsBoard`, `GroupColumn`, `GroupCard`; `group_classes`, `useGroupConversations`, `useGroupClasses`, `moveGroup`.
- **Lead Inbox:** conversas sem estágio; arrastar para estágio as associa à pipeline.
- **Contatos no Kanban:** `CreateContactDialog`, `CreateCardDialog`, `EditContactSheet`, `ContactDetailsDialog`; `useContacts`, `useContactClasses`, `useGroupClasses`.
- **ChatView:** atalho para visualização em formato chat no Kanban.

### 3.8 Contatos
- Listagem com filtros (busca, status, classe de contato, classe de grupo); `useContactsModule` + `ContactMapper` → `Contact` do core.
- `ContactsPage`, `ContactsList`, `ContactsFilters`, `ContactCard`, `ContactDetailsSheet`, `EditContactSheet`.
- Criar, editar e excluir contato (Supabase direto no hook).

### 3.9 Dashboard
- **AgentDashboardService** + `SupabaseDashboardRepository`: `getAgentMetrics` (período), `getPendingReplies` (paginação).
- **DashboardPage:** `NewLeadsWidget`, `PipelineSummaryWidget`, `UnreadWidget`, `PendingRepliesList`, `AgentKpiCard`.

### 3.10 Relatórios
- **ReportsService** + `SupabaseReportsRepository` (RPCs):
  - **Mensagens:** `get_message_report_kpis`, `get_message_report_timeseries`, `get_message_report_table`; KPIs, gráficos, tabela paginada.
  - **Anúncios:** `get_ad_report_kpis`, `get_ad_report_timeseries`, `get_ad_report_table`, `get_top_ads`; análise de leads por anúncio e canal.
- **AdminReportsRepository** (RPCs): `get_admin_overview_metrics`, `get_agent_performance_ranking`, `get_ads_vs_organic_timeseries`.
- **ReportsPage:** abas Visão Geral (admin), Mensagens, Anúncios; `PeriodSelector` (today, 7d, 30d, thisMonth, custom); `useReportsData`, `useWorkspaceRole`.

### 3.11 Stripe e tiers
- **tier-config:** starter / professional / enterprise; `memberLimit`, `canAddMember`, `getRemainingMemberSlots`.
- **stripe-webhook:** `customer.subscription.*`; mapeamento `price_id` → tier; atualização de `workspaces` (tier) e `workspace_api_keys` quando aplicável.

### 3.12 Roteamento e layout
- Rotas: `/` (Dashboard), `/kanban`, `/conversations`, `/contacts`, `/reports`, `/workspace/admin`, `/setup-workspace`, `/auth`, `/invite/:token`, `/test/websocket`.
- `ProtectedRoute` (auth + workspace), `SetupRoute` (auth, sem workspace), `PublicRoute`.
- **AppLayout:** sidebar, `AppSidebar` (menu, CreateWorkspace para `isMaster`), `ConnectedWorkspaceSelector`; main com overflow diferenciado em `/conversations`.

### 3.13 Banco de dados (principais tabelas)
- `profiles`, `user_roles`, `workspaces`, `workspace_members`, `workspace_invitations`, `workspace_api_keys`
- `contact_classes`, `group_classes`, `contacts`, `tags`
- `whatsapp_numbers`, `conversations`, `messages`, `message_reactions`, `conversation_aliases`, `conversation_events`
- `pipelines`, `stages`, `cards`
- `webhook_deliveries`
- `catalogs`, `catalog_assets`, `catalog_sends` (tipos em `database.ts`; uso não aprofundado na análise)
- RLS e políticas por workspace em várias tabelas.

---

## 4. Pontos Faltantes e Inconsistências

### 4.1 Módulo Contacts
- **Sem camadas Application/Domain/Infrastructure:** apenas `presentation` (componentes e `useContactsModule`).
- **Uso direto do Supabase no hook:** cria, edita, deleta e lista contatos/classes sem passar por `ContactRepository`. `SupabaseContactRepository` e `ContactMapper` existem, mas o módulo contacts não os utiliza de forma centralizada.
- **Gap com o core:** o domínio `Contact` e o `ContactRepository` estão no core; o módulo não os usa de forma explícita na persistência (apenas o mapper para leitura em parte do fluxo).

### 4.2 Módulo Kanban
- **Só presentation:** sem domain, application ou infrastructure próprios.
- **Origens de dados mistas:** `usePipelines`, `useConversationStages`, `useContactClasses`, `useGroupClasses`, `useContacts`, `useKanbanState`; alguns vão a Supabase direto, outros a repositórios/hooks já existentes.
- **Cards vs conversas:** tabela `cards` existe (contact_id, stage_id, title, position, etc.). O `StageBoard` trabalha com **conversas** (`ConversationWithStage`), não com `cards`. O modelo de “card” como tarefa/atividade e “conversa” como lead em estágio não está unificado na UI/regras.

### 4.3 Módulo Conversation
- **Domain:** não possui `domain/` próprio; usa entidades e value objects do `core` (correto para evitar duplicação, mas pode ser documentado).
- **ReceiveIncomingMessageUseCase:** pensado para WebSocket/eventos; no fluxo Evolution a mensagem entra pelo webhook (Edge), não por esse use case no front.

### 4.4 Core e use-cases
- **core/use-cases:** somente `pipeline/calculateCardPosition` (e `calculateNextPosition` para estágios/cards); `.gitkeep` indica ideia de mais use-cases, mas poucos implementados.
- **Repositórios não usados em todos os fluxos:** por exemplo, `ContactRepository`/`SupabaseContactRepository` não são o caminho padrão no módulo de contacts.

### 4.5 Rota de teste em produção
- **`/test/websocket`** está sob `ProtectedRoute` e abre o `WebSocketTestPanel`. Útil em desenvolvimento, mas pode vazar informações e expor ferramentas de debug em produção.

### 4.6 Configuração e ambiente
- **Supabase:** `client.ts` usa URL e anon key fixos (modelo Lovable); README cita `.env` e `VITE_SUPABASE_*` — há divergência entre código e documentação.
- **Evolution/ChatEngine:** webhook e Edge dependem de `EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`; front de `VITE_CHATENGINE_BASE_URL`. Não há `.env.example` no repositório analisado para referência.

### 4.7 Relatórios de Anúncios
- Os RPCs de ads (`get_ad_*`) dependem de dados de atribuição (ex.: `conversion_source`, `entry_point_*`, `ad_title`, `ad_source_id`). O webhook Evolution e as tabelas (ex.: `conversation_events`, `messages`) precisam ser populados com esses campos para os relatórios de ads serem consistentes; isso não foi validado na análise.

### 4.8 Tabela `workspace_api_keys`
- Usada em `evolution-webhook`, `provision-workspace`, `whatsapp-create-instance`, `stripe-webhook`. A criação da tabela e de índices/RLS não foi localizada nas migrations analisadas; pode existir em migration não listada ou em passo manual.

### 4.9 Reações em mensagens
- `useMessageReactions` filtra por `workspace_id` e `message_id`. Vale validar se a tabela `message_reactions` possui `workspace_id` e se as políticas RLS estão alinhadas.

---

## 5. Aspectos de Melhoria

### 5.1 Arquitetura e consistência de módulos
- **Contacts:**  
  - Introduzir camada de application (ex.: `ContactApplicationService` ou use-cases) que use `ContactRepository`.  
  - Fazer o módulo depender apenas do port `ContactRepository` e do `Contact` do core; infra (Supabase) só na camada de infra.
- **Kanban:**  
  - Decidir se Kanban é “view” que orquestra outros módulos ou se terá regras próprias: em caso de regras (ex.: “ao mover conversa para estágio X, disparar Y”), criar application/use-cases.  
  - Documentar a relação entre `cards` e “conversas em estágio” (quando usar cada um).
- **Conversation:**  
  - Documentar que o domain é o do core; deixar explícito o papel do `ReceiveIncomingMessageUseCase` (ex.: só para eventos vindos do ChatEngine no front, enquanto Evolution trata no Edge).

### 5.2 Injeção de dependências
- Serviços e repositórios são instanciados em hooks/context (ex.: `new SupabaseWorkspaceRepository()`, `new ConversationService(...)`).  
- Avaliar um container simples (ex.: factory ou Context de “serviços”) para facilitar testes e troca de implementações.

### 5.3 Duplicação e organização de hooks
- **useContacts** (root) vs **useContactsModule** (contacts): responsabilidades diferentes (Kanban/outros vs página Contatos); padronizar nomes e escopo para evitar confusão.
- **useConversations** (root) vs **useConversations** (conversation): um é “legado” com mapeamento para formato antigo; considerar unificar em um só hook no módulo conversation e depreciar o global.
- **useConversationStages** (root) vs lógica no Kanban: centralizar em um lugar só (ex.: hook no módulo kanban ou em camada de application).

### 5.4 Testes
- `playwright.config.ts` e `playwright-fixture.ts` existem; não foram vistos testes E2E ou unitários no `src`.  
- Sugestão: começar por use-cases e serviços (ex.: `SendTextMessageUseCase`, `ReportsService`, `calculateCardPosition`) e por fluxos críticos (login, criar workspace, abrir conversa, enviar mensagem).

### 5.5 Segurança e operação
- **`/test/websocket`:** em produção, remover da rota ou restringir por role/feature-flag/ambiente.
- **Stripe webhook:** o código comenta que, sem `stripe-signature`, “processa mesmo assim para desenvolvimento”. Em produção, exigir e validar assinatura sempre.
- **Variáveis sensíveis:** migrar `client.ts` para `import.meta.env.VITE_*` e manter `.env.example` com todas as variáveis necessárias (Supabase, Evolution, ChatEngine, Stripe).

### 5.6 Performance e dados
- Relatórios e dashboard usam RPCs com filtros de período e workspace; em workspaces com muito volume, avaliar índices (ex.: `conversation_events`, `messages`, `webhook_deliveries`) e janelas de dados (cache, materialized views).
- Lista de conversas e de mensagens: a paginação e o uso de `last_message_at` já ajudam; vale revisar se há N+1 em joins (ex.: contatos, estágios) nos hooks.

### 5.7 Funcionalidades possivelmente incompletas ou não usadas
- **Tabela `cards`:** se o produto for só “conversas em estágios”, considerar deprecar ou separar um módulo “Tarefas/Cards” no futuro.  
- **Tags, Segmentos, Catálogos, Compras (Purchases), Recorrência:** tipos em `database.ts` e tabelas; não aparecem na navegação nem nos módulos analisados. Podem ser roadmap ou resquício de modelo; documentar estado (planejado, em uso, obsoleto).  
- **User roles (`user_roles`, `AppRole`):** `useUserRole` e `isMaster` são usados (ex.: criar workspace). Revisar se `admin`/`member` impactam em mais telas além da que foi vista.

### 5.8 Documentação
- **Evolution:** passo a passo de configuração (webhook URL, API key, `instance_name`, `workspace_api_keys`) e exemplos de payload para debugar.
- **ChatEngine:** quando usar WebSocket vs fallback Edge; formato do JWT e escopo de `workspaceId`.
- **Relatórios de Ads:** quais eventos e colunas alimentam os RPCs; como configurar no WhatsApp/Meta e no Evolution para popular esses campos.

### 5.9 UX e acessibilidade
- Componentes shadcn costumam trazer acessibilidade razoável; vale checar foco, ARIA e navegação por teclado em modais, Kanban (drag-and-drop) e listas longas.
- Estados de loading e erro estão presentes em vários hooks; padronizar tratamento (toast, inline, retry) entre módulos.

---

## 6. Resumo

| Dimensão | Situação |
|----------|----------|
| **Funcionalidades de negócio** | Auth, workspace, WhatsApp (Evolution + Edge), conversas, Kanban (3 visões), contatos, dashboard, relatórios (mensagens, ads, admin), Stripe/tiers — em grande parte operacionais. |
| **Clean Architecture / SOLID** | Core com domain e ports bem definidos; infra com repositórios e mappers; vários serviços/use-cases. Contacts e Kanban sem camadas de application/domain; uso direto do Supabase em pontos. |
| **Consistência** | Repositórios não utilizados em todos os fluxos; Cards vs Conversas no Kanban; duplicação de hooks e nomes. |
| **Segurança e deploy** | Rota de teste, Stripe sem validação de assinatura em cenário de dev e client Supabase com credenciais fixas merecem ajustes antes de produção. |
| **Testes e documentação** | Poucos ou nenhum teste de código; documentação de integrações (Evolution, ChatEngine, Ads) pode ser reforçada. |

O projeto está funcional para o ciclo principal (workspace → WhatsApp → conversas → pipeline/kanban → contatos → relatórios e dashboard) e bem estruturado na maior parte do core e dos módulos `conversation`, `reports` e `dashboard`. As melhorias sugeridas focam em alinhar Contacts e Kanban à arquitetura, em reduzir acoplamento a Supabase direto e em endurecer configuração, segurança e testes para produção.
