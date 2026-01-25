import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardViewType } from '@/types/ui';

// ===== Types =====
export interface KanbanDialogState {
  showCreatePipeline: boolean;
  showCreateStage: boolean;
  showCreateCard: boolean;
  showCreateContact: boolean;
  showCreateClass: boolean;
  showDeletePipeline: boolean;
  showDeleteStage: boolean;
  showEditStage: boolean;
  showEditClass: boolean;
  showContactDetails: boolean;
  showEditContact: boolean;
}

export interface EditStageState {
  id: string | null;
  name: string;
  color: string;
}

export interface EditClassState {
  id: string | null;
  name: string;
  color: string;
}

export interface SelectedItemsState {
  stageId: string | null;
  stageToDelete: string | null;
  contact: any | null;
}

export type KanbanView = 'kanban' | 'chat';

// ===== Initial States =====
const initialDialogState: KanbanDialogState = {
  showCreatePipeline: false,
  showCreateStage: false,
  showCreateCard: false,
  showCreateContact: false,
  showCreateClass: false,
  showDeletePipeline: false,
  showDeleteStage: false,
  showEditStage: false,
  showEditClass: false,
  showContactDetails: false,
  showEditContact: false,
};

const initialEditStageState: EditStageState = {
  id: null,
  name: '',
  color: '#6B7280',
};

const initialEditClassState: EditClassState = {
  id: null,
  name: '',
  color: '#6B7280',
};

const initialSelectedItemsState: SelectedItemsState = {
  stageId: null,
  stageToDelete: null,
  contact: null,
};

// ===== Hook =====
export function useKanbanState() {
  const [searchParams] = useSearchParams();
  
  // Check if URL has whatsapp param to auto-switch to chat view
  const whatsappFromUrl = searchParams.get('whatsapp');
  
  // View state
  const [currentView, setCurrentView] = useState<KanbanView>(whatsappFromUrl ? 'chat' : 'kanban');
  const [boardType, setBoardType] = useState<BoardViewType>('relationship');
  
  // Dialog states (consolidated)
  const [dialogs, setDialogs] = useState<KanbanDialogState>(initialDialogState);
  
  // Edit states
  const [editStage, setEditStage] = useState<EditStageState>(initialEditStageState);
  const [editClass, setEditClass] = useState<EditClassState>(initialEditClassState);
  
  // Selected items
  const [selectedItems, setSelectedItems] = useState<SelectedItemsState>(initialSelectedItemsState);

  // Auto-switch to chat view when whatsapp param is present
  useEffect(() => {
    if (whatsappFromUrl) {
      setCurrentView('chat');
    }
  }, [whatsappFromUrl]);

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

  // ===== Dialog Controls =====
  const openDialog = useCallback((dialogName: keyof KanbanDialogState) => {
    setDialogs(prev => ({ ...prev, [dialogName]: true }));
  }, []);

  const closeDialog = useCallback((dialogName: keyof KanbanDialogState) => {
    setDialogs(prev => ({ ...prev, [dialogName]: false }));
  }, []);

  const setDialogOpen = useCallback((dialogName: keyof KanbanDialogState, open: boolean) => {
    setDialogs(prev => ({ ...prev, [dialogName]: open }));
  }, []);

  // ===== Handlers =====
  const handleAddCard = useCallback((stageId: string) => {
    setSelectedItems(prev => ({ ...prev, stageId }));
    openDialog('showCreateCard');
  }, [openDialog]);

  const handleEditStage = useCallback((stageId: string, stages: { id: string; name: string; color?: string | null }[]) => {
    const stage = stages.find((s) => s.id === stageId);
    if (stage) {
      setEditStage({
        id: stageId,
        name: stage.name,
        color: stage.color || '#6B7280',
      });
      openDialog('showEditStage');
    }
  }, [openDialog]);

  const handleEditClass = useCallback((classId: string, classes: { id: string; name: string; color?: string | null }[]) => {
    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      setEditClass({
        id: classId,
        name: cls.name,
        color: cls.color || '#6B7280',
      });
      openDialog('showEditClass');
    }
  }, [openDialog]);

  const handleContactClick = useCallback((contact: any) => {
    setSelectedItems(prev => ({ ...prev, contact }));
    openDialog('showContactDetails');
  }, [openDialog]);

  const handleEditContact = useCallback((contact: any) => {
    setSelectedItems(prev => ({ ...prev, contact }));
    openDialog('showEditContact');
  }, [openDialog]);

  const handleDeleteStage = useCallback((stageId: string) => {
    setSelectedItems(prev => ({ ...prev, stageToDelete: stageId }));
    openDialog('showDeleteStage');
  }, [openDialog]);

  const handleGroupClick = useCallback((group: { contact_id: string; id: string }) => {
    localStorage.setItem('crm:selectedContactId', group.contact_id);
    localStorage.setItem('crm:selectedConversationId', group.id);
    setCurrentView('chat');
  }, []);

  // ===== Reset Functions =====
  const resetEditStage = useCallback(() => {
    setEditStage(initialEditStageState);
  }, []);

  const resetEditClass = useCallback(() => {
    setEditClass(initialEditClassState);
  }, []);

  const resetSelectedItems = useCallback(() => {
    setSelectedItems(initialSelectedItemsState);
  }, []);

  const clearStageToDelete = useCallback(() => {
    setSelectedItems(prev => ({ ...prev, stageToDelete: null }));
  }, []);

  // ===== Edit State Setters =====
  const setEditStageName = useCallback((name: string) => {
    setEditStage(prev => ({ ...prev, name }));
  }, []);

  const setEditStageColor = useCallback((color: string) => {
    setEditStage(prev => ({ ...prev, color }));
  }, []);

  const setEditClassName = useCallback((name: string) => {
    setEditClass(prev => ({ ...prev, name }));
  }, []);

  const setEditClassColor = useCallback((color: string) => {
    setEditClass(prev => ({ ...prev, color }));
  }, []);

  return {
    // View state
    currentView,
    setCurrentView,
    boardType,
    setBoardType,
    
    // Dialog state & controls
    dialogs,
    openDialog,
    closeDialog,
    setDialogOpen,
    
    // Edit state
    editStage,
    editClass,
    setEditStageName,
    setEditStageColor,
    setEditClassName,
    setEditClassColor,
    resetEditStage,
    resetEditClass,
    
    // Selected items
    selectedItems,
    clearStageToDelete,
    resetSelectedItems,
    
    // Handlers
    handlers: {
      handleAddCard,
      handleEditStage,
      handleEditClass,
      handleContactClick,
      handleEditContact,
      handleDeleteStage,
      handleGroupClick,
    },
  };
}
