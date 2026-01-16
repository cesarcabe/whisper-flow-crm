/**
 * ChatEngine JWT Generator
 * 
 * Generates JWT tokens for authenticating with the ChatEngine API.
 * Uses the jose library with HS256 algorithm.
 * 
 * The JWT is signed with VITE_CHATENGINE_JWT_SECRET which must match
 * the secret configured on the ChatEngine server.
 */

import { SignJWT } from 'jose';

/**
 * JWT Payload for ChatEngine authentication
 */
export interface ChatEngineJwtPayload {
  workspace_id: string;
  user_id: string;
}

/**
 * Get the JWT secret from environment variable
 */
function getJwtSecret(): Uint8Array {
  const secret = import.meta.env.VITE_CHATENGINE_JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      'VITE_CHATENGINE_JWT_SECRET is not configured. ' +
      'Please set it in your .env file.'
    );
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Generate a JWT token for ChatEngine API authentication
 * 
 * @param payload - The JWT payload containing workspace_id and user_id
 * @param expiresIn - Token expiration time (default: 1 hour)
 * @returns Promise<string> - The signed JWT token
 * 
 * @example
 * const token = await generateChatEngineJwt({
 *   workspace_id: 'workspace-123',
 *   user_id: 'user-456'
 * });
 * 
 * // Use in Authorization header:
 * // Authorization: Bearer <token>
 */
export async function generateChatEngineJwt(
  payload: ChatEngineJwtPayload,
  expiresIn: string = '1h'
): Promise<string> {
  const secret = getJwtSecret();
  
  const token = await new SignJWT({
    workspace_id: payload.workspace_id,
    user_id: payload.user_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
  
  console.log('[ChatEngine JWT] Token generated for workspace:', payload.workspace_id);
  
  return token;
}

/**
 * Check if ChatEngine JWT secret is configured
 */
export function isChatEngineJwtConfigured(): boolean {
  return Boolean(import.meta.env.VITE_CHATENGINE_JWT_SECRET);
}
