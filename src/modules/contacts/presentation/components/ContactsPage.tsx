import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Contact } from '@/core/domain/entities/Contact';
import { useContactsModule } from '../hooks/useContactsModule';
import { ContactsFilters } from './ContactsFilters';
import { ContactsList } from './ContactsList';
import { ContactDetailsSheet } from './ContactDetailsSheet';
import { EditContactSheet } from './EditContactSheet';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { CreateContactDialog } from '@/components/kanban/dialogs/CreateContactDialog';
import { DeleteConfirmDialog } from '@/components/kanban/dialogs/DeleteConfirmDialog';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';

export function ContactsPage() {
  const navigate = useNavigate();
  const {
    contacts,
    contactClasses,
    groupClasses,
    loading,
    filters,
    hasActiveFilters,
    updateFilter,
    clearFilters,
    totalCount,
    filteredCount,
    deleteContact,
    refetch,
  } = useContactsModule();

  const { createContact, updateContact } = useContacts();

  // Dialog states
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const handleViewDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailsOpen(true);
  };

  const handleOpenChat = (contact: Contact) => {
    // Navigate to conversations with contact filter
    navigate(`/conversations?contact=${contact.id}`);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setEditOpen(true);
  };

  const handleSaveEdit = async (contactId: string, updates: {
    name: string;
    email: string | null;
    notes: string | null;
    status: 'active' | 'inactive' | 'blocked';
    contact_class_id: string | null;
    group_class_id: string | null;
  }): Promise<boolean> => {
    const success = await updateContact(contactId, updates);
    if (success) {
      refetch();
    }
    return success;
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    
    const success = await deleteContact(contactToDelete.id);
    if (success) {
      setDeleteOpen(false);
      setContactToDelete(null);
    }
  };

  const handleCreateContact = async (data: {
    name: string;
    phone: string;
    email: string | null;
    avatar_url: string | null;
    notes: string | null;
    status: 'active' | 'inactive' | 'blocked';
    tags: string[];
  }) => {
    try {
      await createContact({
        name: data.name,
        phone: data.phone,
        email: data.email,
        avatar_url: data.avatar_url,
        notes: data.notes,
        status: data.status,
      });
      refetch();
    } catch (err) {
      console.error('[ContactsPage] Error creating contact:', err);
      toast.error('Erro ao criar contato');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Contatos</h1>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? `${filteredCount} de ${totalCount} contatos`
                  : `${totalCount} contatos`}
              </p>
            </div>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Contato
          </Button>
        </div>

        {/* Filters */}
        <ContactsFilters
          filters={filters}
          contactClasses={contactClasses}
          groupClasses={groupClasses}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={updateFilter}
          onClearFilters={clearFilters}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-6">
        <ContactsList
          contacts={contacts}
          contactClasses={contactClasses}
          loading={loading}
          onViewDetails={handleViewDetails}
          onOpenChat={handleOpenChat}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Dialogs */}
      <ContactDetailsSheet
        contact={selectedContact}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contactClasses={contactClasses}
        groupClasses={groupClasses}
        onOpenChat={handleOpenChat}
        onEdit={handleEdit}
      />

      <EditContactSheet
        contact={selectedContact}
        open={editOpen}
        onOpenChange={setEditOpen}
        contactClasses={contactClasses}
        groupClasses={groupClasses}
        onSave={handleSaveEdit}
      />

      <CreateContactDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreateContact}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir Contato"
        description={`Tem certeza que deseja excluir o contato "${contactToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
