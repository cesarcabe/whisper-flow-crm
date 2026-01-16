/**
 * ChatEngine Configuration
 * 
 * This file contains the configuration for the ChatEngine API client.
 * Authentication uses JWT Bearer tokens signed with HS256.
 */

export interface ChatEngineConfig {
  /** Base URL of the ChatEngine API (e.g., https://chatengine.newflow.me) */
  baseUrl: string;
  /** JWT token for authentication (must include workspace_id claim) */
  jwtToken: string;
}

/**
 * ChatEngine Base URL
 */
export const CHATENGINE_BASE_URL = 'https://chatengine.newflow.me';

/**
 * Default configuration (populated from environment variables or token service)
 */
export const DEFAULT_CHATENGINE_CONFIG: ChatEngineConfig = {
  baseUrl: import.meta.env.VITE_CHATENGINE_API_URL || CHATENGINE_BASE_URL,
  jwtToken: '', // Token is fetched dynamically via edge function
};

/**
 * Check if ChatEngine is configured (has base URL)
 * Note: Token is fetched dynamically, so we only check baseUrl
 */
export function isChatEngineConfigured(config: ChatEngineConfig = DEFAULT_CHATENGINE_CONFIG): boolean {
  return Boolean(config.baseUrl);
}

/**
 * Check if we have a valid token
 */
export function hasValidToken(config: ChatEngineConfig): boolean {
  return Boolean(config.baseUrl && config.jwtToken);
}

/**
 * ChatEngine API endpoints (based on confirmed routes)
 */
export const CHATENGINE_ENDPOINTS = {
  // Conversations
  CONVERSATIONS: '/api/chat/conversations',
  
  // Messages
  MESSAGES: '/api/chat/messages',
  MESSAGE_CONTEXT: (messageId: string) => `/api/chat/messages/${messageId}/context`,
  
  // Media/Attachments
  ATTACHMENTS: '/api/chat/attachments',
  MEDIA: '/api/chat/media',
  
  // Webhook (for reference - used by Evolution API)
  WEBHOOK: '/api/webhooks/whatsapp',
} as const;

/**
 * ChatEngine authentication error codes
 */
export const AUTH_ERROR_CODES = {
  UNAUTHORIZED: 401,    // Token ausente, inválido ou assinatura incorreta
  FORBIDDEN: 403,       // Token válido, mas sem workspace_id
  SERVER_ERROR: 500,    // Servidor sem CHATENGINE_JWT_SECRET configurado
} as const;
