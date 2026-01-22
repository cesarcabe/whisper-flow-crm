import { useEffect, useState } from 'react';

type MediaUrlState = {
  url: string | null;
  isLoading: boolean;
  error: string | null;
};

const mediaUrlCache = new Map<string, string>();

export function useMediaUrl(sourceUrl: string | null): MediaUrlState {
  const [state, setState] = useState<MediaUrlState>({
    url: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!sourceUrl) {
      setState({ url: null, isLoading: false, error: null });
      return;
    }

    if (mediaUrlCache.has(sourceUrl)) {
      setState({ url: mediaUrlCache.get(sourceUrl) ?? sourceUrl, isLoading: false, error: null });
      return;
    }

    mediaUrlCache.set(sourceUrl, sourceUrl);
    setState({ url: sourceUrl, isLoading: false, error: null });
  }, [sourceUrl]);

  return state;
}

export function useMediaUrlDirect(sourceUrl: string | null): MediaUrlState {
  return useMediaUrl(sourceUrl);
}

export function clearMediaUrlCache(): void {
  mediaUrlCache.clear();
}

export async function preloadMediaUrl(sourceUrl: string): Promise<void> {
  mediaUrlCache.set(sourceUrl, sourceUrl);
}
