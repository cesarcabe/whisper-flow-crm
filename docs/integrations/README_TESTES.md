# 📚 Documentação de Testes - Integração ChatEngine

## 📖 Documentos Disponíveis

### 1. **GUIA_TESTES_INTEGRACAO.md** ⭐ Principal
Guia completo e detalhado para testar a integração:
- ✅ Pré-requisitos e configuração
- ✅ Como iniciar os aplicativos
- ✅ Testes de todas as funcionalidades
- ✅ Testes de WebSocket
- ✅ Debugging e troubleshooting
- ✅ Checklist completo

**Use este guia para:** Testes completos e detalhados

---

### 2. **SCRIPT_TESTE_RAPIDO.md** ⚡ Rápido
Script de teste rápido (5-10 minutos):
- ✅ Início rápido
- ✅ Checklist de 5 minutos
- ✅ Verificação rápida de problemas
- ✅ Comandos úteis

**Use este guia para:** Testes rápidos e validação básica

---

### 3. **WebSocketTestPanel.tsx** 🧪 Componente
Componente React para testar WebSocket visualmente:
- ✅ Status da conexão em tempo real
- ✅ Testes de subscription/unsubscription
- ✅ Logs de eventos WebSocket
- ✅ Teste de indicadores de digitação

**Como usar:**
```typescript
import { WebSocketTestPanel } from '@/components/test/WebSocketTestPanel'

// Adicionar em qualquer página
<WebSocketTestPanel />
```

---

## 🚀 Início Rápido

### 1. Iniciar ChatEngine
```bash
cd C:\Users\arman\Codes\ChatEngine
npm run dev
```

### 2. Iniciar CRM
```bash
cd C:\Users\arman\Codes\whisper-flow-crm
npm run dev
```

### 3. Verificar Conexão
- Abrir DevTools (F12) → Console
- Procurar por: `[WebSocket] Connected`

---

## 📋 Checklist Rápido

- [ ] ChatEngine rodando em `http://localhost:3000`
- [ ] CRM rodando em `http://localhost:5173`
- [ ] WebSocket conectado (verificar console)
- [ ] Enviar mensagem do CRM → aparece no WhatsApp
- [ ] Enviar mensagem do WhatsApp → aparece no CRM (< 1 segundo)
- [ ] Status atualiza corretamente

---

## 🆘 Problemas Comuns

### WebSocket não conecta?
1. Verificar se ChatEngine está rodando
2. Verificar variáveis de ambiente
3. Verificar JWT está sendo gerado

### Mensagens não chegam?
1. Verificar WebSocket está conectado
2. Verificar subscription foi feita
3. Verificar Evolution API está enviando webhooks

**Solução completa:** Ver `GUIA_TESTES_INTEGRACAO.md` → Seção "Debugging"

---

## 📊 Ordem Recomendada de Testes

1. **Teste Rápido** (5 min)
   - Usar `SCRIPT_TESTE_RAPIDO.md`
   - Validar conexão básica

2. **Teste Completo** (30 min)
   - Usar `GUIA_TESTE_INTEGRACAO.md`
   - Testar todas as funcionalidades

3. **Teste Visual** (10 min)
   - Usar `WebSocketTestPanel`
   - Ver logs em tempo real

---

## 🔗 Documentos Relacionados

- `CHATENGINE_CONNECTION_PLAN.md` - Plano de conexão
- `WEBSOCKET_IMPLEMENTATION_GUIDE.md` - Guia de implementação
- `WEBSOCKET_IMPLEMENTATION_STATUS.md` - Status da implementação
- `RESUMO_CONEXAO_CHATENGINE.md` - Resumo executivo

---

**Última atualização:** Janeiro 2025
