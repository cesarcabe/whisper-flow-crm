import { supabase } from '@/integrations/supabase/client';
import { emitChatDebug } from '@/lib/chat-debug';

export type MediaCategory = 'image' | 'video' | 'audio';

export function getMediaCategory(file: File): MediaCategory | null {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return null;
}

export async function getMediaDurationMs(file: Blob): Promise<number | null> {
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    return null;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const element = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const durationMs = Number.isFinite(element.duration) ? Math.floor(element.duration * 1000) : null;
      resolve(durationMs);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    element.src = url;
  });
}

export async function createVideoThumbnail(file: File, maxWidth = 320): Promise<Blob | null> {
  if (!file.type.startsWith('video/')) return null;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      const ratio = video.videoWidth / video.videoHeight || 1;
      const width = Math.min(maxWidth, video.videoWidth || maxWidth);
      const height = Math.floor(width / ratio);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          resolve(blob || null);
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

export function buildMediaPath(input: {
  workspaceId: string;
  conversationId: string;
  clientMessageId: string;
  filename: string;
}): string {
  const safeName = input.filename.replace(/[^\w.\-]+/g, '_');
  return `workspace/${input.workspaceId}/conversations/${input.conversationId}/${input.clientMessageId}/${safeName}`;
}

export async function uploadMediaFile(input: {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
}): Promise<{ path: string }> {
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUploadUrl(input.path);

  if (error || !data?.signedUrl) {
    emitChatDebug('media:upload:error', { path: input.path, message: error?.message ?? 'signed upload url failed' });
    throw new Error(error?.message || 'Falha ao criar URL de upload');
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', data.signedUrl, true);
    xhr.setRequestHeader('Content-Type', input.file.type || 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && input.onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        input.onProgress(percent);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload falhou (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede no upload'));
    xhr.send(input.file);
  });

  return { path: data.path };
}

export async function getSignedUrl(input: {
  bucket: string;
  path: string;
  expiresIn?: number;
}): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.path, input.expiresIn ?? 3600);
  if (error || !data?.signedUrl) {
    emitChatDebug('signedUrl:error', { path: input.path, message: error?.message ?? 'signed url failed' });
    return null;
  }
  emitChatDebug('signedUrl:resolve', { path: input.path });
  return data.signedUrl;
}
