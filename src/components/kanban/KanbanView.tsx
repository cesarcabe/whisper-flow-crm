import { useState } from 'react';
import { usePipelines } from '@/hooks/usePipelines';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/contexts/AuthContext';
import { PipelineHeader } from './PipelineHeader';
import { KanbanBoard } from './KanbanBoard';
import { CRMLayout } from '@/components/crm/CRMLayout';
import { CreatePipelineDialog } from './dialogs/CreatePipelineDialog';
import { CreateStageDialog } from './dialogs/CreateStageDialog';
import { CreateCardDialog } from './dialogs/CreateCardDialog';
import { CreateContactDialog } from './dialogs/CreateContactDialog';
import { Card } from '@/types/database';
import { Loader2 } from 'lucide-react';
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

  const [currentView, setCurrentView] = useState<'kanban' | 'chat'>('kanban');
  
  // Dialog states
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  const [showCreateStage, setShowCreateStage] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showDeletePipeline, setShowDeletePipeline] = useState(false);
  const [showDeleteStage, setShowDeleteStage] = useState(false);
  
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);

  const handleAddCard = (stageId: string) => {
    setSelectedStageId(stageId);
    setShowCreateCard(true);
  };

  const handleEditStage = (stageId: string) => {
    // TODO: Implement edit stage dialog
    console.log('[CRM Kanban] Edit stage:', stageId);
  };

  const handleDeleteStage = (stageId: string) => {
    setStageToDelete(stageId);
    setShowDeleteStage(true);
  };

  const handleCardClick = (card: Card) => {
    // TODO: Open card detail/conversation panel
    console.log('[CRM Kanban] Card clicked:', card);
  };

  if (pipelinesLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando pipelines...</p>
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

      <main className="flex-1 overflow-hidden">
        {activePipeline ? (
          <KanbanBoard
            pipeline={activePipeline}
            onMoveCard={moveCard}
            onCardClick={handleCardClick}
            onAddStage={() => setShowCreateStage(true)}
            onEditStage={handleEditStage}
            onDeleteStage={handleDeleteStage}
            onAddCard={handleAddCard}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Nenhum pipeline selecionado
              </p>
              <button
                onClick={() => setShowCreatePipeline(true)}
                className="text-primary hover:underline"
              >
                Criar novo pipeline
              </button>
            </div>
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
        open={showCreateStage}
        onOpenChange={setShowCreateStage}
        onSubmit={async (name, color) => {
          if (activePipeline) {
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

      {/* Delete Pipeline Confirmation */}
      <AlertDialog open={showDeletePipeline} onOpenChange={setShowDeletePipeline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os estágios e cards deste pipeline serão permanentemente deletados.
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

      {/* Delete Stage Confirmation */}
      <AlertDialog open={showDeleteStage} onOpenChange={setShowDeleteStage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Estágio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os cards neste estágio serão permanentemente deletados.
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
