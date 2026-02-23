/**
 * API-клиент для TSupport SDK (заявки + чат)
 * Все запросы идут через TradeFrame backend → TSupport SDK API
 */

import type {
  SupportTicket,
  TicketMessage,
  TicketActivity,
  TicketCategory,
  CreateTicketInput,
  ChatRoom,
  ChatMessage,
  UnreadCounts,
} from '@/types/support';

/**
 * Базовый URL бэкенда (по аналогии с mstoProxyClient.ts)
 */
function getBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const origin = window.location?.origin;
  if (!origin || origin === 'null') return 'http://localhost:3001';
  if (origin.includes('github.io')) return 'https://testtf.dataworker.ru';
  return origin;
}

/**
 * Получить заголовки с информацией о пользователе
 */
function getUserHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  try {
    const savedUser = localStorage.getItem('tradeframe_user_v2') || localStorage.getItem('tradeframe_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.id) headers['X-TF-User-Id'] = user.id;
      if (user.email) headers['X-TF-User-Email'] = user.email;
      if (user.name) headers['X-TF-User-Name'] = encodeURIComponent(user.name);
      if (user.role) headers['X-TF-User-Role'] = user.role;
    }

    // company_id из SelectionContext (сохранён в localStorage как строка UUID)
    const selectedNetwork = localStorage.getItem('tc:selectedNetwork');
    if (selectedNetwork && selectedNetwork !== 'all') {
      headers['X-TF-Company-Id'] = selectedNetwork;
    }
  } catch {
    // Ignore parse errors
  }

  return headers;
}

/**
 * Выполнить запрос к Support API
 */
async function supportRequest<T>(
  endpoint: string,
  options: { method?: string; params?: Record<string, string>; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', params, body } = options;
  const base = getBaseUrl();
  let url = `${base}/api/support${endpoint}`;

  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    );
    if (qs.toString()) url += `?${qs}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: getUserHeaders(),
    cache: 'no-store',
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `Support API error: ${response.status}`);
  }

  return response.json();
}

// === Тикеты ===

export interface TicketListResponse {
  data: SupportTicket[];
  total: number;
  limit: number;
  offset: number;
}

export async function getTickets(filters?: {
  status?: string;
  priority?: string;
  type?: string;
  category?: string;
  direction?: string;
  search?: string;
  created_by?: string;
  assigned_to?: string;
  sla_breached?: boolean;
  archived?: string; // 'true' | 'all'
  show_deleted?: boolean;
  limit?: number;
  offset?: number;
}): Promise<TicketListResponse> {
  const params: Record<string, string> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.priority) params.priority = filters.priority;
  if (filters?.type) params.type = filters.type;
  if (filters?.category) params.category = filters.category;
  if (filters?.direction) params.direction = filters.direction;
  if (filters?.search) params.search = filters.search;
  if (filters?.created_by) params.created_by = filters.created_by;
  if (filters?.assigned_to) params.assigned_to = filters.assigned_to;
  if (filters?.sla_breached) params.sla_breached = 'true';
  if (filters?.archived) params.archived = filters.archived;
  if (filters?.show_deleted) params.show_deleted = 'true';
  if (filters?.limit) params.limit = String(filters.limit);
  if (filters?.offset) params.offset = String(filters.offset);

  return supportRequest<TicketListResponse>('/tickets', { params });
}

export async function getTicket(id: string): Promise<SupportTicket> {
  return supportRequest<SupportTicket>(`/tickets/${id}`);
}

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  return supportRequest<SupportTicket>('/tickets', {
    method: 'POST',
    body: { ...input, source_code: 'tradeframe' },
  });
}

export async function updateTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket> {
  return supportRequest<SupportTicket>(`/tickets/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function archiveTicket(id: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${id}/archive`, { method: 'POST' });
}

export async function unarchiveTicket(id: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${id}/unarchive`, { method: 'POST' });
}

export async function deleteTicket(id: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${id}`, { method: 'DELETE' });
}

export async function restoreTicket(id: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${id}/restore`, { method: 'POST' });
}

// === Сообщения тикетов ===

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  return supportRequest<TicketMessage[]>(`/tickets/${ticketId}/messages`);
}

export async function sendTicketMessage(ticketId: string, content: string, media_urls?: string[], opts?: {
  voice_url?: string;
  voice_text?: string;
}): Promise<TicketMessage> {
  return supportRequest<TicketMessage>(`/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: { content, message_type: 'comment', ...(media_urls?.length ? { media_urls } : {}), ...opts },
  });
}

// === Активность ===

export async function getTicketActivity(ticketId: string): Promise<TicketActivity[]> {
  return supportRequest<TicketActivity[]>(`/tickets/${ticketId}/activity`);
}

// === Upload файлов ===

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

export async function uploadFiles(ticketId: string, files: File[]): Promise<UploadedFile[]> {
  const base = getBaseUrl();
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const headers = getUserHeaders();
  delete headers['Content-Type']; // FormData сам поставит boundary

  const response = await fetch(`${base}/api/support/upload/${ticketId}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Upload error: ${response.status}`);
  }

  const data = await response.json();
  return data.files;
}

// === Категории ===

export async function getCategories(): Promise<TicketCategory[]> {
  return supportRequest<TicketCategory[]>('/categories');
}

// === Текущий пользователь TSupport ===

export async function getTSupportMe(): Promise<{ tsupportUserId: string }> {
  return supportRequest<{ tsupportUserId: string }>('/me');
}

// === Чат ===

export async function getChatRooms(): Promise<ChatRoom[]> {
  return supportRequest<ChatRoom[]>('/chat/rooms');
}

export async function createChatRoom(input: {
  type: 'direct' | 'company';
  name?: string;
  participant_ids?: string[];
}): Promise<ChatRoom> {
  return supportRequest<ChatRoom>('/chat/rooms', { method: 'POST', body: input });
}

export async function getChatRoom(roomId: string): Promise<ChatRoom> {
  return supportRequest<ChatRoom>(`/chat/rooms/${roomId}`);
}

export async function getChatMessages(roomId: string, opts?: {
  limit?: number;
  before?: string;
}): Promise<ChatMessage[]> {
  const params: Record<string, string> = {};
  if (opts?.limit) params.limit = String(opts.limit);
  if (opts?.before) params.before = opts.before;

  return supportRequest<ChatMessage[]>(`/chat/rooms/${roomId}/messages`, { params });
}

export async function sendChatMessage(roomId: string, content: string, fileData?: {
  type: 'image' | 'file';
  file_url: string;
  file_name: string;
  file_size: number;
}, replyTo?: string): Promise<ChatMessage> {
  return supportRequest<ChatMessage>(`/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: {
      content,
      type: fileData?.type || 'text',
      ...(fileData ? { file_url: fileData.file_url, file_name: fileData.file_name, file_size: fileData.file_size } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    },
  });
}

export async function editChatMessage(roomId: string, messageId: string, content: string): Promise<ChatMessage> {
  return supportRequest<ChatMessage>(`/chat/rooms/${roomId}/messages/${messageId}`, {
    method: 'PATCH',
    body: { content },
  });
}

export async function deleteChatMessage(roomId: string, messageId: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/chat/rooms/${roomId}/messages/${messageId}`, { method: 'DELETE' });
}

export async function editTicketMessage(ticketId: string, messageId: string, content: string): Promise<unknown> {
  return supportRequest(`/tickets/${ticketId}/messages/${messageId}`, {
    method: 'PATCH',
    body: { content },
  });
}

export async function deleteTicketMessage(ticketId: string, messageId: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${ticketId}/messages/${messageId}`, { method: 'DELETE' });
}

export async function searchUsers(q: string, limit = 20): Promise<{ id: string; name: string; email: string; role: string }[]> {
  return supportRequest(`/users/search`, { params: { q, limit: String(limit) } });
}

export async function uploadChatFiles(roomId: string, files: File[]): Promise<UploadedFile[]> {
  const base = getBaseUrl();
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));

  const headers = getUserHeaders();
  delete headers['Content-Type'];

  const response = await fetch(`${base}/api/support/upload/chat-${roomId}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Upload error: ${response.status}`);
  }

  const data = await response.json();
  return data.files;
}

export async function markChatRead(roomId: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/chat/rooms/${roomId}/read`, { method: 'POST' });
}

// === Прочитано ===

export async function markTicketRead(ticketId: string): Promise<void> {
  await supportRequest<{ ok: boolean }>(`/tickets/${ticketId}/read`, { method: 'POST' });
}

// === Непрочитанные ===

export async function getUnreadCounts(): Promise<UnreadCounts> {
  return supportRequest<UnreadCounts>('/unread');
}
