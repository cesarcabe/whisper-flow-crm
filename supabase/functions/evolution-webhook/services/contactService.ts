import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeString } from "../utils/extract.ts";
import { isValidPhoneDigits } from "../utils/jidParser.ts";
import { persistAvatar } from "./avatarService.ts";

/**
 * Busca foto de perfil do contato via Evolution API
 */
export async function fetchProfilePicture(
  evolutionBaseUrl: string | null,
  evolutionApiKey: string | null,
  instanceName: string,
  phone: string,
): Promise<string | null> {
  if (!evolutionBaseUrl || !evolutionApiKey) {
    console.log('[Edge:evolution-webhook] fetchProfilePicture skipped - missing config');
    return null;
  }

  try {
    const url = `${evolutionBaseUrl}/chat/fetchProfilePictureUrl/${instanceName}`;
    console.log('[Edge:evolution-webhook] fetchProfilePicture', { instanceName, phone });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({ number: phone }),
    });

    if (!response.ok) {
      console.log('[Edge:evolution-webhook] fetchProfilePicture failed', { 
        status: response.status, 
        statusText: response.statusText 
      });
      return null;
    }

    const result = await response.json();
    const avatarUrl = safeString(result?.profilePictureUrl ?? result?.url ?? result?.picture ?? null);
    
    console.log('[Edge:evolution-webhook] fetchProfilePicture result', { 
      hasAvatar: !!avatarUrl 
    });
    
    return avatarUrl;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[Edge:evolution-webhook] fetchProfilePicture error', { error: errorMessage });
    return null;
  }
}

/**
 * Determina se um phone é válido para criar contato "real" visível
 */
export function isRealContactPhone(phone: string | null): boolean {
  if (!phone) return false;
  // Ignora placeholders
  if (phone.startsWith('lid:') || phone.startsWith('group:')) return false;
  return isValidPhoneDigits(phone);
}

/**
 * Resolve ou cria contato baseado no sender.
 * 
 * Regras:
 * - Grupo sem PN válido do participant: placeholder invisível (is_real=false, is_visible=false)
 * - DM sem PN válido (só LID): placeholder invisível
 * - DM/Grupo com PN válido: contato real visível + merge de placeholder se existir
 */
export async function resolveContact(
  supabase: SupabaseClient,
  workspaceId: string,
  senderPhone: string | null,
  senderJid: string,
  pushName: string | null,
  avatarUrl: string | null,
  isGroup: boolean,
): Promise<string> {
  // Extrair lid_id do senderJid para uso em placeholders
  const jidId = senderJid.replace(/@.*$/, '');
  const placeholderPhone = `lid:${jidId}`;
  const hasValidPhone = isRealContactPhone(senderPhone);
  
  // Persistir avatar no Supabase Storage (se disponível e for contato real)
  let persistedAvatarUrl = avatarUrl;
  if (hasValidPhone && avatarUrl && senderPhone) {
    persistedAvatarUrl = await persistAvatar(supabase, workspaceId, senderPhone, avatarUrl);
  }
  
  // CASO 1: Grupo sem phone válido do participant - placeholder invisível
  if (isGroup && !hasValidPhone) {
    console.log('[Edge:evolution-webhook] resolveContact: group placeholder (invisible)', { 
      senderJid, 
      placeholderPhone 
    });
    
    return await upsertPlaceholderContact(supabase, workspaceId, placeholderPhone, pushName, 'group', senderJid);
  }
  
  // CASO 2: DM sem phone válido (só LID) - placeholder invisível
  if (!isGroup && !hasValidPhone) {
    console.log('[Edge:evolution-webhook] resolveContact: dm_lid_placeholder_created (invisible)', { 
      senderJid, 
      placeholderPhone 
    });
    
    return await upsertPlaceholderContact(supabase, workspaceId, placeholderPhone, pushName, 'dm', senderJid);
  }
  
  // CASO 3: DM ou grupo com phone válido (PN real) - contato visível
  // Primeiro, criar/atualizar o contato real
  const sourceType = isGroup ? 'group' : 'dm';
  const realContactId = await upsertRealContact(
    supabase, 
    workspaceId, 
    senderPhone!, 
    pushName, 
    persistedAvatarUrl, 
    sourceType,
    senderJid
  );
  
  // Se senderJid é LID, tentar merge com placeholder existente
  if (senderJid.includes('@lid')) {
    await mergeLidPlaceholder(supabase, workspaceId, realContactId, placeholderPhone);
  }
  
  return realContactId;
}

/**
 * Cria ou atualiza contato placeholder (invisível no CRM)
 */
async function upsertPlaceholderContact(
  supabase: SupabaseClient,
  workspaceId: string,
  placeholderPhone: string,
  pushName: string | null,
  sourceType: 'dm' | 'group',
  rawJid: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("phone", placeholderPhone)
    .maybeSingle();
  
  if (existing) {
    // Atualizar nome se melhor disponível
    if (pushName && (existing.name === placeholderPhone || existing.name === 'Contato' || existing.name === 'Participante')) {
      await supabase
        .from("contacts")
        .update({ name: pushName })
        .eq("id", existing.id);
    }
    return existing.id;
  }
  
  // Buscar user_id do workspace
  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();
  
  const contactName = pushName || (sourceType === 'group' ? 'Participante' : 'Contato');
  
  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      phone: placeholderPhone,
      name: contactName,
      user_id: member?.user_id || workspaceId,
      is_real: false,
      is_visible: false,
      source_type: sourceType,
      raw_jid: rawJid,
    })
    .select("id")
    .single();
  
  if (error) {
    // Pode ser conflict - tentar buscar
    if (error.message?.toLowerCase().includes('unique') || 
        error.message?.toLowerCase().includes('duplicate')) {
      const { data: retry } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("phone", placeholderPhone)
        .maybeSingle();
      
      if (retry) return retry.id;
    }
    throw new Error("Failed to create placeholder contact: " + error.message);
  }
  
  return contact.id;
}

/**
 * Cria ou atualiza contato real (visível no CRM)
 */
async function upsertRealContact(
  supabase: SupabaseClient,
  workspaceId: string,
  phone: string,
  pushName: string | null,
  avatarUrl: string | null,
  sourceType: 'dm' | 'group',
  rawJid: string,
): Promise<string> {
  console.log('[Edge:evolution-webhook] upsertRealContact', { 
    phone, 
    pushName, 
    hasAvatar: !!avatarUrl,
    sourceType
  });

  const { data: existing } = await supabase
    .from("contacts")
    .select("id, name, avatar_url, is_real, is_visible")
    .eq("workspace_id", workspaceId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, unknown> = {};
    
    // Sempre garantir que é real e visível
    if (!existing.is_real) updates.is_real = true;
    if (!existing.is_visible) updates.is_visible = true;
    
    // Atualizar nome se melhor disponível
    const shouldUpdateName = pushName && 
      (existing.name === phone || existing.name === null || existing.name === '' || 
       existing.name.startsWith('lid:') || existing.name === 'Contato');
    if (shouldUpdateName) updates.name = pushName;
    
    // Atualizar avatar se não tiver
    if (avatarUrl && !existing.avatar_url) updates.avatar_url = avatarUrl;
    
    if (Object.keys(updates).length > 0) {
      console.log('[Edge:evolution-webhook] updateRealContact', { 
        contactId: existing.id, 
        updates 
      });
      
      await supabase
        .from("contacts")
        .update(updates)
        .eq("id", existing.id);
    }
    
    return existing.id as string;
  }

  // Criar novo contato real
  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  const contactName = pushName || phone;
  
  console.log('[Edge:evolution-webhook] createRealContact', { 
    phone, 
    name: contactName, 
    hasAvatar: !!avatarUrl,
    sourceType
  });

  const { data: c, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      phone,
      name: contactName,
      avatar_url: avatarUrl,
      user_id: member?.user_id || workspaceId,
      is_real: true,
      is_visible: true,
      source_type: sourceType,
      raw_jid: rawJid,
    })
    .select("id")
    .single();

  if (error) {
    // Handle conflict - contact may have been created concurrently
    if (error.message?.toLowerCase().includes('unique') || 
        error.message?.toLowerCase().includes('duplicate')) {
      const { data: retry } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("phone", phone)
        .maybeSingle();
      
      if (retry) return retry.id as string;
    }
    throw new Error("Failed to create contact: " + error.message);
  }
  
  return c.id as string;
}

/**
 * Faz merge de um contato placeholder LID para o contato real PN.
 * Move todas as conversas e cards do placeholder para o contato real.
 */
async function mergeLidPlaceholder(
  supabase: SupabaseClient,
  workspaceId: string,
  realContactId: string,
  placeholderPhone: string,
): Promise<void> {
  // Buscar placeholder contact
  const { data: placeholder } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("phone", placeholderPhone)
    .maybeSingle();
  
  if (!placeholder || placeholder.id === realContactId) {
    // Não existe placeholder ou é o mesmo contato
    return;
  }
  
  console.log('[Edge:evolution-webhook] dm_lid_placeholder_merged', { 
    placeholderId: placeholder.id, 
    realContactId,
    placeholderPhone 
  });
  
  // 1) Migrar todas as conversas do placeholder para o contato real
  const { error: convError } = await supabase
    .from("conversations")
    .update({ contact_id: realContactId })
    .eq("workspace_id", workspaceId)
    .eq("contact_id", placeholder.id);
  
  if (convError) {
    console.log('[Edge:evolution-webhook] merge_conversations_error', { 
      error: convError.message 
    });
  } else {
    // Count migrated separately
    const { count } = await supabase
      .from("conversations")
      .select("id", { count: 'exact', head: true })
      .eq("workspace_id", workspaceId)
      .eq("contact_id", realContactId);
    console.log('[Edge:evolution-webhook] merge_conversations_migrated', { 
      count 
    });
  }
  
  // 2) Migrar cards se existirem
  await supabase
    .from("cards")
    .update({ contact_id: realContactId })
    .eq("workspace_id", workspaceId)
    .eq("contact_id", placeholder.id);
  
  // 3) Verificar se placeholder ainda tem referências
  const { data: remainingConvs } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", placeholder.id)
    .limit(1);
  
  const { data: remainingCards } = await supabase
    .from("cards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", placeholder.id)
    .limit(1);
  
  // 4) Se não tem mais referências, deletar placeholder
  if ((!remainingConvs || remainingConvs.length === 0) && 
      (!remainingCards || remainingCards.length === 0)) {
    const { error: deleteError } = await supabase
      .from("contacts")
      .delete()
      .eq("id", placeholder.id)
      .eq("workspace_id", workspaceId);
    
    if (deleteError) {
      console.log('[Edge:evolution-webhook] delete_placeholder_error', { 
        error: deleteError.message 
      });
    } else {
      console.log('[Edge:evolution-webhook] placeholder_deleted', { 
        placeholderId: placeholder.id 
      });
    }
  }
}

/**
 * Upsert contato por phone (legacy - mantido para compatibilidade)
 * @deprecated Use upsertRealContact or upsertPlaceholderContact
 */
export async function upsertContact(
  supabase: SupabaseClient,
  workspaceId: string,
  phone: string, 
  pushName: string | null = null,
  avatarUrl: string | null = null,
): Promise<string> {
  // Determinar se é real ou placeholder
  if (isRealContactPhone(phone)) {
    return await upsertRealContact(supabase, workspaceId, phone, pushName, avatarUrl, 'dm', phone + '@s.whatsapp.net');
  } else {
    return await upsertPlaceholderContact(supabase, workspaceId, phone, pushName, 'dm', phone);
  }
}
