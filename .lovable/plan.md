

# Plano de Correção: Fluxos de Autenticação e Convites

## Diagnóstico dos Problemas

### Problema 1: Convites por email retornando "non-2xx status code"

**Causa identificada nos logs:**
```
AuthSessionMissingError: Auth session missing!
```

O problema está na edge function `send-invitation`. Mesmo com `verify_jwt = false`, a função tenta obter o usuário via `supabase.auth.getUser()` usando um cliente criado com a anon key e o Authorization header do usuário. Isso falha porque:
1. A sessão do usuário expirou
2. O token não está sendo passado corretamente para a edge function

**Evidência:** O código verifica a sessão antes de chamar (`getSession()`), mas o token pode não estar chegando corretamente à edge function.

---

### Problema 2: Link de confirmação de email redireciona para localhost

**Causa identificada nos logs:**
```
referer: "http://localhost:3000"
```

O signUp no `AuthContext.tsx` usa `window.location.origin` para definir o `emailRedirectTo`:
```javascript
const redirectUrl = `${window.location.origin}/`;
```

Quando o usuário está no ambiente de preview do Lovable, `window.location.origin` retorna `http://localhost:xxxx` ou a URL do iframe, não o domínio publicado.

---

### Problema 3: Email sem personalização (padrão Supabase)

Os emails de confirmação de conta são enviados diretamente pelo Supabase Auth, não pela nossa aplicação. O Supabase usa templates padrão a menos que sejam personalizados no dashboard.

**Solução:** Configurar os templates de email no Supabase Dashboard ou usar um Custom SMTP com Resend.

---

## Plano de Implementação

### Fase 1: Corrigir Edge Function de Convites

**Arquivo:** `supabase/functions/send-invitation/index.ts`

1. Melhorar o tratamento de autenticação para ser mais robusto
2. Usar `getClaims()` em vez de `getUser()` para validar o token
3. Adicionar logs mais detalhados para debugging

```text
Mudanças:
- Extrair e validar o JWT manualmente
- Usar service_role para operações que precisam de acesso admin
- Manter validação de autorização do usuário
```

---

### Fase 2: Corrigir Redirect de Confirmação de Email

**Arquivo:** `src/contexts/AuthContext.tsx`

1. Usar o domínio publicado fixo em vez de `window.location.origin`
2. O domínio deve ser `https://crm.newflow.me`

```text
ANTES:
const redirectUrl = `${window.location.origin}/`;

DEPOIS:
const redirectUrl = 'https://crm.newflow.me/';
```

---

### Fase 3: Configurar Templates de Email Customizados

**Opção A - Templates no Supabase Dashboard:**
- Acessar: Supabase Dashboard > Authentication > Email Templates
- Personalizar templates de: Confirmação, Reset de Senha, Magic Link, etc.
- Adicionar branding NewFlow CRM

**Opção B - SMTP Personalizado com Resend:**
- Configurar Resend como SMTP provider no Supabase
- Todos os emails de auth usarão o domínio verificado

Recomendação: **Opção A** é mais simples e rápida.

---

## Detalhes Técnicos

### Correção da Edge Function send-invitation

```typescript
// Validar token usando getClaims em vez de getUser
const token = authHeader.replace('Bearer ', '');
const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);

if (claimsError || !claims?.claims?.sub) {
  console.error("[send-invitation] Invalid token:", claimsError);
  return new Response(
    JSON.stringify({ error: "Token inválido ou expirado" }),
    { status: 401, headers: corsHeaders }
  );
}

const userId = claims.claims.sub;
```

### Correção do AuthContext

```typescript
// Usar domínio fixo para produção
const signUp = async (email: string, password: string, fullName: string) => {
  try {
    // Usar domínio publicado fixo para garantir redirecionamento correto
    const redirectUrl = 'https://crm.newflow.me/';
    
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
        },
      },
    });
    // ...
  }
};
```

---

## Checklist de Implementação

1. **Edge Function send-invitation**
   - [ ] Atualizar para usar validação de token mais robusta
   - [ ] Adicionar fallback com service_role para operações críticas
   - [ ] Manter logs detalhados

2. **AuthContext.tsx**
   - [ ] Alterar `emailRedirectTo` para usar domínio fixo `https://crm.newflow.me/`

3. **Templates de Email (Manual)**
   - [ ] Acessar Supabase Dashboard
   - [ ] Personalizar template de confirmação com branding NewFlow
   - [ ] Personalizar template de reset de senha
   - [ ] Configurar remetente (From) como `noreply@newflow.me` ou similar

4. **Testes**
   - [ ] Testar envio de convite
   - [ ] Testar criação de conta e clique no link de confirmação
   - [ ] Verificar aparência do email recebido

---

## Links Úteis para Configuração

- **Email Templates:** https://supabase.com/dashboard/project/tiaojwumxgdnobknlyqp/auth/templates
- **SMTP Settings:** https://supabase.com/dashboard/project/tiaojwumxgdnobknlyqp/settings/auth
- **Edge Function Logs:** https://supabase.com/dashboard/project/tiaojwumxgdnobknlyqp/functions/send-invitation/logs

