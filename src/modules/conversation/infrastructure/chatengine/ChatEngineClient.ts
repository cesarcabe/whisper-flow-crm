import { 
  ChatEngineMessageDTO, 
  ChatEngineConversationDTO,
  SendTextMessagePayload,
  SendImagePayload,
  SendAudioPayload,
  MoveToStagePayload,
  ChatEngineListResponse
} from './types';

/**
 * HTTP Client for ChatEngine API
 * Handles all communication with the external ChatEngine backend
 */
export class ChatEngineClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`ChatEngine API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // ==================== Conversations ====================

  async getConversations(
    workspaceId: string, 
    whatsappNumberId?: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEngineListResponse<ChatEngineConversationDTO>> {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    return this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(
      `/conversations?${params.toString()}`
    );
  }

  async getConversation(conversationId: string): Promise<ChatEngineConversationDTO | null> {
    try {
      return await this.request<ChatEngineConversationDTO>(
        `/conversations/${conversationId}`
      );
    } catch {
      return null;
    }
  }

  async getConversationsByStage(stageId: string): Promise<ChatEngineConversationDTO[]> {
    const response = await this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(
      `/conversations?stage_id=${stageId}`
    );
    return response.data;
  }

  async getConversationsWithoutStage(
    workspaceId: string, 
    whatsappNumberId?: string
  ): Promise<ChatEngineConversationDTO[]> {
    const params = new URLSearchParams({ 
      workspace_id: workspaceId,
      stage_id: 'null' // Special value to indicate no stage
    });
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);

    const response = await this.request<ChatEngineListResponse<ChatEngineConversationDTO>>(
      `/conversations?${params.toString()}`
    );
    return response.data;
  }

  async moveToStage(
    conversationId: string, 
    payload: MoveToStagePayload
  ): Promise<void> {
    await this.request<void>(
      `/conversations/${conversationId}/stage`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.request<void>(
      `/conversations/${conversationId}/read`,
      { method: 'POST' }
    );
  }

  // ==================== Messages ====================

  async getMessages(
    conversationId: string, 
    limit?: number, 
    before?: string
  ): Promise<ChatEngineMessageDTO[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);

    const response = await this.request<ChatEngineListResponse<ChatEngineMessageDTO>>(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );
    return response.data;
  }

  async getMessage(messageId: string): Promise<ChatEngineMessageDTO | null> {
    try {
      return await this.request<ChatEngineMessageDTO>(
        `/messages/${messageId}`
      );
    } catch {
      return null;
    }
  }

  async getMessageByExternalId(externalId: string): Promise<ChatEngineMessageDTO | null> {
    try {
      return await this.request<ChatEngineMessageDTO>(
        `/messages/external/${externalId}`
      );
    } catch {
      return null;
    }
  }

  async sendTextMessage(payload: SendTextMessagePayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      '/messages/text',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async sendImage(payload: SendImagePayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      '/messages/image',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async sendAudio(payload: SendAudioPayload): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      '/messages/audio',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async forwardMessage(
    messageId: string, 
    targetConversationId: string
  ): Promise<ChatEngineMessageDTO> {
    return this.request<ChatEngineMessageDTO>(
      `/messages/${messageId}/forward`,
      {
        method: 'POST',
        body: JSON.stringify({ target_conversation_id: targetConversationId }),
      }
    );
  }

  // ==================== Utilities ====================

  async countMessagesByConversation(conversationId: string): Promise<number> {
    const response = await this.request<{ count: number }>(
      `/conversations/${conversationId}/messages/count`
    );
    return response.count;
  }

  async countConversationsByStage(stageId: string): Promise<number> {
    const response = await this.request<{ count: number }>(
      `/stages/${stageId}/conversations/count`
    );
    return response.count;
  }

  async countUnreadConversations(
    workspaceId: string, 
    whatsappNumberId?: string
  ): Promise<number> {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (whatsappNumberId) params.append('whatsapp_number_id', whatsappNumberId);

    const response = await this.request<{ count: number }>(
      `/conversations/unread/count?${params.toString()}`
    );
    return response.count;
  }
}
