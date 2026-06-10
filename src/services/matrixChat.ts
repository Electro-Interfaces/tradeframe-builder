/**
 * Адаптер Matrix → сигнатуры supportService (чтобы ChatPage менялся минимально).
 *
 * matrix-js-sdk БЕЗ crypto (клиентские комнаты не шифруются). access_token берётся с backend
 * (`POST /api/chat/matrix/session`), пароль на фронте не вводится. Токен живёт только в памяти SDK
 * (R1: не в localStorage); при невалидном токене — переинициализация через тот же /session.
 *
 * MVP (фаза 2) = личный чат поддержки. createChatRoom/searchUsers/upload — недоступны клиенту (R4),
 * realtime — через polling ChatPage поверх живого /sync (R3); Room.timeline-подписка — фаза 4.
 */

import { createClient, ClientEvent, HttpApiEvent, RoomEvent, type MatrixClient, type MatrixEvent } from 'matrix-js-sdk';
import { apiRequest } from './apiClient';
import type { ChatRoom, ChatMessage, ChatParticipant } from '@/types/support';

let client: MatrixClient | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let myUserId = '';
let supportRoomId = '';
let newsRoomId = '';
let generalRoomId = '';
let accessToken = '';
let ownedRoomIds = new Set<string>();
// Комнаты, удалённые в этой сессии. matrix-js-sdk держит покинутые комнаты в getRooms()
// до прихода leave-события через sync, поэтому скрываем их оптимистично сразу.
let deletedRoomIds = new Set<string>();

// Кэш authenticated-media: mxc → objectURL (Synapse 1.154 требует токен на скачивание;
// <img> его не шлёт, поэтому скачиваем blob с Bearer и отдаём objectURL в file_url).
const mediaCache = new Map<string, string>();

function getSelectedNetwork(): string | null {
  try {
    const v = localStorage.getItem('tc:selectedNetwork');
    return v && v !== 'all' ? v : null;
  } catch {
    return null;
  }
}

async function fetchSession() {
  return apiRequest('/chat/matrix/session', {
    method: 'POST',
    body: JSON.stringify({ networkId: getSelectedNetwork() }),
  }) as Promise<{ homeserver: string; userId: string; accessToken: string; supportRoomId: string; newsRoomId?: string; generalRoomId?: string; ownedRoomIds?: string[] }>;
}

async function doInit() {
  const s = await fetchSession();
  myUserId = s.userId;
  supportRoomId = s.supportRoomId;
  newsRoomId = s.newsRoomId || '';
  generalRoomId = s.generalRoomId || '';
  accessToken = s.accessToken;
  ownedRoomIds = new Set(s.ownedRoomIds || []);
  deletedRoomIds = new Set();
  client = createClient({ baseUrl: s.homeserver, accessToken: s.accessToken, userId: s.userId });
  // Невалидный токен после init (рестарт Synapse, ротация): SDK кидает SessionLoggedOut на
  // M_UNKNOWN_TOKEN → сбрасываем клиента; следующий вызов переинициализируется через /session.
  client.on(HttpApiEvent.SessionLoggedOut, () => {
    teardownChat();
  });
  await client.startClient({ initialSyncLimit: 50 });
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('Matrix sync timeout')), 30000);
    client!.once(ClientEvent.Sync, (state: string) => {
      if (state === 'PREPARED') {
        clearTimeout(to);
        ready = true;
        resolve();
      } else if (state === 'ERROR') {
        clearTimeout(to);
        reject(new Error('Matrix sync error'));
      }
    });
  });
}

async function ensureClient(): Promise<MatrixClient> {
  if (client && ready) return client;
  if (!initPromise) {
    initPromise = doInit().catch((e) => {
      // сбрасываем, чтобы следующий вызов попробовал заново (R1: refresh токена).
      // stopClient обязателен: иначе осиротевший клиент продолжит крутить /sync-ретраи.
      try {
        client?.stopClient();
      } catch {
        /* уже остановлен */
      }
      initPromise = null;
      client = null;
      ready = false;
      throw e;
    });
  }
  await initPromise;
  return client!;
}

/**
 * Полный сброс состояния чата (вызывается при logout): останавливаем /sync, забываем токен,
 * комнаты и кэш медиа (revoke objectURL). Следующий пользователь на этом же устройстве
 * получит свежий /session со СВОИМ аккаунтом, а не клиента предыдущего.
 */
export function teardownChat(): void {
  try {
    client?.stopClient();
  } catch {
    /* уже остановлен */
  }
  client = null;
  ready = false;
  initPromise = null;
  myUserId = '';
  supportRoomId = '';
  newsRoomId = '';
  generalRoomId = '';
  accessToken = '';
  ownedRoomIds = new Set();
  deletedRoomIds = new Set();
  for (const url of mediaCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  mediaCache.clear();
}

// ── helpers маппинга ───────────────────────────────────
function lastMessageEvent(room: any): MatrixEvent | null {
  const events = room.getLiveTimeline().getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.getType() === 'm.room.message' && !ev.isRedacted()) return ev;
  }
  return null;
}

// Запасной счётчик непрочитанных: сообщения от ДРУГИХ после последнего прочитанного
// (по read-receipt текущего юзера). Нужен, когда серверный unread_notifications недоступен
// или push-rules не настроены и getUnreadNotificationCount() врёт 0.
function receiptUnread(room: any): number {
  try {
    const events = room.getLiveTimeline().getEvents();
    const readUpTo = room.getEventReadUpTo?.(myUserId, false);
    let count = 0;
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (readUpTo && ev.getId() === readUpTo) break;
      if (ev.getType() === 'm.room.message' && ev.getSender() !== myUserId && !ev.isRedacted()) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

function unreadCount(room: any): number {
  try {
    const n = room.getUnreadNotificationCount?.() ?? 0;
    return n > 0 ? n : receiptUnread(room);
  } catch {
    return 0;
  }
}

// Может ли текущий юзер отправлять m.room.message (по m.room.power_levels комнаты).
// Для «Новостей» events_default=50, клиент с PL 0 → false (только чтение). Обычные комнаты → true.
function canSendMessage(room: any): boolean {
  try {
    const ev = room.currentState?.getStateEvents?.('m.room.power_levels', '');
    const pl = ev?.getContent?.() || {};
    const myPower = room.getMember?.(myUserId)?.powerLevel ?? (pl.users?.[myUserId] ?? pl.users_default ?? 0);
    const needed = pl.events?.['m.room.message'] ?? pl.events_default ?? 0;
    return myPower >= needed;
  } catch {
    return true;
  }
}

function roomKind(roomId: string): ChatRoom['kind'] {
  if (roomId === newsRoomId) return 'news';
  if (roomId === generalRoomId) return 'support-general';
  if (roomId === supportRoomId) return 'support-personal';
  return 'client';
}

function roomToChatRoom(room: any): ChatRoom {
  const last = lastMessageEvent(room);
  const lastSender = last ? room.getMember?.(last.getSender())?.name || last.getSender() : undefined;
  const kind = roomKind(room.roomId);
  return {
    id: room.roomId,
    type: room.roomId === supportRoomId ? 'direct' : 'group',
    name: room.name,
    unread_count: unreadCount(room),
    last_message: last ? last.getContent().body : undefined,
    last_message_at: last ? new Date(last.getTs()).toISOString() : undefined,
    last_message_by: lastSender,
    created_at: new Date(room.getLiveTimeline().getEvents()[0]?.getTs() || Date.now()).toISOString(),
    updated_at: last ? new Date(last.getTs()).toISOString() : new Date().toISOString(),
    kind,
    readonly: !canSendMessage(room),
  };
}

function msgTypeOf(content: any): ChatMessage['type'] {
  switch (content?.msgtype) {
    case 'm.image': return 'image';
    case 'm.file':
    case 'm.audio':
    case 'm.video': return 'file';
    default: return 'text';
  }
}

function eventToMessage(room: any, ev: MatrixEvent): ChatMessage {
  const content: any = ev.getContent();
  const sender = ev.getSender() || '';
  const replyId = content?.['m.relates_to']?.['m.in_reply_to']?.event_id;
  const isMedia = content?.msgtype === 'm.image' || content?.msgtype === 'm.file';
  const msg: ChatMessage & { _mxc?: string } = {
    id: ev.getId() || '',
    room_id: ev.getRoomId() || room.roomId,
    user_id: sender,
    user_name: room.getMember?.(sender)?.name || sender,
    type: msgTypeOf(content),
    content: ev.isRedacted() ? '' : isMedia ? '' : (content?.body || ''),
    file_url: undefined, // резолвится в getChatMessages (authenticated media → objectURL)
    file_name: isMedia ? content?.body : undefined,
    file_size: content?.info?.size,
    reply_to: replyId,
    is_edited: Boolean(ev.replacingEvent?.()),
    is_deleted: ev.isRedacted(),
    created_at: new Date(ev.getTs()).toISOString(),
  };
  if (isMedia && content?.url && !ev.isRedacted()) msg._mxc = content.url;
  return msg;
}

// Скачать authenticated-media с Bearer-токеном и отдать objectURL (кэш по mxc).
async function getMediaBlobUrl(mxc: string): Promise<string | undefined> {
  if (!mxc || !client) return undefined;
  const cached = mediaCache.get(mxc);
  if (cached) return cached;
  try {
    const url = client.mxcUrlToHttp(mxc, undefined, undefined, undefined, false, true, true);
    if (!url) return undefined;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!resp.ok) return undefined;
    const obj = URL.createObjectURL(await resp.blob());
    mediaCache.set(mxc, obj);
    return obj;
  } catch {
    return undefined;
  }
}

// Служебные Matrix-аккаунты (боты инфраструктуры чата): создатель/админ комнат @tf-chat-svc
// и AI-ops @aiops. Людям их не показываем и НЕ считаем участниками при выборе типа звонка
// (иначе чат двух человек выглядит как 3 участника → 1:1-звонок никогда не активируется).
const SERVICE_LOCALPARTS = new Set(['tf-chat-svc', 'aiops']);
function isServiceAccount(mxid: string): boolean {
  const localpart = String(mxid || '').replace(/^@/, '').split(':')[0];
  return SERVICE_LOCALPARTS.has(localpart);
}

function memberToParticipant(m: any): ChatParticipant {
  return {
    id: m.userId,
    user_id: m.userId,
    name: m.name || m.userId,
    email: '',
    user_role: '',
    role: 'member',
    avatar_url: undefined,
  };
}

// ── публичный API (сигнатуры supportService) ───────────
export async function getChatRooms(): Promise<ChatRoom[]> {
  const c = await ensureClient();
  // Наши закреплённые каналы всегда вверху в порядке: Новости → Общая поддержка → Индивидуальная,
  // затем клиентские чаты по времени последнего сообщения.
  const prio = (r: ChatRoom) =>
    r.kind === 'news' ? 0 : r.kind === 'support-general' ? 1 : r.kind === 'support-personal' ? 2 : 3;
  return c
    .getRooms()
    // Только комнаты, где пользователь состоит. SDK держит покинутые/удалённые (membership
    // 'leave') в getRooms() — без фильтра удалённый чат остаётся в списке. deletedRoomIds
    // скрывает удалённое сразу, не дожидаясь прихода leave-события через sync.
    .filter((r) => r.getMyMembership() === 'join' && !deletedRoomIds.has(r.roomId))
    .map(roomToChatRoom)
    .sort((a, b) => prio(a) - prio(b) || (b.last_message_at || '').localeCompare(a.last_message_at || ''));
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const c = await ensureClient();
  const room = c.getRoom(roomId);
  if (!room) return [];
  if (room.getLiveTimeline().getEvents().length < 15) {
    await c.scrollback(room, 50).catch(() => {});
  }
  const msgs = room
    .getLiveTimeline()
    .getEvents()
    .filter((ev) => ev.getType() === 'm.room.message')
    .map((ev) => eventToMessage(room, ev));
  await Promise.all(
    msgs.map(async (m) => {
      const mxc = (m as ChatMessage & { _mxc?: string })._mxc;
      if (mxc) m.file_url = await getMediaBlobUrl(mxc);
    })
  );
  return msgs;
}

export async function sendChatMessage(
  roomId: string,
  content: string,
  fileData?: { type: 'image' | 'file'; file_url: string; file_name: string; file_size: number },
  replyTo?: string,
): Promise<ChatMessage> {
  const c = await ensureClient();
  // fileData.file_url = mxc:// из uploadChatFiles. Текстовая подпись к файлу в MVP не поддержана
  // (m.image/m.file body = имя файла); обычный текст идёт отдельным m.text.
  const body: any = fileData
    ? {
        msgtype: fileData.type === 'image' ? 'm.image' : 'm.file',
        body: fileData.file_name,
        url: fileData.file_url,
        info: { size: fileData.file_size },
      }
    : { msgtype: 'm.text', body: content };
  if (replyTo) body['m.relates_to'] = { 'm.in_reply_to': { event_id: replyTo } };
  const res = await c.sendEvent(roomId, 'm.room.message' as any, body);
  const room = c.getRoom(roomId);
  return {
    id: res.event_id,
    room_id: roomId,
    user_id: myUserId,
    user_name: room?.getMember?.(myUserId)?.name || myUserId,
    type: fileData ? fileData.type : 'text',
    content: fileData ? '' : content,
    file_url: fileData ? await getMediaBlobUrl(fileData.file_url) : undefined,
    file_name: fileData?.file_name,
    file_size: fileData?.file_size,
    reply_to: replyTo,
    is_edited: false,
    created_at: new Date().toISOString(),
  };
}

export async function markChatRead(roomId: string): Promise<void> {
  const c = await ensureClient();
  const room = c.getRoom(roomId);
  const events = room?.getLiveTimeline().getEvents() || [];
  const last = events[events.length - 1];
  if (last) await c.sendReadReceipt(last).catch(() => {});
}

export async function getChatRoom(roomId: string): Promise<ChatRoom> {
  const c = await ensureClient();
  const room = c.getRoom(roomId);
  if (!room) throw new Error('Комната не найдена');
  const base = roomToChatRoom(room);
  base.participants = (room.getJoinedMembers() || [])
    .filter((m: any) => !isServiceAccount(m.userId))
    .map(memberToParticipant);
  return base;
}

export async function editChatMessage(roomId: string, messageId: string, content: string): Promise<ChatMessage> {
  const c = await ensureClient();
  await c.sendEvent(roomId, 'm.room.message' as any, {
    msgtype: 'm.text',
    body: `* ${content}`,
    'm.new_content': { msgtype: 'm.text', body: content },
    'm.relates_to': { rel_type: 'm.replace', event_id: messageId },
  });
  return { id: messageId, room_id: roomId, user_id: myUserId, user_name: myUserId, type: 'text', content, is_edited: true, created_at: new Date().toISOString() };
}

export async function deleteChatMessage(roomId: string, messageId: string): Promise<void> {
  const c = await ensureClient();
  await c.redactEvent(roomId, messageId);
}

export async function getTSupportMe(): Promise<{ tsupportUserId: string }> {
  await ensureClient();
  return { tsupportUserId: myUserId };
}

// Realtime: подписка на входящие события таймлайна (живые сообщения без polling).
// handler получает roomId изменившейся комнаты. Возвращает функцию отписки.
export function subscribeChat(handler: (roomId: string) => void): () => void {
  if (!client) return () => {};
  const cb = (_event: MatrixEvent, room: { roomId: string } | undefined) => {
    if (room) handler(room.roomId);
  };
  client.on(RoomEvent.Timeline, cb as never);
  return () => client?.off(RoomEvent.Timeline, cb as never);
}

// Сумма непрочитанных по всем комнатам — для бейджа в сайдбаре.
// null, если Matrix-клиент ещё не запущен (тогда вызывающий оставляет своё значение).
export function getChatUnread(): number | null {
  if (!client || !ready) return null;
  return client.getRooms().reduce((sum, r) => sum + unreadCount(r), 0);
}

// Прогрев Matrix-клиента при старте приложения: бейдж непрочитанных и realtime-подписка
// работают ещё до первого открытия чата. Без прогрева getChatUnread() возвращает null до тех пор,
// пока пользователь не зайдёт в чат. Тихо игнорируем ошибки (Matrix может быть недоступен).
export async function warmupChat(): Promise<void> {
  try {
    await ensureClient();
  } catch {
    /* бейдж останется от TSupport */
  }
}

// ── недоступно клиенту в Matrix-модели (R4) ────────────
// Клиентские чаты (свои сотрудники, без поддержки): создаёт и управляет клиент.
export async function getCompanyMembers(): Promise<{ id: string; name: string; email: string; mxid: string | null }[]> {
  const net = getSelectedNetwork();
  const q = net ? `?networkId=${encodeURIComponent(net)}` : '';
  return apiRequest('/chat/matrix/company-members' + q) as Promise<{ id: string; name: string; email: string; mxid: string | null }[]>;
}

export async function createChatRoom(input: { type?: string; name?: string; participant_ids?: string[] }): Promise<ChatRoom> {
  const r = await apiRequest('/chat/matrix/rooms', {
    method: 'POST',
    body: JSON.stringify({ name: input.name, members: input.participant_ids || [], networkId: getSelectedNetwork() }),
  });
  ownedRoomIds.add(r.roomId);
  return {
    id: r.roomId,
    type: 'group',
    name: input.name,
    unread_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function addRoomMember(roomId: string, tfUserId: string): Promise<void> {
  await apiRequest(`/chat/matrix/rooms/${encodeURIComponent(roomId)}/members`, {
    method: 'POST', body: JSON.stringify({ action: 'add', tfUserId }),
  });
}

export async function removeRoomMember(roomId: string, mxid: string): Promise<void> {
  await apiRequest(`/chat/matrix/rooms/${encodeURIComponent(roomId)}/members`, {
    method: 'POST', body: JSON.stringify({ action: 'remove', mxid }),
  });
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiRequest(`/chat/matrix/rooms/${encodeURIComponent(roomId)}`, { method: 'DELETE' });
  ownedRoomIds.delete(roomId);
  // Скрыть сразу: Synapse-purge кикает участника асинхронно, leave-событие придёт с задержкой.
  deletedRoomIds.add(roomId);
  try {
    await client?.forget(roomId);
  } catch {
    /* комната уже очищена на сервере или leave ещё не дошёл — фильтр membership/deletedRoomIds скроет */
  }
}

/** Может ли текущий пользователь управлять комнатой (это его клиентский чат). */
export function canManageRoom(roomId: string): boolean {
  return ownedRoomIds.has(roomId);
}

// Загрузка файлов в Matrix media → mxc:// (фаза 4).
export async function uploadChatFiles(
  _roomId: string,
  files: File[],
): Promise<{ url: string; name: string; size: number; type: string }[]> {
  const c = await ensureClient();
  const out: { url: string; name: string; size: number; type: string }[] = [];
  for (const f of files) {
    const res = await c.uploadContent(f, { name: f.name, type: f.type });
    out.push({ url: res.content_uri, name: f.name, size: f.size, type: f.type });
  }
  return out;
}

/**
 * Доступ к MatrixClient для нативных 1:1 звонков (Фаза 6b, matrixCall.ts).
 * Инициализирует чат, если он ещё не поднят (тот же ensureClient, что у остальных функций).
 */
export async function getMatrixClientForCalls(): Promise<MatrixClient> {
  return ensureClient();
}
