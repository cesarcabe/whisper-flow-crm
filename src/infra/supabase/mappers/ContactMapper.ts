import { Tables } from '@/integrations/supabase/types';
import { Contact, ContactProps, ContactStatus } from '@/core/domain/entities/Contact';
import { Phone } from '@/core/domain/value-objects/Phone';

type ContactRow = Tables<'contacts'>;

/**
 * Mapper para converter entre Contact (domain) e contacts (database)
 */
export class ContactMapper {
  /**
   * Converte uma row do banco para entidade de domínio
   */
  static toDomain(row: ContactRow): Contact {
    const phone = Phone.create(row.phone);
    
    if (!phone) {
      throw new Error(`Invalid phone number for contact ${row.id}: ${row.phone}`);
    }

    const props: ContactProps = {
      id: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      phone,
      email: row.email,
      avatarUrl: row.avatar_url,
      status: (row.status as ContactStatus) || 'active',
      notes: row.notes,
      contactClassId: row.contact_class_id,
      groupClassId: row.group_class_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Contact.create(props);
  }

  /**
   * Converte uma entidade de domínio para formato de inserção no banco
   */
  static toInsert(contact: Contact, userId: string): Omit<ContactRow, 'id' | 'created_at' | 'updated_at' | 'tags'> {
    return {
      workspace_id: contact.workspaceId,
      user_id: userId,
      name: contact.name,
      phone: contact.phone.getValue(),
      email: contact.email,
      avatar_url: contact.avatarUrl,
      status: contact.status,
      notes: contact.notes,
      contact_class_id: contact.contactClassId,
      group_class_id: contact.groupClassId,
      pipeline_id: null,
      is_real: true,
      is_visible: true,
      source_type: null,
      raw_jid: null,
    };
  }

  /**
   * Converte uma entidade de domínio para formato de atualização no banco
   */
  static toUpdate(contact: Contact): Partial<ContactRow> {
    return {
      name: contact.name,
      phone: contact.phone.getValue(),
      email: contact.email,
      avatar_url: contact.avatarUrl,
      status: contact.status,
      notes: contact.notes,
      contact_class_id: contact.contactClassId,
      group_class_id: contact.groupClassId,
    };
  }

  /**
   * Converte múltiplas rows para entidades de domínio
   */
  static toDomainList(rows: ContactRow[]): Contact[] {
    return rows.map(row => ContactMapper.toDomain(row));
  }
}
