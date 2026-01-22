import { useState } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Link2Off, 
  MessageSquare, 
  MoreVertical,
  Check,
  X,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { WhatsappNumber, mapStatus } from '@/hooks/useWhatsappNumbers';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Pipeline = Tables<'pipelines'>;

interface WhatsappConnectionCardProps {
  number: WhatsappNumber;
  pipelines: Pipeline[];
  onUpdatePipeline: (id: string, pipelineId: string | null) => Promise<void>;
  onUpdateName: (id: string, name: string) => Promise<void>;
  onShowQr: (id: string) => void;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<{ ok: boolean; evolution_error?: string | null } | void>;
}

export function WhatsappConnectionCard({
  number,
  pipelines,
  onUpdatePipeline,
  onUpdateName,
  onShowQr,
  onRefresh,
  onDelete,
}: WhatsappConnectionCardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(number.internal_name);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = mapStatus(number.status);

  const statusConfig = {
    CONNECTED: { label: 'Conectado', variant: 'default' as const, className: 'bg-primary text-primary-foreground' },
    PAIRING: { label: 'Pareando', variant: 'secondary' as const, className: 'bg-yellow-500 text-white' },
    DISCONNECTED: { label: 'Desconectado', variant: 'outline' as const, className: '' },
    ERROR: { label: 'Erro', variant: 'destructive' as const, className: '' },
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName === number.internal_name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateName(number.id, editName.trim());
    } catch (err) {
      setEditName(number.internal_name);
    }
    setSaving(false);
    setEditing(false);
  };

  const handlePipelineChange = async (value: string) => {
    const pipelineId = value === 'none' ? null : value;
    await onUpdatePipeline(number.id, pipelineId);
  };

  const handleDelete = async () => {
    console.log('[DeleteConnection] UI_delete_clicked', { 
      id: number.id, 
      name: number.internal_name,
      status: number.status 
    });
    
    setDeleting(true);
    try {
      const result = await onDelete(number.id);
      console.log('[DeleteConnection] UI_delete_success', { id: number.id, result });
      
      // Show appropriate message based on Evolution result
      if (result && typeof result === 'object' && 'evolution_error' in result && result.evolution_error) {
        toast.warning('Conexão removida do sistema. Aviso: não foi possível remover do provedor.');
      } else {
        toast.success('Conexão excluída com sucesso');
      }
    } catch (err: any) {
      console.error('[DeleteConnection] UI_delete_error', { id: number.id, error: err });
      toast.error(err?.message || 'Erro ao excluir conexão');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const lastActivity = number.last_connected_at || number.updated_at;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm w-40"
                    disabled={saving}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') {
                        setEditName(number.internal_name);
                        setEditing(false);
                      }
                    }}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName} disabled={saving}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditName(number.internal_name); setEditing(false); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-medium text-foreground truncate">{number.internal_name}</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Badge className={statusConfig[status].className} variant={statusConfig[status].variant}>
                {statusConfig[status].label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {number.phone_number || 'Sem número'}
            </p>
            {lastActivity && (
              <p className="text-xs text-muted-foreground mt-1">
                Última atividade: {formatDistanceToNow(new Date(lastActivity), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </div>

          {/* Pipeline Select */}
          <div className="w-48 flex-shrink-0">
            <Select
              value={number.pipeline_preferential_id || 'none'}
              onValueChange={handlePipelineChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem pipeline</SelectItem>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {status !== 'CONNECTED' && (
              <Button variant="outline" size="sm" onClick={() => onShowQr(number.id)}>
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/?whatsapp=${number.id}`)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversas
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === 'CONNECTED' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem disabled>
                        <Link2Off className="h-4 w-4 mr-2" />
                        Desconectar
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>Em breve</TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenuItem onClick={() => onShowQr(number.id)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Exibir QR Code
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir conexão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conexão "{number.internal_name}"? 
              Esta ação não pode ser desfeita e todas as conversas associadas serão mantidas, 
              mas você não poderá mais enviar ou receber mensagens por este número.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
