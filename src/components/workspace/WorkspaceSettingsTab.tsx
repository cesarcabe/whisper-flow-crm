import { useState, useEffect } from 'react';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BusinessTypeSelector } from '@/components/workspace/BusinessTypeSelector';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_TYPES, type BusinessTypeValue } from '@/core/domain/value-objects/BusinessType';

export function WorkspaceSettingsTab() {
  const { workspace, refetchWorkspace } = useWorkspace();
  
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessTypeValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with workspace data
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || '');
      // Get business_type from database
      const fetchBusinessType = async () => {
        const { data } = await supabase
          .from('workspaces')
          .select('business_type')
          .eq('id', workspace.id)
          .single();
        
        if (data?.business_type && data.business_type in BUSINESS_TYPES) {
          setBusinessType(data.business_type as BusinessTypeValue);
        }
      };
      fetchBusinessType();
    }
  }, [workspace]);

  // Track changes
  useEffect(() => {
    if (!workspace) return;
    
    const nameChanged = name !== workspace.name;
    setHasChanges(nameChanged);
  }, [name, workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ 
          name: name.trim(),
          business_type: businessType,
        })
        .eq('id', workspace.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
      await refetchWorkspace();
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving workspace settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const currentBusinessType = businessType ? BUSINESS_TYPES[businessType] : null;

  return (
    <div className="space-y-6">
      {/* General Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações do Workspace
          </CardTitle>
          <CardDescription>
            Configure as informações básicas do seu workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome do Workspace</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Empresa"
              disabled={isSaving}
            />
          </div>

          <Separator />

          {/* Business Type */}
          <div className="space-y-4">
            <div>
              <Label>Tipo de Negócio</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Define os estágios padrão do pipeline de vendas
              </p>
            </div>
            
            {currentBusinessType && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm">
                  <span className="font-medium">Atual: </span>
                  {currentBusinessType.label}
                </p>
              </div>
            )}

            <BusinessTypeSelector
              value={businessType}
              onChange={(type) => {
                setBusinessType(type);
                setHasChanges(true);
              }}
              disabled={isSaving}
            />

            <p className="text-xs text-muted-foreground">
              ⚠️ Alterar o tipo de negócio afeta apenas novos pipelines. 
              Pipelines existentes mantêm seus estágios atuais.
            </p>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
