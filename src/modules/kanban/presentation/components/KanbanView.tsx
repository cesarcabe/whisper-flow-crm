import { toast } from 'sonner';
import { usePipelines } from '@/hooks/usePipelines';
import { useContacts } from '@/hooks/useContacts';
import { useContactClasses } from '@/hooks/useContactClasses';
import { useConversationStages } from '@/hooks/useConversationStages';
import { useGroupClasses } from '@/hooks/useGroupClasses';
import { useAuth } from '@/contexts/AuthContext';
import { useKanbanState } from '@/hooks/useKanbanState';
import { PipelineHeader } from './PipelineHeader';
import { BoardTypeSelector } from './BoardTypeSelector';
import { ChatView } from './views/ChatView';
import { KanbanMainView } from './views/KanbanMainView';
import { CreatePipelineDialog } from './dialogs/CreatePipelineDialog';
import { CreateStageDialog } from './dialogs/CreateStageDialog';
import { CreateCardDialog } from './dialogs/CreateCardDialog';
import { CreateContactDialog } from './dialogs/CreateContactDialog';
import { DeleteConfirmDialog } from './dialogs/DeleteConfirmDialog';
import { EditStageDialog } from './dialogs/EditStageDialog';
import { EditClassDialog } from './dialogs/EditClassDialog';
import { ContactDetailsDialog } from './dialogs/ContactDetailsDialog';
import { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type Contact = Tables<'contacts'>;

export function KanbanView() {
  const { profile, signOut } = useAuth();
  
  // Centralized state management
  const {
    currentView,
    setCurrentView,
    boardType,
    setBoardType,
    dialogs,
    openDialog,
    closeDialog,
    setDialogOpen,
    editStage,
    editClass,
    setEditStageName,
    setEditStageColor,
    setEditClassName,
    setEditClassColor,
    selectedItems,
    clearStageToDelete,
    handlers,
  } = useKanbanState();
  
  // Data hooks
  const {
    pipelines,
    activePipeline,
    loading: pipelinesLoading,
    setActivePipeline,
    createPipeline,
    deletePipeline,
    createStage,
    updateStage,
    deleteStage,
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

  const {
    groupClasses,
    groupsByClass,
    unclassifiedGroups,
    loading: groupsLoading,
    moveGroup,
  } = useGroupClasses();

  // Loading state
  const loading = pipelinesLoading || classesLoading || stagesLoading || groupsLoading;

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

  // Chat View
  if (currentView === 'chat') {
    return (
      <ChatView
        pipelines={pipelines}
        activePipeline={activePipeline}
        onSelectPipeline={setActivePipeline}
        onCreatePipeline={() => openDialog('showCreatePipeline')}
        onDeletePipeline={() => openDialog('showDeletePipeline')}
        onViewChange={setCurrentView}
        currentView={currentView}
        userName={profile?.full_name || undefined}
        onSignOut={signOut}
      />
    );
  }

  // Kanban View
  return (
    <div className="h-screen flex flex-col bg-background">
      <PipelineHeader
        pipelines={pipelines}
        activePipeline={activePipeline}
        onSelectPipeline={setActivePipeline}
        onCreatePipeline={() => openDialog('showCreatePipeline')}
        onEditPipeline={() => {}}
        onDeletePipeline={() => openDialog('showDeletePipeline')}
        onViewChange={setCurrentView}
        currentView={currentView}
        userName={profile?.full_name || undefined}
        onSignOut={signOut}
      />

      <BoardTypeSelector boardType={boardType} onBoardTypeChange={setBoardType} />

      <main className="flex-1 overflow-hidden">
        <KanbanMainView
          boardType={boardType}
          // Relationship
          contactClasses={contactClasses}
          contactsByClass={contactsByClass}
          unclassifiedContacts={unclassifiedContacts}
          onMoveContact={moveContact}
          onContactClick={handlers.handleContactClick}
          onAddClass={() => openDialog('showCreateClass')}
          onEditClass={(classId) => handlers.handleEditClass(classId, contactClasses)}
          onDeleteClass={deleteContactClass}
          // Groups
          groupClasses={groupClasses}
          groupsByClass={groupsByClass}
          unclassifiedGroups={unclassifiedGroups}
          onMoveGroup={moveGroup}
          onGroupClick={handlers.handleGroupClick}
          // Stage
          stagePipeline={stagePipeline}
          onMoveConversation={moveConversation}
          onConversationClick={(conv) => {
            const contact = contacts.find((c) => c.id === conv.contact_id);
            if (contact) handlers.handleContactClick(contact);
          }}
          onAddStage={() => openDialog('showCreateStage')}
          onEditStage={(stageId) => handlers.handleEditStage(stageId, stagePipeline?.stages || [])}
          onDeleteStage={handlers.handleDeleteStage}
        />
      </main>

      {/* Dialogs */}
      <CreatePipelineDialog
        open={dialogs.showCreatePipeline}
        onOpenChange={(open) => setDialogOpen('showCreatePipeline', open)}
        onSubmit={async (name, description) => {
          await createPipeline(name, description);
        }}
      />

      <CreateStageDialog
        open={dialogs.showCreateStage || dialogs.showCreateClass}
        onOpenChange={(open) => {
          setDialogOpen('showCreateStage', open);
          setDialogOpen('showCreateClass', open);
        }}
        onSubmit={async (name, color) => {
          if (dialogs.showCreateClass) {
            await createContactClass(name, color);
          } else if (activePipeline) {
            await createStage(activePipeline.id, name, color);
          }
        }}
      />

      <CreateCardDialog
        open={dialogs.showCreateCard}
        onOpenChange={(open) => setDialogOpen('showCreateCard', open)}
        contacts={contacts as unknown as Contact[]}
        onSubmit={async (contactId, title, description) => {
          if (selectedItems.stageId) {
            await createCard(selectedItems.stageId, contactId, title, description);
          }
        }}
        onCreateContact={() => {
          closeDialog('showCreateCard');
          openDialog('showCreateContact');
        }}
      />

      <CreateContactDialog
        open={dialogs.showCreateContact}
        onOpenChange={(open) => setDialogOpen('showCreateContact', open)}
        onSubmit={async (contact) => {
          await createContact(contact as any);
          closeDialog('showCreateContact');
          openDialog('showCreateCard');
        }}
      />

      <DeleteConfirmDialog
        open={dialogs.showDeletePipeline}
        onOpenChange={(open) => setDialogOpen('showDeletePipeline', open)}
        title="Deletar Pipeline?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (activePipeline) {
            await deletePipeline(activePipeline.id);
          }
        }}
      />

      <DeleteConfirmDialog
        open={dialogs.showDeleteStage}
        onOpenChange={(open) => setDialogOpen('showDeleteStage', open)}
        title="Deletar Estágio?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (selectedItems.stageToDelete) {
            await deleteStage(selectedItems.stageToDelete);
            clearStageToDelete();
          }
        }}
      />

      <EditStageDialog
        open={dialogs.showEditStage}
        onOpenChange={(open) => setDialogOpen('showEditStage', open)}
        stageId={editStage.id}
        name={editStage.name}
        color={editStage.color}
        onNameChange={setEditStageName}
        onColorChange={setEditStageColor}
        onSave={async () => {
          if (editStage.id) {
            const success = await updateStage(editStage.id, {
              name: editStage.name,
              color: editStage.color,
            });
            if (success) {
              closeDialog('showEditStage');
              if (stagePipeline?.id) {
                await fetchPipelineWithConversations(stagePipeline.id);
              }
              toast.success('Estágio atualizado!');
            } else {
              toast.error('Erro ao atualizar estágio');
            }
          }
        }}
      />

      <EditClassDialog
        open={dialogs.showEditClass}
        onOpenChange={(open) => setDialogOpen('showEditClass', open)}
        classId={editClass.id}
        name={editClass.name}
        color={editClass.color}
        onNameChange={setEditClassName}
        onColorChange={setEditClassColor}
        onSave={async () => {
          if (editClass.id) {
            const success = await updateContactClass(editClass.id, {
              name: editClass.name,
              color: editClass.color,
            });
            if (success) {
              closeDialog('showEditClass');
              toast.success('Classe atualizada!');
            }
          }
        }}
      />

      <ContactDetailsDialog
        open={dialogs.showContactDetails}
        onOpenChange={(open) => setDialogOpen('showContactDetails', open)}
        contact={selectedItems.contact}
        contactClasses={contactClasses}
      />
    </div>
  );
}
