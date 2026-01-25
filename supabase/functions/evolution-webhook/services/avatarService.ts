import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

/**
 * Downloads an image from a URL and returns it as a Uint8Array
 */
async function downloadImage(url: string): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    console.log('[Edge:evolution-webhook] downloadImage: fetching', { url: url.substring(0, 100) + '...' });
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewFlowCRM/1.0)',
      },
    });

    if (!response.ok) {
      console.log('[Edge:evolution-webhook] downloadImage: failed', { 
        status: response.status,
        statusText: response.statusText 
      });
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    console.log('[Edge:evolution-webhook] downloadImage: success', { 
      size: data.length,
      contentType 
    });

    return { data, contentType };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[Edge:evolution-webhook] downloadImage: error', { error: errorMessage });
    return null;
  }
}

/**
 * Generates a unique storage path for the avatar
 */
function generateAvatarPath(workspaceId: string, contactPhone: string): string {
  // Clean phone number for file name
  const cleanPhone = contactPhone.replace(/[^0-9]/g, '');
  const timestamp = Date.now();
  return `avatars/${workspaceId}/${cleanPhone}_${timestamp}.jpg`;
}

/**
 * Downloads avatar from WhatsApp URL and uploads to Supabase Storage
 * Returns the permanent public URL or null if failed
 */
export async function persistAvatar(
  supabase: SupabaseClient,
  workspaceId: string,
  contactPhone: string,
  whatsappAvatarUrl: string | null,
): Promise<string | null> {
  if (!whatsappAvatarUrl) {
    return null;
  }

  // Skip if already a Supabase URL (already persisted)
  if (whatsappAvatarUrl.includes('supabase.co/storage')) {
    console.log('[Edge:evolution-webhook] persistAvatar: already persisted', { 
      url: whatsappAvatarUrl.substring(0, 60) + '...' 
    });
    return whatsappAvatarUrl;
  }

  try {
    // Download the image
    const imageData = await downloadImage(whatsappAvatarUrl);
    if (!imageData) {
      console.log('[Edge:evolution-webhook] persistAvatar: download failed');
      return null;
    }

    // Generate storage path
    const storagePath = generateAvatarPath(workspaceId, contactPhone);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, imageData.data, {
        contentType: imageData.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.log('[Edge:evolution-webhook] persistAvatar: upload error', { 
        error: uploadError.message 
      });
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath);

    const permanentUrl = publicUrlData?.publicUrl || null;

    console.log('[Edge:evolution-webhook] persistAvatar: success', { 
      storagePath,
      permanentUrl: permanentUrl?.substring(0, 60) + '...'
    });

    return permanentUrl;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[Edge:evolution-webhook] persistAvatar: error', { error: errorMessage });
    return null;
  }
}

/**
 * Checks if an avatar URL is expired (WhatsApp temporary URL)
 * and needs to be refreshed
 */
export function isAvatarExpired(avatarUrl: string | null): boolean {
  if (!avatarUrl) return false;
  
  // Supabase URLs don't expire
  if (avatarUrl.includes('supabase.co/storage')) {
    return false;
  }
  
  // WhatsApp URLs with tokens are considered potentially expired
  if (avatarUrl.includes('pps.whatsapp.net') || avatarUrl.includes('mmg.whatsapp.net')) {
    return true;
  }
  
  return false;
}
