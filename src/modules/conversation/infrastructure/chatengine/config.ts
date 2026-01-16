/**
 * ChatEngine Configuration
 * 
 * This file contains the configuration for the ChatEngine API client.
 * The actual values should be provided via environment variables or
 * injected through the ConversationProvider.
 */

export interface ChatEngineConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * Default configuration (can be overridden in ConversationProvider)
 * 
 * IMPORTANT: These are placeholders. Real values should come from:
 * - Environment variables (VITE_CHATENGINE_API_URL, VITE_CHATENGINE_API_KEY)
 * - Or passed directly to ConversationProvider
 */
export const DEFAULT_CHATENGINE_CONFIG: ChatEngineConfig = {
  // Will be populated when ChatEngine URL is provided
  baseUrl: import.meta.env.VITE_CHATENGINE_API_URL || '',
  apiKey: import.meta.env.VITE_CHATENGINE_API_KEY || '',
};

/**
 * Check if ChatEngine is configured
 */
export function isChatEngineConfigured(config: ChatEngineConfig = DEFAULT_CHATENGINE_CONFIG): boolean {
  return Boolean(config.baseUrl && config.apiKey);
}
