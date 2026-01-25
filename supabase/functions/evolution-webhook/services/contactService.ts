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
  // Em grupos sem participant phone, criar placeholder
  if (isGroup && !senderPhone) {
    // Usar prefixo "lid:" para identificar contatos sem phone
    const placeholderPhone = `lid:${senderJid.replace(/@.*$/, '')}`;
    
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
  
  // DM ou grupo com phone válido
  if (!senderPhone) {
    // Para DMs sem phone (só LID), criar placeholder também
    const placeholderPhone = `lid:${senderJid.replace(/@.*$/, '')}`;
    
    console.log('[Edge:evolution-webhook] resolveContact: DM without phone', { 
      senderJid, 
      placeholderPhone 
    });
    
    return await upsertContact(supabase, workspaceId, placeholderPhone, pushName, avatarUrl);
  }
  
  return await upsertContact(supabase, workspaceId, senderPhone, pushName, avatarUrl);
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
