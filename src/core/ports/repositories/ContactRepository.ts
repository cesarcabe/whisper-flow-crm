import { Contact } from '@/core/domain/entities/Contact';

/**
 * Port/Interface para acesso a dados de Contact.
 * Segue o padrão Repository da Clean Architecture.
 */
export interface ContactRepository {
  /**
   * Busca um contato por ID
   */
  findById(id: string): Promise<Contact | null>;

  /**
   * Busca todos os contatos de um workspace
   */
  findByWorkspaceId(workspaceId: string): Promise<Contact[]>;

  /**
   * Busca contatos por classe de contato
   */
  findByContactClassId(workspaceId: string, contactClassId: string): Promise<Contact[]>;

  /**
   * Busca contatos por classe de grupo
   */
  findByGroupClassId(workspaceId: string, groupClassId: string): Promise<Contact[]>;

  /**
   * Busca contatos sem classificação
   */
  findUnclassified(workspaceId: string): Promise<Contact[]>;

  /**
   * Busca contato por telefone
   */
  findByPhone(workspaceId: string, phone: string): Promise<Contact | null>;

  /**
   * Busca contatos por termo de pesquisa (nome ou telefone)
   */
  search(workspaceId: string, query: string): Promise<Contact[]>;

  /**
   * Salva um novo contato
   */
  save(contact: Contact, userId: string): Promise<Contact>;

  /**
   * Atualiza um contato existente
   */
  update(contact: Contact): Promise<Contact>;

  /**
   * Remove um contato
   */
  delete(id: string): Promise<void>;

  /**
   * Verifica se um contato existe
   */
  exists(id: string): Promise<boolean>;

  /**
   * Conta total de contatos em um workspace
   */
  count(workspaceId: string): Promise<number>;

  /**
   * Atualiza a classe de contato
   */
  updateContactClass(id: string, contactClassId: string | null): Promise<void>;

  /**
   * Atualiza a classe de grupo
   */
  updateGroupClass(id: string, groupClassId: string | null): Promise<void>;
}
