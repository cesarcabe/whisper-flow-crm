
# Plano: Novo Layout da Página de Login

## Visão Geral

Transformar a página de autenticação de um layout centralizado simples para um layout de duas colunas moderno e profissional:

- **Lado Esquerdo**: Formulário de login/cadastro
- **Lado Direito**: Painel visual com logo New Flow e slogan

## Resultado Visual Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │                        │  │                                │ │
│  │    [Formulário]        │  │     ████ LOGO ████             │ │
│  │                        │  │                                │ │
│  │  Entrar | Criar conta  │  │    "Transforme conversas      │ │
│  │  ─────────────────     │  │     em resultados"            │ │
│  │  📧 Email              │  │                                │ │
│  │  🔒 Senha              │  │    ─ ou ─                      │ │
│  │                        │  │                                │ │
│  │  [ Entrar ]            │  │    Slogan adicional da        │ │
│  │                        │  │    marca New Flow              │ │
│  │                        │  │                                │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Comportamento Responsivo

- **Desktop**: Duas colunas lado a lado (50% / 50%)
- **Mobile**: Apenas formulário visível, painel direito oculto

## Mudanças Planejadas

### 1. Corrigir Arquivo Corrompido
O arquivo `src/modules/conversation/application/index.ts` está corrompido com caracteres inválidos. Será reescrito corretamente.

### 2. Reestruturar Layout (Auth.tsx)

**De:**
- Container centralizado com Card único

**Para:**
- Grid de duas colunas (`lg:grid-cols-2`)
- Coluna esquerda: formulário de login
- Coluna direita: painel visual com gradiente

### 3. Painel Visual (lado direito)

Elementos:
- Fundo com gradiente premium (tons de slate/azul da identidade visual)
- Logo New Flow em tamanho maior
- Título "NEW FLOW" 
- Slogan principal em destaque
- Opcional: ícones decorativos ou padrão de fundo sutil

**Slogan sugerido:**
> "Transforme conversas em resultados"

Ou alternativas:
- "Gerencie suas conversas com inteligência"
- "O fluxo perfeito para suas vendas"

---

## Seção Técnica

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Auth.tsx` | Reestruturar layout para duas colunas |
| `src/modules/conversation/application/index.ts` | Corrigir arquivo corrompido |

### Estrutura do Novo Componente

```tsx
// Auth.tsx - Nova estrutura
<div className="min-h-screen grid lg:grid-cols-2">
  {/* Lado Esquerdo - Formulário */}
  <div className="flex items-center justify-center p-8">
    <Card>
      {/* Formulário de login/signup existente */}
    </Card>
  </div>
  
  {/* Lado Direito - Branding (oculto em mobile) */}
  <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-white p-12">
    <img src="/logo-newflow.png" className="h-24 w-24 mb-8" />
    <h1 className="text-4xl font-bold mb-4">NEW FLOW</h1>
    <p className="text-xl text-center opacity-90">
      Transforme conversas em resultados
    </p>
  </div>
</div>
```

### Paleta de Cores do Painel

Utilizando as variáveis CSS já definidas:
- `--primary: 215 25% 27%` (slate/azul premium)
- `--sidebar-background: 220 20% 14%` (tom escuro elegante)
- Gradiente entre esses tons para efeito visual sofisticado
