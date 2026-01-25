import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseJid, isPhoneNumber, isLid } from "../utils/jidParser.ts";

interface ConversationResult {
  conversationId: string;
  isNew: boolean;
}

/**
 * Resolve ou cria conversa baseado no JID.
 * Para DMs com PN+LID, garante aliases na tabela conversation_aliases.
 */
export async function resolveConversation(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string,
  whatsappNumberId: string,
  conversationJid: string,
  remoteJidAlt: string | null,
  isGroup: boolean = false,
): Promise<ConversationResult> {
  console.log('[Edge:evolution-webhook] resolveConversation', { 
    conversationJid, 
    remoteJidAlt, 
    isGroup 
  });
  
  // 1) Buscar por remote_jid exato
  let existing: { id: string } | null = null;
  
  const { data: byJid } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("whatsapp_number_id", whatsappNumberId)
    .eq("remote_jid", conversationJid)
    .maybeSingle();
  
  existing = byJid;
  
  // 2) Se não achou, buscar por alias (para QUALQUER tipo de JID, não só LID)
  if (!existing) {
    const { data: aliasData } = await supabase
      .from("conversation_aliases")
      .select("conversation_id")
      .eq("workspace_id", workspaceId)
      .eq("whatsapp_number_id", whatsappNumberId)
      .eq("alias_remote_jid", conversationJid)
      .maybeSingle();
    
    if (aliasData) {
      console.log('[Edge:evolution-webhook] resolveConversation: found via alias', { 
        conversationId: aliasData.conversation_id,
        aliasJid: conversationJid
      });
      existing = { id: aliasData.conversation_id };
    }
  }
  
  // 3) Se não achou e não é grupo, buscar por contact_id (fallback legado)
  if (!existing && !isGroup) {
    const { data: byContact } = await supabase
      .from("conversations")
      .select("id, remote_jid")
      .eq("workspace_id", workspaceId)
      .eq("contact_id", contactId)
      .eq("whatsapp_number_id", whatsappNumberId)
      .maybeSingle();
    
    if (byContact) {
      existing = { id: byContact.id };
      
      // Atualizar remote_jid se estava null
      if (!byContact.remote_jid) {
        console.log('[Edge:evolution-webhook] resolveConversation: updating null remote_jid', { 
          conversationId: byContact.id 
        });
        await supabase
          .from("conversations")
          .update({ remote_jid: conversationJid, is_group: isGroup })
          .eq("id", byContact.id);
      }
    }
  }
  
  // 4) Criar se não existe
  if (!existing) {
    console.log('[Edge:evolution-webhook] resolveConversation: creating new conversation');
    
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        whatsapp_number_id: whatsappNumberId,
        remote_jid: conversationJid,
        is_group: isGroup,
      })
      .select("id")
      .single();
    
    if (error) {
      // Pode ser conflict se criado concorrentemente - tentar buscar
      if (error.message?.toLowerCase().includes('unique') || 
          error.message?.toLowerCase().includes('duplicate')) {
        const { data: retry } = await supabase
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("whatsapp_number_id", whatsappNumberId)
          .eq("remote_jid", conversationJid)
          .maybeSingle();
        
        if (retry) {
          existing = { id: retry.id };
        } else {
          throw new Error("Failed to create conversation: " + error.message);
        }
      } else {
        throw new Error("Failed to create conversation: " + error.message);
      }
    } else {
      existing = { id: conv.id };
    }
    
    // Registrar alias primário
    await registerAlias(supabase, workspaceId, whatsappNumberId, existing.id, conversationJid, true);
    
    // Se tiver remoteJidAlt, registrar como alias secundário
    if (remoteJidAlt && remoteJidAlt !== conversationJid) {
      await registerAlias(supabase, workspaceId, whatsappNumberId, existing.id, remoteJidAlt, false);
    }
    
    return { conversationId: existing.id, isNew: true };
  }
  
  // 5) Garantir aliases para conversa existente
  await registerAlias(supabase, workspaceId, whatsappNumberId, existing.id, conversationJid, true);
  
  if (remoteJidAlt && remoteJidAlt !== conversationJid) {
    await registerAlias(supabase, workspaceId, whatsappNumberId, existing.id, remoteJidAlt, false);
  }
  
  return { conversationId: existing.id, isNew: false };
}

/**
 * Registra um alias para a conversa (ignora erros de duplicata)
 */
async function registerAlias(
  supabase: SupabaseClient,
  workspaceId: string,
  whatsappNumberId: string,
  conversationId: string,
  aliasJid: string,
  isPrimary: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("conversation_aliases")
    .upsert({
      workspace_id: workspaceId,
      whatsapp_number_id: whatsappNumberId,
      conversation_id: conversationId,
      alias_remote_jid: aliasJid,
      is_primary: isPrimary,
    }, { 
      onConflict: 'workspace_id,whatsapp_number_id,alias_remote_jid',
      ignoreDuplicates: true 
    });
  
  if (error && !error.message?.toLowerCase().includes('duplicate')) {
    console.log('[Edge:evolution-webhook] registerAlias: error', { 
      error: error.message, 
      aliasJid 
    });
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use resolveConversation instead
 */
export async function upsertConversation(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string, 
  whatsappNumberId: string, 
  remoteJid: string | null,
): Promise<string> {
  const isGroup = remoteJid ? remoteJid.endsWith('@g.us') : false;
  
  const result = await resolveConversation(
    supabase,
    workspaceId,
    contactId,
    whatsappNumberId,
    remoteJid || `contact:${contactId}`, // fallback for null jid
    null,
    isGroup,
  );
  
  return result.conversationId;
}
