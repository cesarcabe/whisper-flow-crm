# Whisper Flow CRM

Sistema de CRM (Customer Relationship Management) moderno e modular para gestão de conversas e relacionamento com clientes via WhatsApp, construído com arquitetura de **Modular Monolith**.

## 🚀 Características

- **Arquitetura Modular Monolith**: Estrutura organizada em módulos independentes seguindo princípios SOLID
- **Integração WhatsApp**: Conexão via Evolution API para envio e recebimento de mensagens
- **WebSocket em Tempo Real**: Atualizações instantâneas de conversas e mensagens via WebSocket
- **Dashboard Analítico**: Métricas e insights sobre leads, pipeline e conversas não lidas
- **Sistema de Pipeline**: Gestão de estágios de vendas com visualização Kanban
- **Multi-workspace**: Suporte a múltiplos workspaces com controle de acesso
- **Interface Moderna**: UI construída com React, TypeScript, Tailwind CSS e shadcn/ui

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (para banco de dados e autenticação)
- Evolution API configurada (para integração WhatsApp)

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd whisper-flow-crm
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CHATENGINE_BASE_URL=your_chatengine_url
```

4. Execute o projeto em desenvolvimento:
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📁 Estrutura do Projeto

O projeto segue uma arquitetura **Modular Monolith**, organizada da seguinte forma:

```
src/
├── modules/                    # Módulos de negócio
│   ├── conversation/          # Módulo de conversas
│   │   ├── domain/           # Entidades e regras de negócio
│   │   ├── application/      # Casos de uso e serviços
│   │   ├── infrastructure/   # Implementações (Supabase, WebSocket)
│   │   └── presentation/     # Componentes React e hooks
│   ├── dashboard/            # Módulo de dashboard
│   ├── reports/              # Módulo de relatórios
│   └── workspace/            # Módulo de workspaces
├── components/               # Componentes compartilhados
├── contexts/                # Contextos React globais
├── hooks/                   # Hooks compartilhados
├── pages/                   # Páginas da aplicação
└── integrations/            # Integrações externas (Supabase)
```

### Módulos Principais

#### 📨 Conversation Module
Gerencia conversas, mensagens e integração com WhatsApp:
- **Domain**: Entidades `Conversation` e `Message`
- **Application**: Serviços de negócio (`ConversationService`)
- **Infrastructure**: 
  - Repositórios Supabase
  - Cliente WebSocket para atualizações em tempo real
- **Presentation**: Hooks e componentes React

#### 📊 Dashboard Module
Dashboard com métricas e widgets:
- Novos leads
- Resumo do pipeline
- Conversas não lidas

#### 📈 Reports Module
Relatórios e análises de performance

#### 🏢 Workspace Module
Gestão de workspaces e membros

## 🔌 Integrações

### Supabase
- **Banco de dados**: PostgreSQL gerenciado
- **Autenticação**: Sistema de autenticação completo
- **Real-time**: Subscriptions para atualizações em tempo real
- **Edge Functions**: Funções serverless para webhooks

### Evolution API
- Integração com WhatsApp via Evolution API
- Webhooks para recebimento de mensagens
- Envio de mensagens via API

### WebSocket (ChatEngine)
- Conexão WebSocket para atualizações em tempo real
- Sincronização automática de conversas e mensagens
- Configuração opcional via variáveis de ambiente

## 🎯 Funcionalidades

### Autenticação e Workspace
- Login/Registro com Supabase Auth
- Criação e gestão de workspaces
- Sistema de convites para membros
- Controle de acesso por workspace

### Conversas
- Lista de conversas em tempo real
- Visualização de mensagens
- Envio de mensagens via WhatsApp
- Filtros por tipo, classe de contato e estágio
- Busca de conversas
- Indicadores de não lidas

### Pipeline e Kanban
- Visualização Kanban de conversas por estágio
- Movimentação de conversas entre estágios
- Gestão de pipelines e estágios

### Dashboard
- Métricas de novos leads
- Resumo do pipeline
- Widget de conversas não lidas
- Gráficos e visualizações

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev

# Preview do build
npm run preview

# Linting
npm run lint
```

## 🏗️ Arquitetura

### Modular Monolith
O projeto utiliza uma arquitetura de **Modular Monolith**, onde:
- Cada módulo é independente e auto-contido
- Módulos seguem a estrutura Domain-Driven Design (DDD)
- Separação clara entre camadas: Domain, Application, Infrastructure, Presentation
- Facilita manutenção e evolução futura para microserviços se necessário

### Princípios SOLID
- **Single Responsibility**: Cada classe/componente tem uma responsabilidade única
- **Open/Closed**: Extensível sem modificar código existente
- **Liskov Substitution**: Interfaces bem definidas
- **Interface Segregation**: Interfaces específicas e coesas
- **Dependency Inversion**: Dependências de abstrações, não implementações

## 🔐 Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# ChatEngine/WebSocket (opcional)
VITE_CHATENGINE_BASE_URL=
```

## 📝 Tecnologias

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Roteamento**: React Router v6
- **Estado**: React Query (TanStack Query)
- **Formulários**: React Hook Form + Zod
- **WebSocket**: Socket.io Client
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Integração WhatsApp**: Evolution API

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
2. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
3. Push para a branch (`git push origin feature/nova-feature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 📞 Suporte

Para questões e suporte, entre em contato com a equipe de desenvolvimento.

---

Desenvolvido com ❤️ usando arquitetura Modular Monolith
