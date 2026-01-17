import { 
  ChatEngineMessageDTO, 
  ChatEngineConversationDTO,
  ChatEngineAttachmentDTO,
  SendTextMessagePayload,
  SendImagePayload,
  SendAudioPayload,
  MoveToStagePayload,
  ChatEngineListResponse
} from './types';
import { CHATENGINE_ENDPOINTS, AUTH_ERROR_CODES } from './config';

/**
 * HTTP Client for ChatEngine API
 * Handles all communication with the external ChatEngine backend
 * 
 * Authentication: JWT Bearer token (HS256)
 * Required JWT claims: workspace_id
 * 
 * Base URL: https://chatengine.newflow.me
 */
export class ChatEngineClient {
  private baseUrl: string;
  private jwtToken: string;

  constructor(baseUrl: string, jwtToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.jwtToken = jwtToken;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.jwtToken}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      // Handle specific auth errors
      if (response.status === AUTH_ERROR_CODES.UNAUTHORIZED) {
        throw new Error('ChatEngine: Token ausente, inválido ou assinatura incorreta (401)');
      }
      if (response.status === AUTH_ERROR_CODES.FORBIDDEN) {
        throw new Error('ChatEngine: Token válido, mas sem workspace_id (403)');
      }
      if (response.status === AUTH_ERROR_CODES.SERVER_ERROR) {
        throw new Error('ChatEngine: Servidor sem JWT_SECRET configurado (500)');
      }
      
      throw new Error(`ChatEngine API error: ${errorBody.message || response.statusText}`);
    }

    return response.json();
  }

  // ==================== Conversations ====================

  /**
   * GET /api/chat/conversations
   * Lista conversas do workspace (workspace_id vem do JWT)
   */
  async getConversations(
    whatsappNumberId?: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEngineListResponse<ChatEngineConversationDTO>> {
    const params = new URLSearchParams();
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString();
    const endpoint = queryString 
      ? `${CHATENGINE_ENDPOINTS.CONVERSATIONS}?${queryString}`
      : CHATENGINE_ENDPOINTS.CONVERSATIONS;

    const response = await this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(endpoint);
    
    // Validate response structure
    if (!response || !response.data) {
      console.warn('[ChatEngineClient] getConversations received invalid response:', response);
      return { data: [] };
    }
    
    return response;
  }

  async getConversation(conversationId: string): Promise<ChatEngineConversationDTO | null> {
    try {
      return await this.request<ChatEngineConversationDTO>(
        `${CHATENGINE_ENDPOINTS.CONVERSATIONS}/${conversationId}`
      );
    } catch {
      return null;
    }
  }

  async getConversationsByStage(stageId: string): Promise<ChatEngineConversationDTO[]> {
    const params = new URLSearchParams({ stage_id: stageId });
    const response = await this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}?${params.toString()}`
    );
    return response?.data || [];
  }

  async getConversationsWithoutStage(
    whatsappNumberId?: string
  ): Promise<ChatEngineConversationDTO[]> {
    const params = new URLSearchParams({ 
      stage_id: 'null' // Special value to indicate no stage
    });
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);

    const response = await this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}?${params.toString()}`
    );
    return response?.data || [];
  }

  async moveToStage(
    conversationId: string, 
    payload: MoveToStagePayload
  ): Promise<void> {
    await this.request<void>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}/${conversationId}/stage`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.request<void>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}/${conversationId}/read`,
      { method: 'POST' }
    );
  }

  // ==================== Messages ====================

  /**
   * GET /api/chat/messages?conversation_id=xxx
   * Lista mensagens de uma conversa
   */
  async getMessages(
    conversationId: string, 
    limit?: number, 
    before?: string
  ): Promise<ChatEngineMessageDTO[]> {
    const params = new URLSearchParams({ conversation_id: conversationId });
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);

    const response = await this.request<ChatEngineListResponse<ChatEngineMessageDTO>>(
      `${CHATENGINE_ENDPOINTS.MESSAGES}?${params.toString()}`
    );
    return response?.data || [];
  }

  async getMessage(messageId: string): Promise<ChatEngineMessageDTO | null> {
    try {
      return await this.request<ChatEngineMessageDTO>(
        `${CHATENGINE_ENDPOINTS.MESSAGES}/${messageId}`
      );
    } catch {
      return null;
    }
  }

  async getMessageByExternalId(externalId: string): Promise<ChatEngineMessageDTO | null> {
    try {
      const params = new URLSearchParams({ external_id: externalId });
      const response = await this.request<ChatEngineListResponse<ChatEngineMessageDTO>>(
        `${CHATENGINE_ENDPOINTS.MESSAGES}?${params.toString()}`
      );
      return response?.data?.[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * GET /api/chat/messages/{messageId}/context
   * Obtém contexto de uma mensagem (mensagens anteriores/posteriores)
   */
  async getMessageContext(messageId: string): Promise<ChatEngineMessageDTO[]> {
    const response = await this.request<ChatEngineListResponse<ChatEngineMessageDTO>>(
      CHATENGINE_ENDPOINTS.MESSAGE_CONTEXT(messageId)
    );
    return response?.data || [];
  }

  /**
   * POST /api/chat/messages
   * Envia mensagem de texto
   */
  async sendTextMessage(payload: SendTextMessagePayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      CHATENGINE_ENDPOINTS.MESSAGES,
      {
        method: 'POST',
        body: JSON.stringify({
          conversationId: payload.conversationId,
          type: 'text',
          content: payload.content,
          replyToId: payload.replyToId,
        }),
      }
    );
  }

  /**
   * POST /api/chat/attachments
   * Envia imagem como anexo
   */
  async sendImage(payload: SendImagePayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      CHATENGINE_ENDPOINTS.ATTACHMENTS,
      {
        method: 'POST',
        body: JSON.stringify({
          conversationId: payload.conversationId,
          type: 'image',
          contentBase64: payload.imageBase64,
          mimeType: payload.mimeType,
          caption: payload.caption,
          replyToId: payload.replyToId,
        }),
      }
    );
  }

  /**
   * POST /api/chat/attachments
   * Envia áudio como anexo
   */
  async sendAudio(payload: SendAudioPayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      CHATENGINE_ENDPOINTS.ATTACHMENTS,
      {
        method: 'POST',
        body: JSON.stringify({
          conversationId: payload.conversationId,
          type: 'audio',
          contentBase64: payload.audioBase64,
          mimeType: payload.mimeType,
        }),
      }
    );
  }

  /**
   * POST /api/chat/messages/{messageId}/forward
   * Encaminha mensagem para outra conversa
   */
  async forwardMessage(
    messageId: string, 
    targetConversationId: string
  ): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      `${CHATENGINE_ENDPOINTS.MESSAGES}/${messageId}/forward`,
      {
        method: 'POST',
        body: JSON.stringify({ target_conversation_id: targetConversationId }),
      }
    );
  }

  // ==================== Media & Attachments ====================

  /**
   * POST /api/chat/attachments (FormData)
   * Upload file attachment using FormData (recommended approach)
   * 
   * @param file - File to upload
   * @param conversationId - Target conversation
   * @param caption - Optional caption for the attachment
   * @returns Attachment metadata including the attachment_id
   */
  async uploadAttachment(
    file: File,
    conversationId: string,
    caption?: string
  ): Promise<ChatEngineAttachmentDTO> {
    const url = `${this.baseUrl}${CHATENGINE_ENDPOINTS.ATTACHMENTS}`;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId);
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // Note: Don't set Content-Type for FormData - browser sets it with boundary
        'Authorization': `Bearer ${this.jwtToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      if (response.status === AUTH_ERROR_CODES.UNAUTHORIZED) {
        throw new Error('ChatEngine: Token ausente, inválido ou assinatura incorreta (401)');
      }
      if (response.status === AUTH_ERROR_CODES.FORBIDDEN) {
        throw new Error('ChatEngine: Token válido, mas sem workspace_id (403)');
      }
      
      throw new Error(`ChatEngine upload error: ${errorBody.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * POST /api/chat/messages
   * Send message with attachment (after uploading via uploadAttachment)
   * 
   * @param conversationId - Target conversation
   * @param attachmentId - ID from uploadAttachment response
   * @param caption - Optional caption
   * @param replyToId - Optional message to reply to
   */
  async sendAttachmentMessage(
    conversationId: string,
    attachmentId: string,
    caption?: string,
    replyToId?: string
  ): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      CHATENGINE_ENDPOINTS.MESSAGES,
      {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          attachment_id: attachmentId,
          body: caption,
          reply_to_id: replyToId,
        }),
      }
    );
  }

  /**
   * GET /api/chat/media
   * Proxy para obter mídia do WhatsApp/Evolution
   * 
   * @param providerMessageId - ID da mensagem no provider (Evolution)
   * @param attachmentId - ID do anexo (opcional)
   */
  async getMediaUrl(
    providerMessageId: string, 
    attachmentId?: string
  ): Promise<string> {
    const params = new URLSearchParams({ 
      providerMessageId 
    });
    if (attachmentId) {
      params.append('attachmentId', attachmentId);
    }
    
    const response = await this.request<{ url: string }>(
      `${CHATENGINE_ENDPOINTS.MEDIA}?${params.toString()}`
    );
    return response.url;
  }

  /**
   * GET /api/chat/media (URL-based fallback)
   * Para mídia com URL direta
   */
  async getMediaUrlByUrl(mediaUrl: string): Promise<string> {
    const params = new URLSearchParams({ url: mediaUrl });
    const response = await this.request<{ url: string }>(
      `${CHATENGINE_ENDPOINTS.MEDIA}?${params.toString()}`
    );
    return response.url;
  }

  // ==================== Utilities ====================

  async countMessagesByConversation(conversationId: string): Promise<number> {
    const params = new URLSearchParams({ 
      conversation_id: conversationId,
      count_only: 'true'
    });
    const response = await this.request<{ count: number }>(
      `${CHATENGINE_ENDPOINTS.MESSAGES}?${params.toString()}`
    );
    return response.count;
  }

  async countConversationsByStage(stageId: string): Promise<number> {
    const params = new URLSearchParams({ 
      stage_id: stageId,
      count_only: 'true'
    });
    const response = await this.request<{ count: number }>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}?${params.toString()}`
    );
    return response.count;
  }

  async countUnreadConversations(whatsappNumberId?: string): Promise<number> {
    const params = new URLSearchParams({ 
      unread_only: 'true',
      count_only: 'true'
    });
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);

    const response = await this.request<{ count: number }>(
      `${CHATENGINE_ENDPOINTS.CONVERSATIONS}?${params.toString()}`
    );
    return response.count;
  }
}
