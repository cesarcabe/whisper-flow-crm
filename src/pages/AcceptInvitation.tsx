import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  workspace_name: string;
  expires_at: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { refetchWorkspace } = useWorkspace();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auth form state
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Link de convite inválido');
        setLoading(false);
        return;
      }

      try {
        // Use edge function to validate invitation (bypasses RLS for unauthenticated users)
        const response = await supabase.functions.invoke('validate-invitation', {
          body: { token },
        });

        if (response.error) {
          console.error('[AcceptInvitation] Edge function error:', response.error);
          setError('Erro ao validar convite');
          setLoading(false);
          return;
        }

        if (response.data?.error) {
          setError(response.data.error);
          setLoading(false);
          return;
        }

        if (!response.data?.valid || !response.data?.invitation) {
          setError('Convite não encontrado ou já foi utilizado');
          setLoading(false);
          return;
        }

        const inv = response.data.invitation;
        setInvitation({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          workspace_name: inv.workspace_name,
          expires_at: inv.expires_at,
        });
        setEmail(inv.email);
      } catch (err) {
        console.error('[AcceptInvitation] Error:', err);
        setError('Erro ao carregar convite');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  // Auto-accept if user is already logged in with correct email
  useEffect(() => {
    const autoAccept = async () => {
      if (!authLoading && user && invitation && !success && !accepting) {
        if (user.email?.toLowerCase() === invitation.email.toLowerCase()) {
          await handleAccept();
        }
      }
    };
    autoAccept();
  }, [user, invitation, authLoading]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const response = await supabase.functions.invoke('accept-invitation', {
        body: { token },
      });

      if (response.error) {
        toast.error(response.error.message || 'Erro ao aceitar convite');
        setAccepting(false);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        setAccepting(false);
        return;
      }

      setSuccess(true);
      toast.success(response.data?.message || 'Convite aceito com sucesso!');
      
      // Refetch workspaces to include the new one, then redirect
      await refetchWorkspace();
      
      // Small delay to ensure state is updated, then redirect
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('[AcceptInvitation] Error accepting:', err);
      toast.error('Erro inesperado ao aceitar convite');
      setAccepting(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading2(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          toast.error(error.message);
          setAuthLoading2(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/invite/${token}`,
          },
        });
        if (error) {
          toast.error(error.message);
          setAuthLoading2(false);
          return;
        }
        toast.success('Conta criada! Verifique seu email para confirmar.');
      }
    } catch (err) {
      toast.error('Erro inesperado');
    } finally {
      setAuthLoading2(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Bem-vindo!</CardTitle>
            <CardDescription>
              Você agora faz parte do workspace {invitation?.workspace_name}.
              Redirecionando...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user) {
    // User is logged in but with different email
    if (user.email?.toLowerCase() !== invitation?.email.toLowerCase()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Email Incorreto</CardTitle>
              <CardDescription>
                Este convite foi enviado para <strong>{invitation?.email}</strong>.
                Você está logado como <strong>{user.email}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="w-full"
              >
                Sair e fazer login com outro email
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Accepting...
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User not logged in - show auth form
  const roleLabel = invitation?.role === 'admin' ? 'Administrador' : 'Agente';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Convite para {invitation?.workspace_name}</CardTitle>
          <CardDescription>
            Você foi convidado para participar como <strong>{roleLabel}</strong>.
            {isLogin ? ' Faça login para continuar.' : ' Crie sua conta para aceitar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled
              />
              <p className="text-xs text-muted-foreground">
                O email deve corresponder ao convite
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={authLoading2}>
              {authLoading2 ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:underline"
              >
                {isLogin
                  ? 'Não tem conta? Criar uma'
                  : 'Já tem conta? Fazer login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
