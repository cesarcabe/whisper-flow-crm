import { useState, useEffect } from 'react';
import { useConversation } from '../contexts/ConversationContext';

/**
 * Result of media URL fetch
 */
interface MediaUrlResult {
  url: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Cache for media URLs to avoid redundant fetches
 * Key: providerMessageId:attachmentId or just url
 */
const mediaUrlCache = new Map<string, string>();

/**
 * useMediaUrl - Hook for fetching media URLs via ChatEngine proxy
 * 
 * ChatEngine provides a media proxy that:
 * - Handles WhatsApp/Evolution media URLs that may expire
 * - Provides authenticated access to stored media
 * - Caches and optimizes media delivery
 * 
 * @param providerMessageId - The message ID from the provider (e.g., Evolution)
 * @param attachmentId - Optional attachment ID for multi-media messages
 * @param fallbackUrl - Fallback URL to use if ChatEngine is not enabled or fails
 */
export function useMediaUrl(
  providerMessageId: string | null,
  attachmentId?: string,
  fallbackUrl?: string | null
): MediaUrlResult {
  const { service, isChatEngineEnabled } = useConversation();
  const [url, setUrl] = useState<string | null>(fallbackUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If no providerMessageId, just use fallback
    if (!providerMessageId) {
      setUrl(fallbackUrl ?? null);
      return;
    }

    // If ChatEngine is not enabled, use fallback URL directly
    if (!isChatEngineEnabled) {
      setUrl(fallbackUrl ?? null);
      return;
    }

    // Check cache first
    const cacheKey = `${providerMessageId}:${attachmentId ?? 'default'}`;
    const cached = mediaUrlCache.get(cacheKey);
    if (cached) {
      setUrl(cached);
      return;
    }

    // Fetch from ChatEngine proxy
    const fetchMediaUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[useMediaUrl] Fetching media URL', { providerMessageId, attachmentId });
        
        const result = await service.getMediaUrl(providerMessageId, attachmentId);
        if (result.success) {
          mediaUrlCache.set(cacheKey, result.data);
          setUrl(result.data);
        } else {
          // Fallback to original URL on error
          setUrl(fallbackUrl ?? null);
        }
      } catch (err: any) {
        console.error('[useMediaUrl] Error fetching media URL:', err);
        setError(err.message || 'Erro ao carregar mídia');
        // Fall back to original URL on error
        setUrl(fallbackUrl ?? null);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaUrl();
  }, [providerMessageId, attachmentId, fallbackUrl, isChatEngineEnabled, service]);

  return { url, loading, error };
}

/**
 * useMediaUrlDirect - Direct URL fetching without provider message ID
 * 
 * Use this when you have a direct media URL (e.g., from storage)
 * and want to pass it through the ChatEngine proxy
 */
export function useMediaUrlDirect(
  mediaUrl: string | null
): MediaUrlResult {
  const { service, isChatEngineEnabled } = useConversation();
  const [url, setUrl] = useState<string | null>(mediaUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaUrl) {
      setUrl(null);
      return;
    }

    // If ChatEngine not enabled, use direct URL
    if (!isChatEngineEnabled) {
      setUrl(mediaUrl);
      return;
    }

    // Check cache
    const cached = mediaUrlCache.get(mediaUrl);
    if (cached) {
      setUrl(cached);
      return;
    }

    // Fetch proxied URL from ChatEngine
    const fetchProxiedUrl = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await service.getMediaUrlByUrl(mediaUrl);
        if (result.success) {
          mediaUrlCache.set(mediaUrl, result.data);
          setUrl(result.data);
        } else {
          setUrl(mediaUrl); // Fallback to original
        }
      } catch {
        setUrl(mediaUrl); // Fallback to original on error
      } finally {
        setLoading(false);
      }
    };

    fetchProxiedUrl();
  }, [mediaUrl, isChatEngineEnabled, service]);

  return { url, loading, error };
}

/**
 * Utility function to clear media URL cache
 */
export function clearMediaUrlCache(): void {
  mediaUrlCache.clear();
}

/**
 * Utility function to preload media URLs
 */
export function preloadMediaUrl(
  providerMessageId: string,
  url: string,
  attachmentId?: string
): void {
  const cacheKey = `${providerMessageId}:${attachmentId ?? 'default'}`;
  mediaUrlCache.set(cacheKey, url);
}
