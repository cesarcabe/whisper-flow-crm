import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePipelines } from '@/hooks/usePipelines';
import { useContacts } from '@/hooks/useContacts';
import { useContactClasses } from '@/hooks/useContactClasses';
import { useConversationStages } from '@/hooks/useConversationStages';
import { useAuth } from '@/contexts/AuthContext';
import { PipelineHeader } from './PipelineHeader';
import { KanbanBoard } from './KanbanBoard';
import { RelationshipBoard } from './RelationshipBoard';
import { StageBoard } from './StageBoard';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { CreatePipelineDialog } from './dialogs/CreatePipelineDialog';
import { CreateStageDialog } from './dialogs/CreateStageDialog';
import { CreateCardDialog } from './dialogs/CreateCardDialog';
import { CreateContactDialog } from './dialogs/CreateContactDialog';
import { Card, BoardViewType } from '@/types/database';
import { Loader2, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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

export function KanbanView() {
  const [searchParams] = useSearchParams();
  const { profile, signOut } = useAuth();
  const {
    pipelines,
    activePipeline,
    loading: pipelinesLoading,
    setActivePipeline,
    createPipeline,
    deletePipeline,
    createStage,
    deleteStage,
    moveCard,
    createCard,
  } = usePipelines();
  
  const { contacts, createContact } = useContacts();
  
  const {
    contactClasses,
    contactsByClass,
    unclassifiedContacts,
    loading: classesLoading,
    moveContact,
    createContactClass,
    updateContactClass,
    deleteContactClass,
  } = useContactClasses();

  const {
    activePipeline: stagePipeline,
    loading: stagesLoading,
    moveConversation,
    fetchPipelineWithConversations,
  } = useConversationStages();

  // Check if URL has whatsapp param to auto-switch to chat view
  const whatsappFromUrl = searchParams.get('whatsapp');
  const [currentView, setCurrentView] = useState<'kanban' | 'chat'>(whatsappFromUrl ? 'chat' : 'kanban');
  const [boardType, setBoardType] = useState<BoardViewType>('relationship');

  // Auto-switch to chat view when whatsapp param is present
  useEffect(() => {
    if (whatsappFromUrl) {
      setCurrentView('chat');
    }
  }, [whatsappFromUrl]);
  
  // Dialog states
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [showCreateStage, setShowCreateStage] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showDeletePipeline, setShowDeletePipeline] = useState(false);
  const [showDeleteStage, setShowDeleteStage] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);

  // Edit Stage dialog state
  const [showEditStage, setShowEditStage] = useState(false);
  const [editStageId, setEditStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('#6B7280');

  // Edit Class dialog state
  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassColor, setEditClassColor] = useState('#6B7280');

  // Contact details dialog state
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Listen for crm:open-chat event
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent<{ contactId: string; conversationId: string | null }>) => {
      console.log('crm:open-chat received', e.detail);
      localStorage.setItem('crm:selectedContactId', e.detail.contactId);
      if (e.detail.conversationId) {
        localStorage.setItem('crm:selectedConversationId', e.detail.conversationId);
      }
      setCurrentView('chat');
    };
    window.addEventListener('crm:open-chat', handleOpenChat as EventListener);
    return () => window.removeEventListener('crm:open-chat', handleOpenChat as EventListener);
  }, []);

  const handleAddCard = (stageId: string) => {
    setSelectedStageId(stageId);
    setShowCreateCard(true);
  };

  const handleEditStage = (stageId: string) => {
    const stage = stagePipeline?.stages.find((s: any) => s.id === stageId);
    if (stage) {
      setEditStageId(stageId);
      setEditStageName(stage.name);
      setEditStageColor(stage.color || '#6B7280');
      setShowEditStage(true);
    }
  };

  const handleEditClass = (classId: string) => {
    const cls = contactClasses.find((c) => c.id === classId);
    if (cls) {
      setEditClassId(classId);
      setEditClassName(cls.name);
      setEditClassColor(cls.color || '#6B7280');
      setShowEditClass(true);
    }
  };

  const handleContactClick = (contact: any) => {
    setSelectedContact(contact);
    setShowContactDetails(true);
  };

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId);
    setShowDeleteStage(true);
  };

  const handleCardClick = (card: Card) => {
    const contact = contacts.find((c) => c.id === card.contact_id);
    if (contact) {
      handleContactClick(contact);
    }
  };

  const loading = pipelinesLoading || classesLoading || stagesLoading;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'chat') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <PipelineHeader
          pipelines={pipelines}
          activePipeline={activePipeline}
          onSelectPipeline={setActivePipeline}
          onCreatePipeline={() => setShowCreatePipeline(true)}
          onEditPipeline={() => {}}
          onDeletePipeline={() => setShowDeletePipeline(true)}
          onViewChange={setCurrentView}
          currentView={currentView}
          userName={profile?.full_name || undefined}
          onSignOut={signOut}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          <CRMLayout />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <PipelineHeader
        pipelines={pipelines}
        activePipeline={activePipeline}
        onSelectPipeline={setActivePipeline}
        onCreatePipeline={() => setShowCreatePipeline(true)}
        onEditPipeline={() => {}}
        onDeletePipeline={() => setShowDeletePipeline(true)}
        onViewChange={setCurrentView}
        currentView={currentView}
        userName={profile?.full_name || undefined}
        onSignOut={signOut}
      />

      {/* Board Type Toggle */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Visualizar:</span>
        <Button
          variant={boardType === 'relationship' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBoardType('relationship')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Relacionamento
        </Button>
        <Button
          variant={boardType === 'stage' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBoardType('stage')}
          className="gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Estágios de Venda
        </Button>
      </div>

      <main className="flex-1 overflow-hidden">
        {boardType === 'relationship' ? (
          <RelationshipBoard
            contactClasses={contactClasses}
            contactsByClass={contactsByClass}
            unclassifiedContacts={unclassifiedContacts}
            onMoveContact={moveContact}
            onContactClick={handleContactClick}
            onAddClass={() => setShowCreateClass(true)}
            onEditClass={handleEditClass}
            onDeleteClass={deleteContactClass}
          />
        ) : stagePipeline ? (
          <StageBoard
            pipeline={stagePipeline}
            onMoveConversation={moveConversation}
            onConversationClick={(conv) => {
              const contact = contacts.find((c) => c.id === conv.contact_id);
              if (contact) handleContactClick(contact);
            }}
            onAddStage={() => setShowCreateStage(true)}
            onEditStage={handleEditStage}
            onDeleteStage={handleDeleteStage}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Nenhum pipeline selecionado</p>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreatePipelineDialog
        open={showCreatePipeline}
        onOpenChange={setShowCreatePipeline}
        onSubmit={async (name, description) => {
          await createPipeline(name, description);
        }}
      />

      <CreateStageDialog
        open={showCreateStage || showCreateClass}
        onOpenChange={(open) => {
          setShowCreateStage(open);
          setShowCreateClass(open);
        }}
        onSubmit={async (name, color) => {
          if (showCreateClass) {
            await createContactClass(name, color);
          } else if (activePipeline) {
            await createStage(activePipeline.id, name, color);
          }
        }}
      />

      <CreateCardDialog
        open={showCreateCard}
        onOpenChange={setShowCreateCard}
        contacts={contacts}
        onSubmit={async (contactId, title, description) => {
          if (selectedStageId) {
            await createCard(selectedStageId, contactId, title, description);
          }
        }}
        onCreateContact={() => {
          setShowCreateCard(false);
          setShowCreateContact(true);
        }}
      />

      <CreateContactDialog
        open={showCreateContact}
        onOpenChange={setShowCreateContact}
        onSubmit={async (contact) => {
          await createContact(contact as any);
          setShowCreateContact(false);
          setShowCreateCard(true);
        }}
      />

      <AlertDialog open={showDeletePipeline} onOpenChange={setShowDeletePipeline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (activePipeline) {
                  await deletePipeline(activePipeline.id);
                }
              }}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteStage} onOpenChange={setShowDeleteStage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Estágio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (stageToDelete) {
                  await deleteStage(stageToDelete);
                  setStageToDelete(null);
                }
              }}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Stage Dialog */}
      <Dialog open={showEditStage} onOpenChange={setShowEditStage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estágio</DialogTitle>
            <DialogDescription>Altere o nome e cor do estágio</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Nome</Label>
              <Input
                id="stage-name"
                value={editStageName}
                onChange={(e) => setEditStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-color">Cor</Label>
              <Input
                id="stage-color"
                type="color"
                value={editStageColor}
                onChange={(e) => setEditStageColor(e.target.value)}
                className="h-10 w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditStage(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (editStageId) {
                  const { error } = await supabase
                    .from('stages')
                    .update({ name: editStageName, color: editStageColor })
                    .eq('id', editStageId);
                  if (!error) {
                    setShowEditStage(false);
                    // Refetch stages without reload
                    if (stagePipeline?.id) {
                      await fetchPipelineWithConversations(stagePipeline.id);
                    }
                    toast.success('Estágio atualizado!');
                  } else {
                    toast.error('Erro ao atualizar estágio');
                  }
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={showEditClass} onOpenChange={setShowEditClass}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Classe</DialogTitle>
            <DialogDescription>Altere o nome e cor da classe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class-name">Nome</Label>
              <Input
                id="class-name"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-color">Cor</Label>
              <Input
                id="class-color"
                type="color"
                value={editClassColor}
                onChange={(e) => setEditClassColor(e.target.value)}
                className="h-10 w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditClass(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (editClassId) {
                  const success = await updateContactClass(editClassId, { 
                    name: editClassName, 
                    color: editClassColor 
                  });
                  if (success) {
                    setShowEditClass(false);
                    toast.success('Classe atualizada!');
                  }
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Details Dialog */}
      <Dialog open={showContactDetails} onOpenChange={setShowContactDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Contato</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{selectedContact.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Telefone</Label>
                <p className="font-medium">{selectedContact.phone || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{selectedContact.email || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Tags</Label>
                <p className="font-medium">
                  {selectedContact.tags?.length > 0
                    ? selectedContact.tags.join(', ')
                    : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Notas</Label>
                <p className="font-medium">{selectedContact.notes || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Classe</Label>
                <p className="font-medium">
                  {contactClasses.find((c) => c.id === selectedContact.contact_class_id)?.name || 'Sem classificação'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowContactDetails(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
