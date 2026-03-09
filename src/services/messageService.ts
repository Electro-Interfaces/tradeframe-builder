/**
 * API Service для работы с системой обмена сообщениями
 */

import axios from 'axios';
import type {
  BroadcastMessage,
  CreateMessageData,
  UpdateMessageData,
  MessageListResponse,
  MessageResponse,
  MessageStatsResponse,
  SendMessageResponse,
  MessageTemplate
} from '@/types/message';

// ВАЖНО: trailing slash нужен для корректной работы с nginx на production (301 redirect)
const API_BASE_URL = '/api/messages';

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

const apiClient = axios.create();
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class MessageService {
  /**
   * Получить список сообщений
   */
  async getMessages(params?: {
    status?: string;
    authorId?: string;
    networkId?: string;
    limit?: number;
    offset?: number;
  }): Promise<MessageListResponse> {
    const response = await apiClient.get<MessageListResponse>(`${API_BASE_URL}/`, { params });
    return response.data;
  }

  /**
   * Получить конкретное сообщение
   */
  async getMessage(id: string): Promise<MessageResponse> {
    const response = await apiClient.get<MessageResponse>(`${API_BASE_URL}/${id}/`);
    return response.data;
  }

  /**
   * Создать новое сообщение (черновик)
   */
  async createMessage(data: CreateMessageData): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(`${API_BASE_URL}/`, data);
    return response.data;
  }

  /**
   * Обновить сообщение
   */
  async updateMessage(id: string, data: UpdateMessageData): Promise<MessageResponse> {
    const response = await apiClient.put<MessageResponse>(`${API_BASE_URL}/${id}/`, data);
    return response.data;
  }

  /**
   * Удалить сообщение (только черновики)
   */
  async deleteMessage(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`${API_BASE_URL}/${id}/`);
    return response.data;
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(id: string): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(`${API_BASE_URL}/${id}/send/`);
    return response.data;
  }

  /**
   * Получить статистику сообщения
   */
  async getMessageStats(id: string): Promise<MessageStatsResponse> {
    const response = await apiClient.get<MessageStatsResponse>(`${API_BASE_URL}/${id}/stats/`);
    return response.data;
  }

  /**
   * Создать и сразу отправить сообщение
   */
  async createAndSendMessage(data: CreateMessageData): Promise<{
    message: BroadcastMessage;
    sendResult: SendMessageResponse;
  }> {
    // Создаем сообщение
    const createResponse = await this.createMessage(data);
    const message = createResponse.data;

    // Проверяем, что сообщение создано и имеет ID
    if (!message || !message.id) {
      throw new Error('Не удалось создать сообщение: ответ сервера не содержит данных');
    }

    // Отправляем сообщение
    const sendResult = await this.sendMessage(message.id);

    return { message, sendResult };
  }

  /**
   * Получить шаблоны сообщений
   */
  async getTemplates(params?: {
    category?: string;
    isActive?: boolean;
  }): Promise<{ success: boolean; data: MessageTemplate[] }> {
    const response = await apiClient.get<{ success: boolean; data: MessageTemplate[] }>(
      `${API_BASE_URL}/templates/`,
      { params }
    );
    return response.data;
  }

  /**
   * Создать шаблон сообщения
   */
  async createTemplate(data: Partial<MessageTemplate>): Promise<{ success: boolean; data: MessageTemplate }> {
    const response = await apiClient.post<{ success: boolean; data: MessageTemplate }>(
      `${API_BASE_URL}/templates/`,
      data
    );
    return response.data;
  }

  /**
   * Обновить шаблон
   */
  async updateTemplate(
    id: string,
    data: Partial<MessageTemplate>
  ): Promise<{ success: boolean; data: MessageTemplate }> {
    const response = await apiClient.put<{ success: boolean; data: MessageTemplate }>(
      `${API_BASE_URL}/templates/${id}/`,
      data
    );
    return response.data;
  }

  /**
   * Удалить шаблон
   */
  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean }>(`${API_BASE_URL}/templates/${id}/`);
    return response.data;
  }

  /**
   * Создать сообщение из шаблона
   */
  async createFromTemplate(
    templateId: string,
    authorId: string,
    variables?: Record<string, any>
  ): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>(`${API_BASE_URL}/templates/${templateId}/create/`, {
      authorId,
      variables
    });
    return response.data;
  }
}

export const messageService = new MessageService();
export default messageService;
