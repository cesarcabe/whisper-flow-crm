import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeString } from "../utils/extract.ts";

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
 * Resolve ou cria contato baseado no sender.
 * 
 * Para grupos sem participant phone válido, cria contato placeholder.
 * Para DMs ou grupos com phone válido, usa upsertContact.
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
  
  // Em grupos sem participant phone, criar placeholder
  if (isGroup && !senderPhone) {
    console.log('[Edge:evolution-webhook] resolveContact: group placeholder', { 
      senderJid, 
      placeholderPhone 
    });
    
    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("phone", placeholderPhone)
      .maybeSingle();
    
    if (existing) {
      // Atualizar nome se melhor disponível
      if (pushName && existing.name === placeholderPhone) {
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
    
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        workspace_id: workspaceId,
        phone: placeholderPhone,
        name: pushName || 'Participante',
        user_id: member?.user_id || workspaceId,
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
  
  // DM sem phone (só LID) - criar placeholder também
  if (!senderPhone) {
    console.log('[Edge:evolution-webhook] dm_lid_placeholder_created', { 
      senderJid, 
      placeholderPhone 
    });
    
    return await upsertContact(supabase, workspaceId, placeholderPhone, pushName, avatarUrl);
  }
  
  // DM ou grupo com phone válido (PN real)
  // Primeiro, criar/atualizar o contato real
  const realContactId = await upsertContact(supabase, workspaceId, senderPhone, pushName, avatarUrl);
  
  // Verificar se senderJid é LID - se for, tentar merge com placeholder
  if (senderJid.includes('@lid')) {
    await mergeLidPlaceholder(supabase, workspaceId, realContactId, placeholderPhone);
  }
  
  return realContactId;
}

/**
 * Faz merge de um contato placeholder LID para o contato real PN.
 * Move todas as conversas do placeholder para o contato real.
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
 * Upsert contato por phone
 */
export async function upsertContact(
  supabase: SupabaseClient,
  workspaceId: string,
  phone: string, 
  pushName: string | null = null,
  avatarUrl: string | null = null,
): Promise<string> {
  console.log('[Edge:evolution-webhook] upsertContact', { 
    phone, 
    pushName, 
    hasAvatar: !!avatarUrl 
  });

  const { data: existing } = await supabase
    .from("contacts")
    .select("id, name, avatar_url")
    .eq("workspace_id", workspaceId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const shouldUpdateName = pushName && 
      (existing.name === phone || existing.name === null || existing.name === '' || existing.name.startsWith('lid:'));
    
    const shouldUpdateAvatar = avatarUrl && !existing.avatar_url;
    
    if (shouldUpdateName || shouldUpdateAvatar) {
      const updates: Record<string, unknown> = {};
      if (shouldUpdateName) updates.name = pushName;
      if (shouldUpdateAvatar) updates.avatar_url = avatarUrl;
      
      console.log('[Edge:evolution-webhook] updateContact', { 
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

  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  const contactName = pushName || phone;
  
  console.log('[Edge:evolution-webhook] createContact', { 
    phone, 
    name: contactName, 
    hasAvatar: !!avatarUrl 
  });

  const { data: c, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      phone,
      name: contactName,
      avatar_url: avatarUrl,
      user_id: member?.user_id || workspaceId,
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
