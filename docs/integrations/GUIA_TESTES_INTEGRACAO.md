# Guia de Testes - Integração CRM ↔ ChatEngine

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Ambiente](#configuração-do-ambiente)
3. [Iniciando os Aplicativos](#iniciando-os-aplicativos)
4. [Testes de Funcionalidades](#testes-de-funcionalidades)
5. [Testes de WebSocket](#testes-de-websocket)
6. [Debugging](#debugging)
7. [Checklist Completo](#checklist-completo)

---

## 🔧 Pré-requisitos

### Software Necessário
- ✅ Node.js 18+ e npm
- ✅ Docker e Docker Compose (para ChatEngine com Redis)
- ✅ Conta Supabase configurada
- ✅ Evolution API configurada e rodando
- ✅ WhatsApp conectado ao Evolution API

### Variáveis de Ambiente

#### ChatEngine (`.env` ou `docker-compose.yml`)
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key
SUPABASE_ANON_KEY=seu-anon-key

# Evolution API
EVOLUTION_API_URL=http://localhost:8080  # ou URL do Evolution
EVOLUTION_API_KEY=sua-api-key
EVOLUTION_WEBHOOK_SECRET=seu-webhook-secret

# ChatEngine JWT
CHATENGINE_JWT_SECRET=sua-chave-secreta-jwt

# Redis (opcional - desenvolvimento pode usar in-memory)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false  # true para usar Redis, false para in-memory

# Outbox Worker
OUTBOX_WORKER_TOKEN=token-seguro-para-worker

# Media Storage
SUPABASE_MEDIA_BUCKET=chatengine-media
SUPABASE_MEDIA_URL_EXPIRES_IN=3600
```

#### CRM (`.env` ou `.env.local`)
```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu-anon-key

# ChatEngine
VITE_CHATENGINE_API_URL=http://localhost:3000  # URL local do ChatEngine
VITE_CHATENGINE_JWT_SECRET=sua-chave-secreta-jwt  # MESMA do ChatEngine
```

---

## 🚀 Configuração do Ambiente

### 1. Configurar ChatEngine

#### Opção A: Desenvolvimento Local (sem Docker)
```bash
cd C:\Users\arman\Codes\ChatEngine

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor de desenvolvimento
npm run dev
# ou
npm run start  # Usa server.ts customizado com WebSocket
```

#### Opção B: Docker Compose (Recomendado)
```bash
cd C:\Users\arman\Codes\ChatEngine

# Criar arquivo .env para docker-compose
# Editar docker-compose.yml com suas variáveis

# Iniciar containers
docker-compose up -d

# Ver logs
docker-compose logs -f chatengine
```

### 2. Configurar CRM

```bash
cd C:\Users\arman\Codes\whisper-flow-crm

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Criar .env.local com as variáveis acima

# Iniciar servidor de desenvolvimento
npm run dev
```

### 3. Verificar Conexões

#### ChatEngine
- ✅ Servidor rodando em `http://localhost:3000`
- ✅ WebSocket disponível em `ws://localhost:3000/api/ws`
- ✅ Health check: `http://localhost:3000/api/health` (se disponível)

#### CRM
- ✅ Servidor rodando em `http://localhost:5173` (Vite padrão)
- ✅ Console do navegador sem erros de conexão

---

## 🧪 Testes de Funcionalidades

### Teste 1: Verificar Conexão WebSocket

#### No Console do Navegador (DevTools)
```javascript
// Abrir DevTools (F12) → Console

// Verificar se WebSocket está conectado
// O hook useWebSocketContext deve estar disponível
// Verificar logs no console:
// [WebSocket] Connecting to: ws://localhost:3000/api/ws
// [WebSocket] Connected
```

#### Componente de Teste (Opcional)
Criar arquivo `src/components/test/WebSocketTest.tsx`:
```typescript
import { useWebSocketContext } from '@/modules/conversation/infrastructure/websocket/WebSocketContext'

export function WebSocketTest() {
  const { isConnected, isEnabled, client } = useWebSocketContext()
  
  return (
    <div className="p-4 border rounded">
      <h3>WebSocket Status</h3>
      <p>Enabled: {isEnabled ? '✅' : '❌'}</p>
      <p>Connected: {isConnected ? '✅' : '❌'}</p>
      <p>State: {client?.getState()}</p>
    </div>
  )
}
```

### Teste 2: Enviar Mensagem do CRM

1. **Abrir uma conversa no CRM**
2. **Digitar uma mensagem**
3. **Enviar**
4. **Verificar:**
   - ✅ Mensagem aparece imediatamente no CRM (otimistic update)
   - ✅ Status muda de "sending" → "sent" → "delivered"
   - ✅ Mensagem aparece no WhatsApp
   - ✅ Logs no ChatEngine mostram processamento

#### Verificar Logs do ChatEngine
```bash
# Se usando Docker
docker-compose logs -f chatengine | grep -i message

# Se usando npm
# Ver logs no terminal onde o ChatEngine está rodando
```

### Teste 3: Receber Mensagem no CRM

1. **Enviar mensagem do WhatsApp** (usar outro número ou WhatsApp Web)
2. **Verificar no CRM:**
   - ✅ Mensagem aparece **instantaneamente** (< 1 segundo)
   - ✅ Mensagem aparece na conversa correta
   - ✅ Preview da conversa atualiza
   - ✅ Contador de não lidas atualiza (se aplicável)

#### Verificar WebSocket
```javascript
// No console do navegador
// Deve aparecer:
// [WebSocket] Received message: <message-id>
```

### Teste 4: Atualização de Status

1. **Enviar mensagem do CRM**
2. **Aguardar atualizações de status:**
   - ✅ "sending" → aparece imediatamente
   - ✅ "sent" → após alguns segundos
   - ✅ "delivered" → quando WhatsApp entrega
   - ✅ "read" → quando contato lê (se habilitado)

#### Verificar Logs
```javascript
// Console do navegador deve mostrar:
// [WebSocket] Received status update: <message-id> sent
// [WebSocket] Received status update: <message-id> delivered
```

### Teste 5: Atualização de Conversas

1. **Receber nova mensagem no WhatsApp**
2. **Verificar no CRM:**
   - ✅ Conversa sobe para o topo da lista
   - ✅ Preview da última mensagem atualiza
   - ✅ Timestamp atualiza
   - ✅ Ordenação por `last_message_at` funciona

### Teste 6: Envio de Mídia

1. **Enviar imagem do CRM**
2. **Verificar:**
   - ✅ Upload funciona
   - ✅ Imagem aparece no preview
   - ✅ Imagem é enviada via ChatEngine
   - ✅ Imagem aparece no WhatsApp

### Teste 7: Fallback para Supabase Realtime

1. **Desabilitar WebSocket temporariamente:**
   ```typescript
   // Em WebSocketContext.tsx, comentar temporariamente:
   // const isEnabled = false; // Forçar fallback
   ```

2. **Verificar:**
   - ✅ Mensagens ainda chegam (via Supabase Realtime)
   - ✅ Latência maior (2-5 segundos vs < 1 segundo)
   - ✅ Funcionalidade básica mantida

---

## 🔌 Testes de WebSocket

### Teste Manual com Socket.io Client

#### No Console do Navegador
```javascript
// Conectar manualmente para testar
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  path: '/api/ws',
  auth: {
    token: 'SEU_JWT_TOKEN_AQUI'  // Obter do useChatEngineJwt
  }
})

socket.on('connect', () => {
  console.log('✅ Conectado!')
})

socket.on('message', (msg) => {
  console.log('📨 Mensagem recebida:', msg)
})

socket.on('conversation', (conv) => {
  console.log('💬 Conversa atualizada:', conv)
})

socket.on('messageStatus', (status) => {
  console.log('📊 Status atualizado:', status)
})

// Subscribe em uma conversa
socket.emit('subscribe:conversation', 'conversation-id-aqui')
```

### Teste de Reconexão

1. **Desconectar ChatEngine temporariamente:**
   ```bash
   # Docker
   docker-compose stop chatengine
   
   # npm
   # Ctrl+C no terminal
   ```

2. **Verificar no CRM:**
   - ✅ WebSocket detecta desconexão
   - ✅ Tenta reconectar automaticamente
   - ✅ Logs mostram tentativas de reconexão

3. **Reconectar ChatEngine:**
   ```bash
   docker-compose start chatengine
   ```

4. **Verificar:**
   - ✅ WebSocket reconecta automaticamente
   - ✅ Subscriptions são restauradas
   - ✅ Mensagens continuam chegando

---

## 🐛 Debugging

### Verificar Logs do ChatEngine

#### Docker
```bash
# Todos os logs
docker-compose logs -f chatengine

# Apenas erros
docker-compose logs chatengine | grep -i error

# Apenas WebSocket
docker-compose logs chatengine | grep -i websocket

# Apenas mensagens
docker-compose logs chatengine | grep -i message
```

#### npm
```bash
# Logs aparecem no terminal onde o servidor está rodando
# Procurar por:
# - [WebSocket] ...
# - [WebhookWorker] ...
# - [SendMessage] ...
```

### Verificar Logs do CRM

#### Console do Navegador
```javascript
// Filtrar logs do WebSocket
// DevTools → Console → Filter: "WebSocket"

// Verificar erros
// DevTools → Console → Errors
```

#### Network Tab
1. **Abrir DevTools → Network**
2. **Filtrar por "WS" (WebSocket)**
3. **Verificar:**
   - ✅ Conexão WebSocket estabelecida
   - ✅ Status: 101 Switching Protocols
   - ✅ Mensagens sendo trocadas

### Problemas Comuns

#### ❌ WebSocket não conecta
**Possíveis causas:**
- JWT inválido ou expirado
- ChatEngine não está rodando
- URL incorreta
- CORS bloqueando conexão

**Solução:**
```javascript
// Verificar no console:
// 1. Verificar se token está sendo gerado
// 2. Verificar URL do ChatEngine
// 3. Verificar se ChatEngine está acessível
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(console.log)
```

#### ❌ Mensagens não chegam
**Possíveis causas:**
- WebSocket não está conectado
- Subscription não foi feita
- Evolution API não está enviando webhooks
- ChatEngine não está processando webhooks

**Solução:**
1. Verificar conexão WebSocket
2. Verificar logs do ChatEngine
3. Verificar se Evolution API está configurado corretamente
4. Testar webhook manualmente:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/whatsapp \
     -H "Content-Type: application/json" \
     -d '{"event": "messages.upsert", ...}'
   ```

#### ❌ Status não atualiza
**Possíveis causas:**
- WebSocket não está recebendo eventos
- ChatEngine não está emitindo eventos
- Listener não está registrado

**Solução:**
1. Verificar se `messageStatus` listener está registrado
2. Verificar logs do ChatEngine para eventos emitidos
3. Testar manualmente com Socket.io client

---

## ✅ Checklist Completo

### Configuração Inicial
- [ ] ChatEngine rodando e acessível
- [ ] CRM rodando e acessível
- [ ] Variáveis de ambiente configuradas
- [ ] Supabase conectado
- [ ] Evolution API conectado
- [ ] WhatsApp conectado ao Evolution

### Conexão WebSocket
- [ ] WebSocket conecta automaticamente
- [ ] JWT é gerado corretamente
- [ ] Autenticação funciona
- [ ] Reconexão automática funciona
- [ ] Logs mostram conexão bem-sucedida

### Envio de Mensagens
- [ ] Mensagem de texto envia corretamente
- [ ] Mensagem aparece imediatamente no CRM
- [ ] Status atualiza corretamente
- [ ] Mensagem chega no WhatsApp
- [ ] Mídia (imagem/áudio) envia corretamente

### Recebimento de Mensagens
- [ ] Mensagem do WhatsApp chega no CRM
- [ ] Latência < 1 segundo (WebSocket)
- [ ] Mensagem aparece na conversa correta
- [ ] Preview da conversa atualiza
- [ ] Contador de não lidas atualiza

### Atualização de Status
- [ ] Status muda de "sending" → "sent"
- [ ] Status muda para "delivered"
- [ ] Status muda para "read" (se habilitado)
- [ ] UI atualiza automaticamente

### Atualização de Conversas
- [ ] Conversa sobe ao topo quando recebe mensagem
- [ ] Preview da última mensagem atualiza
- [ ] Timestamp atualiza
- [ ] Ordenação funciona corretamente

### Fallback
- [ ] Supabase Realtime funciona quando WebSocket está desabilitado
- [ ] Mensagens ainda chegam (com maior latência)
- [ ] Funcionalidade básica mantida

### Performance
- [ ] Latência WebSocket < 100ms
- [ ] Sem duplicação de mensagens
- [ ] Reconexão rápida (< 5 segundos)
- [ ] Sem memory leaks

---

## 📊 Métricas de Sucesso

### Latência Esperada
- **WebSocket**: < 100ms
- **Supabase Realtime**: 2-5 segundos
- **HTTP Polling**: 5-10 segundos

### Taxa de Sucesso
- **Conexão WebSocket**: > 99%
- **Entrega de Mensagens**: > 99%
- **Atualização de Status**: > 95%

---

## 🆘 Suporte

### Logs Úteis para Debug
```bash
# ChatEngine
docker-compose logs chatengine | tail -100

# Redis (se usando)
docker-compose logs redis | tail -50

# Network (navegador)
# DevTools → Network → WS → Ver mensagens
```

### Comandos Úteis
```bash
# Reiniciar ChatEngine
docker-compose restart chatengine

# Ver status dos containers
docker-compose ps

# Limpar logs
docker-compose logs --tail=0 -f chatengine
```

---

**Última atualização:** Janeiro 2025
