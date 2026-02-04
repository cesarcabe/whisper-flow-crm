import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { z } from 'zod';
import { Loader2, Building2, LogOut, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BusinessTypeSelector } from '@/components/workspace/BusinessTypeSelector';
import type { BusinessTypeValue } from '@/core/domain/value-objects/BusinessType';

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(50, 'Nome deve ter no máximo 50 caracteres');

type SetupStep = 'business_type' | 'workspace_name';

export default function SetupWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const { refetchWorkspace } = useWorkspace();

  const [step, setStep] = useState<SetupStep>('business_type');
  const [businessType, setBusinessType] = useState<BusinessTypeValue | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Query params para integração futura com Stripe
  const plan = searchParams.get('plan');

  const handleNextStep = () => {
    if (!businessType) {
      setError('Selecione o tipo do seu negócio');
      return;
    }
    setError('');
    setStep('workspace_name');
  };

  const handleBackStep = () => {
    setError('');
    setStep('business_type');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar nome
    const validation = workspaceNameSchema.safeParse(workspaceName);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('provision-workspace', {
        body: { 
          name: validation.data,
          business_type: businessType,
        },
      });

      if (fnError) {
        console.error('Error creating workspace:', fnError);
        throw new Error(fnError.message || 'Erro ao criar workspace');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Erro ao criar workspace');
      }

      toast.success('Workspace criado com sucesso!');
      
      // Atualizar contexto de workspace
      await refetchWorkspace();
      
      // Redirecionar para home
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Setup workspace error:', err);
      setError(err.message || 'Erro ao criar workspace. Tente novamente.');
      toast.error('Erro ao criar workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Configurar Workspace | CRM</title>
        <meta name="description" content="Configure seu workspace para começar a usar o CRM" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {step === 'business_type' ? 'Tipo de Negócio' : 'Criar Workspace'}
            </CardTitle>
            <CardDescription>
              {step === 'business_type' 
                ? 'Selecione o tipo do seu negócio para configurarmos os estágios de venda ideais'
                : plan 
                  ? `Configure seu workspace para o plano ${plan}`
                  : 'Dê um nome ao seu workspace para começar'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'business_type' ? (
              <div className="space-y-6">
                <BusinessTypeSelector
                  value={businessType}
                  onChange={(type) => {
                    setBusinessType(type);
                    setError('');
                  }}
                  disabled={isLoading}
                />

                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!businessType}
                    className="w-full"
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da conta
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Nome do Workspace</Label>
                  <Input
                    id="workspace-name"
                    type="text"
                    placeholder="Ex: Minha Empresa"
                    value={workspaceName}
                    onChange={(e) => {
                      setWorkspaceName(e.target.value);
                      setError('');
                    }}
                    disabled={isLoading}
                    autoFocus
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackStep}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Workspace'
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signOut()}
                  disabled={isLoading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da conta
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
