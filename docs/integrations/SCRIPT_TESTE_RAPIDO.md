# Script de Teste Rápido - Integração ChatEngine

## 🚀 Início Rápido

### 1. Iniciar ChatEngine
```bash
cd C:\Users\arman\Codes\ChatEngine
npm run dev
# Aguardar: "> Ready on http://localhost:3000"
```

### 2. Iniciar CRM
```bash
cd C:\Users\arman\Codes\whisper-flow-crm
npm run dev
# Abrir: http://localhost:5173
```

### 3. Verificar Conexão WebSocket

#### No Console do Navegador (F12)
```javascript
// Verificar se WebSocket está conectado
// Procurar por logs:
// [WebSocket] Connecting to: ws://localhost:3000/api/ws
// [WebSocket] Connected
```

---

## ✅ Checklist de Teste Rápido (5 minutos)

### Teste 1: Conexão WebSocket (30 segundos)
- [ ] Abrir DevTools → Console
- [ ] Verificar log: `[WebSocket] Connected`
- [ ] Status deve mostrar "Conectado"

### Teste 2: Enviar Mensagem (1 minuto)
- [ ] Abrir uma conversa no CRM
- [ ] Digitar e enviar uma mensagem
- [ ] Verificar:
  - [ ] Mensagem aparece imediatamente
  - [ ] Status muda para "sent"
  - [ ] Mensagem chega no WhatsApp

### Teste 3: Receber Mensagem (1 minuto)
- [ ] Enviar mensagem do WhatsApp
- [ ] Verificar no CRM:
  - [ ] Mensagem aparece em < 1 segundo
  - [ ] Conversa sobe ao topo
  - [ ] Preview atualiza

### Teste 4: Atualização de Status (1 minuto)
- [ ] Enviar mensagem do CRM
- [ ] Verificar mudanças de status:
  - [ ] "sending" → "sent" → "delivered"
  - [ ] Status atualiza automaticamente

### Teste 5: WebSocket Test Panel (1 minuto)
- [ ] Adicionar componente `WebSocketTestPanel` em uma página de teste
- [ ] Verificar status da conexão
- [ ] Testar subscription manual
- [ ] Verificar logs de eventos

---

## 🧪 Teste com WebSocket Test Panel

### Adicionar Componente de Teste

1. **Criar página de teste** (opcional):
```typescript
// src/pages/test-websocket.tsx
import { WebSocketTestPanel } from '@/components/test/WebSocketTestPanel'

export default function TestWebSocketPage() {
  return (
    <div className="container py-8">
      <WebSocketTestPanel />
    </div>
  )
}
```

2. **Ou adicionar em qualquer página existente:**
```typescript
import { WebSocketTestPanel } from '@/components/test/WebSocketTestPanel'

// Dentro do componente
<WebSocketTestPanel />
```

### Usar o Painel

1. **Verificar Status:**
   - Badge deve mostrar "Conectado" (verde)
   - Estado deve ser "connected"

2. **Testar Subscription:**
   - Inserir um Conversation ID
   - Clicar em "Subscribe"
   - Verificar log: "Subscribed to conversation"

3. **Testar Recebimento:**
   - Enviar mensagem do WhatsApp
   - Verificar log: "📨 Mensagem recebida"

4. **Testar Typing:**
   - Clicar em "Emit Typing"
   - Verificar log: "⌨️ Typing indicator sent"

---

## 🔍 Verificação Rápida de Problemas

### WebSocket não conecta?
```javascript
// No console do navegador
// Verificar:
1. ChatEngine está rodando? → http://localhost:3000
2. JWT está sendo gerado? → Verificar logs do useChatEngineJwt
3. URL está correta? → Verificar VITE_CHATENGINE_API_URL
```

### Mensagens não chegam?
```javascript
// Verificar:
1. WebSocket está conectado? → Verificar badge no painel
2. Subscription foi feita? → Verificar logs
3. Evolution API está enviando webhooks? → Verificar logs do ChatEngine
```

### Status não atualiza?
```javascript
// Verificar:
1. Listener está registrado? → Verificar código do useMessages
2. ChatEngine está emitindo eventos? → Verificar logs do ChatEngine
3. WebSocket está recebendo eventos? → Verificar logs no painel
```

---

## 📊 Comandos Úteis

### ChatEngine
```bash
# Ver logs em tempo real
npm run dev | grep -i websocket

# Verificar se servidor está rodando
curl http://localhost:3000/api/health
```

### CRM
```bash
# Verificar build
npm run build

# Limpar cache
rm -rf node_modules/.vite
```

### Docker (se usando)
```bash
# Ver logs do ChatEngine
docker-compose logs -f chatengine

# Reiniciar
docker-compose restart chatengine

# Ver status
docker-compose ps
```

---

## 🎯 Teste Completo (10 minutos)

### Cenário 1: Fluxo Completo de Mensagem
1. **Enviar mensagem do CRM**
   - [ ] Mensagem aparece imediatamente
   - [ ] Status: "sending" → "sent" → "delivered"
   - [ ] Mensagem chega no WhatsApp

2. **Responder do WhatsApp**
   - [ ] Mensagem aparece no CRM em < 1 segundo
   - [ ] Conversa sobe ao topo
   - [ ] Preview atualiza

3. **Enviar mídia do CRM**
   - [ ] Upload funciona
   - [ ] Imagem aparece no preview
   - [ ] Imagem chega no WhatsApp

### Cenário 2: Múltiplas Conversas
1. **Receber mensagem em conversa A**
   - [ ] Conversa A sobe ao topo
   - [ ] Preview atualiza

2. **Receber mensagem em conversa B**
   - [ ] Conversa B sobe ao topo
   - [ ] Conversa A fica em segundo lugar

### Cenário 3: Reconexão
1. **Desconectar ChatEngine** (Ctrl+C)
   - [ ] WebSocket detecta desconexão
   - [ ] Logs mostram tentativas de reconexão

2. **Reconectar ChatEngine** (npm run dev)
   - [ ] WebSocket reconecta automaticamente
   - [ ] Subscriptions são restauradas
   - [ ] Mensagens continuam chegando

---

## ✅ Critérios de Sucesso

### ✅ Teste Passou Se:
- [ ] WebSocket conecta em < 5 segundos
- [ ] Mensagens chegam em < 1 segundo
- [ ] Status atualiza corretamente
- [ ] Sem duplicação de mensagens
- [ ] Reconexão funciona automaticamente
- [ ] Fallback para Supabase funciona quando WebSocket está desabilitado

### ❌ Teste Falhou Se:
- [ ] WebSocket não conecta após 30 segundos
- [ ] Mensagens não chegam ou chegam com > 5 segundos de latência
- [ ] Status não atualiza
- [ ] Mensagens duplicadas aparecem
- [ ] Reconexão não funciona

---

**Última atualização:** Janeiro 2025
