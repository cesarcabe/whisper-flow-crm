import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function upsertConversation(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string, 
  whatsappNumberId: string, 
  remoteJid: string | null,
): Promise<string> {
  const isGroup = remoteJid ? remoteJid.endsWith('@g.us') : false;
  
  let existing: { id: string } | null = null;
  
  if (remoteJid) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("whatsapp_number_id", whatsappNumberId)
      .eq("remote_jid", remoteJid)
      .maybeSingle();
    existing = data;
  }
  
  if (!existing) {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("contact_id", contactId)
      .eq("whatsapp_number_id", whatsappNumberId)
      .maybeSingle();
    existing = data;
  }

  if (existing) {
    if (remoteJid) {
      await supabase
        .from("conversations")
        .update({ remote_jid: remoteJid, is_group: isGroup })
        .eq("id", existing.id)
        .is("remote_jid", null);
    }
    return existing.id;
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      whatsapp_number_id: whatsappNumberId,
      remote_jid: remoteJid,
      is_group: isGroup,
    })
    .select("id")
    .single();

  if (error) throw new Error("Failed to create conversation: " + error.message);
  return conv.id;
}
