# Plano: Tipo de Negócio e CRM com IA

## Fase 1: Classificação por Tipo de Negócio

### 1.1 Migração do Banco de Dados
Adicionar coluna `business_type` na tabela `workspaces`:
- `wholesale_clothing` (Atacado de Roupas)
- `retail_clothing` (Varejo de Roupas)
- `clinic` (Clínica)
- `other` (Outros)

### 1.2 Estágios por Tipo de Negócio

| Tipo de Negócio | Estágios (em ordem) |
|-----------------|---------------------|
| **Atacado de Roupas** | Novo Lead → Qualificação → Catalogo Enviado → Negociação → Pedido Fechado → Venda Realizada |
| **Varejo de Roupas** | Novo Lead → Interesse → Atendimento → Pedido escolhido → Venda Realizada |
| **Clínica** | Novo Lead → Triagem → Agendamento → Consulta → Retorno |
| **Outros** | Novo Lead → Qualificação → Proposta → Negociação → Fechado |

### 1.3 Cores Sugeridas por Estágio

| Estágio | Cor |
|---------|-----|
| Novo Lead | `#6B7280` (cinza) |
| Qualificação / Interesse / Triagem | `#F59E0B` (amarelo) |
| Catalogo Enviado / Atendimento / Agendamento | `#3B82F6` (azul) |
| Negociação / Pedido escolhido / Consulta | `#8B5CF6` (roxo) |
| Pedido Fechado / Proposta | `#06B6D4` (ciano) |
| Venda Realizada / Fechado / Retorno | `#10B981` (verde) |

### 1.4 Interface de Seleção

**Onboarding (novo workspace):**
- Modal com 4 opções visuais (cards com ícone)
- Seleção obrigatória antes de continuar
- Criação automática dos estágios

**Configurações (workspace existente):**
- Opção em Settings > Workspace
- Aviso: "Trocar o tipo de negócio não altera estágios existentes"

---

## Fase 2: Preenchimento do CRM com IA

### 2.1 Arquitetura

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Conversas     │────▶│  Edge Function       │────▶│  Lovable AI     │
│   (messages)    │     │  analyze-conversation│     │  Gateway        │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  Atualizar contato   │
                        │  e/ou conversa       │
                        └──────────────────────┘
```

### 2.2 Campos que a IA Preencherá

| Campo | Tabela | Descrição |
|-------|--------|-----------|
| `contact_class_id` | contacts | Classificação do contato |
| `stage_id` | conversations | Estágio atual no funil |
| `notes` | contacts | Observações extraídas |
| Tags | contact_tags | Tags relevantes |

### 2.3 Modos de Operação

1. **Manual**: Botão "Analisar conversa" na interface
2. **Sugestão**: IA sugere, usuário aprova
3. **Automático**: IA aplica diretamente (configurável)

### 2.4 Implementação

1. Habilitar Lovable AI Gateway
2. Criar Edge Function `analyze-conversation`
3. Criar UI para exibir sugestões da IA
4. Implementar aprovação/rejeição de sugestões

---

## Ordem de Implementação

### Sprint 1: Tipo de Negócio
- [x] Definir estágios por tipo de negócio
- [ ] Migração: adicionar `business_type` em workspaces
- [ ] Criar templates de estágios (domain layer)
- [ ] Atualizar trigger `handle_new_pipeline` ou edge function
- [ ] Modal de seleção no onboarding
- [ ] Opção em configurações

### Sprint 2: CRM com IA
- [ ] Habilitar Lovable AI Gateway
- [ ] Edge Function `analyze-conversation`
- [ ] UI para sugestões da IA
- [ ] Modo manual (botão)
- [ ] Modo sugestão (aprovar/rejeitar)
- [ ] Modo automático (opcional)

---

## Notas Técnicas

### Trigger de Criação de Estágios
Atualizar a função `handle_new_pipeline` para receber o `business_type` do workspace e criar os estágios corretos:

```sql
-- Exemplo: buscar business_type do workspace
SELECT business_type FROM workspaces WHERE id = NEW.workspace_id;

-- Criar estágios baseado no tipo
CASE business_type
  WHEN 'wholesale_clothing' THEN
    -- 6 estágios do atacado
  WHEN 'retail_clothing' THEN
    -- 5 estágios do varejo
  ...
END;
```
