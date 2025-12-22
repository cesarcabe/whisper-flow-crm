import { useState } from 'react';
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
    deleteContactClass,
  } = useContactClasses();

  const {
    activePipeline: stagePipeline,
    loading: stagesLoading,
    moveConversation,
  } = useConversationStages();

  const [currentView, setCurrentView] = useState<'kanban' | 'chat'>('kanban');
  const [boardType, setBoardType] = useState<BoardViewType>('relationship');
  
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

  const handleAddCard = (stageId: string) => {
    setSelectedStageId(stageId);
    setShowCreateCard(true);
  };

  const handleEditStage = (stageId: string) => {
    console.log('[CRM Kanban] Edit stage:', stageId);
  };

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId);
    setShowDeleteStage(true);
  };

  const handleCardClick = (card: Card) => {
    console.log('[CRM Kanban] Card clicked:', card);
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
      <div className="h-screen flex flex-col">
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
        <CRMLayout />
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
            onContactClick={(contact) => console.log('Contact clicked:', contact)}
            onAddClass={() => setShowCreateClass(true)}
            onEditClass={(id) => console.log('Edit class:', id)}
            onDeleteClass={deleteContactClass}
          />
        ) : stagePipeline ? (
          <StageBoard
            pipeline={stagePipeline}
            onMoveConversation={moveConversation}
            onConversationClick={(conv) => console.log('Conversation clicked:', conv)}
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
    </div>
  );
}
