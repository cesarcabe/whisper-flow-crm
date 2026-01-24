import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MediaTypeResult {
  type: string;
  text: string;
  needsDownload: boolean;
}

export interface StoredMediaResult {
  url: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
}

export function detectMediaType(data: Record<string, unknown>): MediaTypeResult {
  const message = data?.message as Record<string, unknown> | undefined;
  
  if (message?.audioMessage) {
    return { type: "audio", text: "🎤 Áudio", needsDownload: true };
  }
  if (message?.imageMessage) {
    const caption = (message.imageMessage as Record<string, unknown>)?.caption as string | undefined;
    return { type: "image", text: caption || "📷 Imagem", needsDownload: true };
  }
  if (message?.videoMessage) {
    const caption = (message.videoMessage as Record<string, unknown>)?.caption as string | undefined;
    return { type: "video", text: caption || "🎥 Vídeo", needsDownload: true };
  }
  if (message?.documentMessage) {
    const fileName = (message.documentMessage as Record<string, unknown>)?.fileName as string | undefined;
    return { type: "document", text: fileName || "📎 Documento", needsDownload: true };
  }
  if (message?.stickerMessage) {
    return { type: "sticker", text: "🎨 Sticker", needsDownload: true };
  }
  if (message?.pttMessage) {
    return { type: "audio", text: "🎤 Áudio", needsDownload: true };
  }
  
  return { type: "text", text: "", needsDownload: false };
}

export async function downloadAndStoreMedia(
  supabase: SupabaseClient,
  evolutionBaseUrl: string | null,
  evolutionApiKey: string | null,
  instanceName: string,
  messageKey: Record<string, unknown>,
  mediaType: string,
  workspaceId: string,
): Promise<StoredMediaResult | null> {
  if (!evolutionBaseUrl || !evolutionApiKey) {
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia skipped - missing config');
    return null;
  }

  try {
    const url = `${evolutionBaseUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia', { 
      instanceName, 
      messageKey: messageKey?.id,
      mediaType 
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        message: { key: messageKey },
        convertToMp4: false,
      }),
    });

    if (!response.ok) {
      console.log('[Edge:evolution-webhook] downloadAndStoreMedia api_failed', { 
        status: response.status 
      });
      return null;
    }

    const result = await response.json();
    const base64Data = result?.base64 ?? result?.data ?? null;
    const mimeType = result?.mimetype ?? result?.mimeType ?? 'application/octet-stream';

    if (!base64Data) {
      console.log('[Edge:evolution-webhook] downloadAndStoreMedia no_base64');
      return null;
    }

    let ext = 'bin';
    if (mediaType === 'audio') ext = 'ogg';
    else if (mediaType === 'image') ext = 'jpg';
    else if (mediaType === 'video') ext = 'mp4';
    else if (mediaType === 'document') ext = 'pdf';
    else if (mediaType === 'sticker') ext = 'webp';

    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const fileName = `${workspaceId}/${mediaType}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    console.log('[Edge:evolution-webhook] uploadToStorage', { 
      fileName, 
      size: binaryData.length 
    });

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, binaryData, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.log('[Edge:evolution-webhook] storage_upload_error', { error: uploadError.message });
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(fileName);

    console.log('[Edge:evolution-webhook] storage_upload_success', { 
      url: publicUrlData.publicUrl 
    });

    return {
      url: publicUrlData.publicUrl,
      mimeType,
      sizeBytes: binaryData.length,
      path: fileName,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[Edge:evolution-webhook] downloadAndStoreMedia error', { error: errorMessage });
    return null;
  }
}
