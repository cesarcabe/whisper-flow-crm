import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { usePipelines } from '@/hooks/usePipelines';
import { useContacts } from '@/hooks/useContacts';
import { useContactClasses } from '@/hooks/useContactClasses';
import { useConversationStages } from '@/hooks/useConversationStages';
import { useGroupClasses } from '@/hooks/useGroupClasses';
import { useKanbanState } from '@/hooks/useKanbanState';
import { LeadsToolbar } from './LeadsToolbar';
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
import { EditContactSheet } from '@/modules/kanban/presentation/components/dialogs/EditContactSheet';
import { Tables } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type Contact = Tables<'contacts'>;

export function KanbanView() {
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
  
  const { contacts, createContact, updateContact, fetchContacts } = useContacts();
  
  const {
    contactClasses,
    contactsByClass,
    unclassifiedContacts,
    loading: classesLoading,
    moveContact,
    createContactClass,
    updateContactClass,
    deleteContactClass,
  } = useContactClasses(activePipeline?.id);

  const {
    activePipeline: stagePipeline,
    loading: stagesLoading,
    moveConversation,
    fetchPipelineWithConversations,
    setActivePipeline: setActiveStagePipeline,
    reorderStages,
  } = useConversationStages();

  const {
    groupClasses,
    groupsByClass,
    unclassifiedGroups,
    loading: groupsLoading,
    moveGroup,
  } = useGroupClasses(activePipeline?.id);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter contacts by search query
  const filterBySearch = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = item.name || item.contact?.name || '';
      const phone = item.phone || item.contact?.phone || '';
      return name.toLowerCase().includes(query) || phone.toLowerCase().includes(query);
    });
  };

  // Filtered data for boards
  const filteredContactsByClass = useMemo(() => {
    if (!searchQuery.trim()) return contactsByClass;
    const result: Record<string, any[]> = {};
    for (const [classId, contacts] of Object.entries(contactsByClass)) {
      result[classId] = filterBySearch(contacts);
    }
    return result;
  }, [contactsByClass, searchQuery]);

  const filteredUnclassifiedContacts = useMemo(() => {
    return filterBySearch(unclassifiedContacts);
  }, [unclassifiedContacts, searchQuery]);

  const filteredGroupsByClass = useMemo(() => {
    if (!searchQuery.trim()) return groupsByClass;
    const result: Record<string, any[]> = {};
    for (const [classId, groups] of Object.entries(groupsByClass)) {
      result[classId] = filterBySearch(groups);
    }
    return result;
  }, [groupsByClass, searchQuery]);

  const filteredUnclassifiedGroups = useMemo(() => {
    return filterBySearch(unclassifiedGroups);
  }, [unclassifiedGroups, searchQuery]);

  const filteredStagePipeline = useMemo(() => {
    if (!stagePipeline || !searchQuery.trim()) return stagePipeline;
    return {
      ...stagePipeline,
      stages: stagePipeline.stages.map(stage => ({
        ...stage,
        conversations: filterBySearch(stage.conversations),
      })),
      leadInbox: {
        ...stagePipeline.leadInbox,
        conversations: filterBySearch(stagePipeline.leadInbox.conversations),
      },
    };
  }, [stagePipeline, searchQuery]);

  // Loading state
  const loading = pipelinesLoading || classesLoading || stagesLoading || groupsLoading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Chat View
  if (currentView === 'chat') {
    return <ChatView />;
  }

  // Kanban View
  return (
    <div className="h-full flex flex-col bg-background">
      <LeadsToolbar
        boardType={boardType}
        onBoardTypeChange={setBoardType}
        pipelines={pipelines}
        activePipeline={activePipeline}
        onSelectPipeline={(pipeline) => {
          setActivePipeline(pipeline);
          setActiveStagePipeline(pipeline);
        }}
        onCreatePipeline={() => openDialog('showCreatePipeline')}
        onDeletePipeline={() => openDialog('showDeletePipeline')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 overflow-hidden">
        <KanbanMainView
          boardType={boardType}
          // Relationship
          contactClasses={contactClasses}
          contactsByClass={filteredContactsByClass}
          unclassifiedContacts={filteredUnclassifiedContacts}
          onMoveContact={moveContact}
          onContactClick={handlers.handleContactClick}
          onAddClass={() => openDialog('showCreateClass')}
          onEditClass={(classId) => handlers.handleEditClass(classId, contactClasses)}
          onDeleteClass={deleteContactClass}
          // Groups
          groupClasses={groupClasses}
          groupsByClass={filteredGroupsByClass}
          unclassifiedGroups={filteredUnclassifiedGroups}
          onMoveGroup={moveGroup}
          onGroupClick={handlers.handleGroupClick}
          // Stage
          stagePipeline={filteredStagePipeline}
          onMoveConversation={moveConversation}
          onConversationClick={(conv) => {
            const contact = contacts.find((c) => c.id === conv.contact_id);
            if (contact) handlers.handleContactClick(contact);
          }}
          onAddStage={() => openDialog('showCreateStage')}
          onEditStage={(stageId) => handlers.handleEditStage(stageId, stagePipeline?.stages || [])}
          onDeleteStage={handlers.handleDeleteStage}
          onReorderStages={reorderStages}
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
            await fetchPipelineWithConversations(activePipeline.id);
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
          if (selectedItems.stageToDelete && activePipeline) {
            await deleteStage(selectedItems.stageToDelete);
            clearStageToDelete();
            await fetchPipelineWithConversations(activePipeline.id);
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
        onEdit={() => {
          closeDialog('showContactDetails');
          handlers.handleEditContact(selectedItems.contact);
        }}
      />

      <EditContactSheet
        open={dialogs.showEditContact}
        onOpenChange={(open) => setDialogOpen('showEditContact', open)}
        contact={selectedItems.contact}
        contactClasses={contactClasses}
        groupClasses={groupClasses}
        onSave={async (contactId, updates) => {
          const success = await updateContact(contactId, updates);
          if (success) {
            await fetchContacts();
          }
          return success;
        }}
      />
    </div>
  );
}
