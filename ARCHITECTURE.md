# Whisper Flow CRM - Architecture

## Overview

This application follows a **Modular Monolith** pattern with **Clean Architecture** principles and **SOLID** design.

## Module Structure

```
src/
├── core/                          # Core abstractions (no external dependencies)
│   ├── either/                    # Result<T, E> type for error handling
│   ├── errors/                    # Error hierarchy (AppError, ValidationError, etc.)
│   ├── domain/                    # Domain entities and value objects
│   │   ├── entities/              # Contact, Conversation, Message, Pipeline, Stage
│   │   └── value-objects/         # Phone, MessageType, StagePosition
│   ├── ports/                     # Repository interfaces, IUseCase, IRepository
│   └── use-cases/                 # Shared use cases (calculateCardPosition)
│
├── config/                        # Application configuration
│   ├── env.ts                     # Environment variables
│   └── di-container.ts            # Dependency injection container
│
├── modules/
│   ├── conversation/              # WhatsApp messaging module
│   │   ├── domain/                # ConversationDomainService, MessageContent VO
│   │   ├── application/
│   │   │   ├── ports/             # IWhatsAppProvider, IConversationRepository
│   │   │   ├── dtos/              # CreateMessageDTO, ConversationDTO
│   │   │   ├── services/          # ConversationService
│   │   │   └── useCases/          # SendTextMessage, SendMediaMessage, ReceiveIncoming
│   │   ├── infrastructure/
│   │   │   ├── adapters/          # EvolutionAPIAdapter (implements IWhatsAppProvider)
│   │   │   ├── repositories/      # ConversationEnricher
│   │   │   └── websocket/         # WebSocketClient, WebSocketContext
│   │   └── presentation/
│   │       ├── contexts/          # ConversationContext (DI via React Context)
│   │       ├── hooks/             # useConversations, useMessages, useSendMessage
│   │       └── components/        # MessageThread, MessageInput, ConversationItem
│   │
│   ├── kanban/                    # Pipeline/Kanban board module
│   │   ├── domain/entities/       # KanbanCard
│   │   ├── application/ports/     # IKanbanRepository
│   │   ├── infrastructure/
│   │   │   └── repositories/      # SupabaseKanbanRepository, SupabaseContactClassRepository
│   │   └── presentation/
│   │       ├── hooks/             # usePipelines, useContactClasses, useKanbanState
│   │       └── components/        # KanbanBoard, StageBoard, RelationshipBoard
│   │
│   ├── dashboard/                 # Agent metrics dashboard
│   │   ├── domain/                # AgentDashboardMetrics, DashboardRepository port
│   │   ├── application/
│   │   │   ├── ports/             # IMetricsRepository
│   │   │   ├── services/          # AgentDashboardService
│   │   │   └── use-cases/         # GetMetrics, GetPipelineSummary
│   │   ├── infrastructure/        # SupabaseDashboardRepository
│   │   └── presentation/          # DashboardPage, AgentKpiCard, hooks
│   │
│   ├── reports/                   # Analytics and reporting
│   │   ├── domain/                # ReportFilter, MessageReportData, AdReportData, port
│   │   ├── application/
│   │   │   ├── ports/             # IReportsRepository
│   │   │   └── services/          # ReportsService
│   │   ├── infrastructure/        # SupabaseReportsRepository, AdminReportsRepository
│   │   └── presentation/          # ReportsPage, charts, tables, hooks
│   │
│   ├── workspace/                 # Multi-tenant workspace management
│   │   ├── domain/
│   │   │   ├── entities/          # Workspace, WorkspaceMember (RBAC)
│   │   │   └── ports/             # WorkspaceRepository interface
│   │   ├── application/
│   │   │   ├── ports/             # IWorkspaceRepository
│   │   │   └── use-cases/         # CreateWorkspace, InviteMember
│   │   ├── infrastructure/        # SupabaseWorkspaceRepository, WorkspaceMapper
│   │   └── presentation/          # WorkspaceSelector, MembersList, hooks
│   │
│   ├── contacts/                  # Contact management
│   │   ├── infrastructure/        # SupabaseContactsQueryRepository
│   │   └── presentation/          # ContactsPage, ContactsList, hooks
│   │
│   └── shared/                    # Cross-module shared code
│       ├── domain/
│       │   ├── base/              # BaseEntity, DomainEvent
│       │   └── value-objects/     # Email, DateRange
│       └── infrastructure/
│           └── database/          # SupabaseClient (centralized)
│
├── infra/supabase/                # Core Supabase implementations
│   ├── repositories/              # Supabase repository implementations
│   └── mappers/                   # Domain <-> Database mappers
│
├── contexts/                      # Global React contexts (Auth, Workspace)
├── hooks/                         # Legacy hooks (re-exports to modules)
├── pages/                         # Route page components
├── components/                    # Legacy/shared UI components
├── integrations/supabase/         # Supabase client and auto-generated types
└── types/                         # Shared TypeScript types
```

## Dependency Flow (Clean Architecture)

```
Presentation → Application → Domain
       ↓            ↓
Infrastructure (implements ports)
```

### Rules

1. **Domain** (`domain/`) depends on nothing - pure TypeScript
2. **Application** (`application/`) depends only on Domain
3. **Infrastructure** (`infrastructure/`) implements Application ports
4. **Presentation** (`presentation/`) uses Application services/use-cases via hooks

## Key Design Decisions

### Dependency Injection

The DI container (`config/di-container.ts`) wires all dependencies:
- Repository interfaces (ports) → Supabase implementations
- `IWhatsAppProvider` → `EvolutionAPIAdapter`

React components access dependencies through:
- `getContainer()` for use in hooks
- `ConversationContext` for conversation service injection

### Error Handling

Uses the `Result<T, E>` type (Railway-oriented programming):
```typescript
const result = await service.listConversations();
if (result.ok) {
  // result.value: Conversation[]
} else {
  // result.error: AppError
}
```

### Repository Pattern

All data access goes through repository interfaces:
- `ContactRepository`, `ConversationRepository`, `MessageRepository` (core)
- `IKanbanRepository`, `DashboardRepository`, `ReportsRepository` (module-specific)

### WhatsApp Integration

Message sending is abstracted behind `IWhatsAppProvider`:
```
Component → useSendMessage hook → IWhatsAppProvider → EvolutionAPIAdapter → Supabase Edge Functions → Evolution API → WhatsApp
```

This allows swapping WhatsApp providers without changing business logic.

## Module Communication

Modules communicate only through:
1. **Shared core entities** (Contact, Conversation, Message)
2. **React Context** (AuthContext, WorkspaceContext)
3. **Module public APIs** (each module's `index.ts`)

Modules do NOT import each other's internal files.

## SOLID Principles

- **SRP**: Each use case handles one operation (SendTextMessage, GetMetrics)
- **OCP**: New WhatsApp providers implement `IWhatsAppProvider` without changing use cases
- **LSP**: All repository implementations are interchangeable
- **ISP**: Ports are small and focused (IWhatsAppProvider has 4 methods)
- **DIP**: Use cases depend on interfaces (ports), not implementations
