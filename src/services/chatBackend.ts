/**
 * Источник данных чата: TSupport (по умолчанию) или Matrix (VITE_CHAT_BACKEND=matrix).
 * ChatPage импортирует chat-функции отсюда — переключение источника без правок UI.
 * Сигнатуры канонизированы под supportService (Matrix-реализация приводится к ним).
 *
 * matrix-js-sdk (~400 KB gzip) НЕ входит в стартовый бандл: matrixChat грузится динамическим
 * import() и только при VITE_CHAT_BACKEND=matrix. Синхронные функции (getChatUnread,
 * canManageRoom, subscribeChat) до загрузки модуля отвечают безопасными значениями.
 */
import * as support from './supportService';
import type * as MatrixModule from './matrixChat';

const M = import.meta.env.VITE_CHAT_BACKEND === 'matrix';

let matrixMod: typeof MatrixModule | null = null;
let matrixLoad: Promise<typeof MatrixModule> | null = null;

function loadMatrix(): Promise<typeof MatrixModule> {
  if (!matrixLoad) {
    matrixLoad = import('./matrixChat').then((m) => {
      matrixMod = m;
      return m;
    });
  }
  return matrixLoad;
}

export const getChatRooms: typeof support.getChatRooms = M
  ? async () => (await loadMatrix()).getChatRooms()
  : support.getChatRooms;
export const getChatMessages: typeof support.getChatMessages = M
  ? (async (roomId) => (await loadMatrix()).getChatMessages(roomId)) as typeof support.getChatMessages
  : support.getChatMessages;
export const sendChatMessage: typeof support.sendChatMessage = M
  ? (async (...args: Parameters<typeof MatrixModule.sendChatMessage>) =>
      (await loadMatrix()).sendChatMessage(...args)) as typeof support.sendChatMessage
  : support.sendChatMessage;
export const markChatRead: typeof support.markChatRead = M
  ? async (roomId) => (await loadMatrix()).markChatRead(roomId)
  : support.markChatRead;
export const createChatRoom: typeof support.createChatRoom = M
  ? (async (input: Parameters<typeof MatrixModule.createChatRoom>[0]) =>
      (await loadMatrix()).createChatRoom(input)) as typeof support.createChatRoom
  : support.createChatRoom;
export const getChatRoom: typeof support.getChatRoom = M
  ? async (roomId) => (await loadMatrix()).getChatRoom(roomId)
  : support.getChatRoom;
export const editChatMessage: typeof support.editChatMessage = M
  ? async (roomId, messageId, content) => (await loadMatrix()).editChatMessage(roomId, messageId, content)
  : support.editChatMessage;
export const deleteChatMessage: typeof support.deleteChatMessage = M
  ? async (roomId, messageId) => (await loadMatrix()).deleteChatMessage(roomId, messageId)
  : support.deleteChatMessage;
export const getTSupportMe: typeof support.getTSupportMe = M
  ? async () => (await loadMatrix()).getTSupportMe()
  : support.getTSupportMe;
export const uploadChatFiles: typeof support.uploadChatFiles = M
  ? (async (roomId: string, files: File[]) =>
      (await loadMatrix()).uploadChatFiles(roomId, files)) as typeof support.uploadChatFiles
  : support.uploadChatFiles;

// Realtime-подписка и unread-счётчик чата. Для TSupport-режима — заглушки
// (там работает polling, а unread приходит из getUnreadCounts).
// Matrix-модуль может быть ещё не загружен: подписка доезжает после загрузки, счётчик — null.
export const subscribeChat: (handler: (roomId: string) => void) => () => void = M
  ? (handler) => {
      if (matrixMod) return matrixMod.subscribeChat(handler);
      let unsub: (() => void) | null = null;
      let cancelled = false;
      loadMatrix().then((m) => {
        if (!cancelled) unsub = m.subscribeChat(handler);
      });
      return () => {
        cancelled = true;
        unsub?.();
      };
    }
  : () => () => {};
export const getChatUnread: () => number | null = M
  ? () => (matrixMod ? matrixMod.getChatUnread() : null)
  : () => null;
// Прогрев Matrix-клиента при старте (живой бейдж до открытия чата). Для TSupport — noop.
export const warmupChat: () => Promise<void> = M
  ? async () => (await loadMatrix()).warmupChat()
  : async () => {};
// Полный сброс чата при logout: stopClient + забыть токен/кэш медиа. Если Matrix даже не
// загружался — ничего не делаем (и не тянем чанк ради сброса).
export const teardownChat: () => void = M
  ? () => {
      matrixMod?.teardownChat();
    }
  : () => {};

// Клиентские чаты (только Matrix). Для TSupport — безопасные заглушки.
export const getCompanyMembers: () => Promise<{ id: string; name: string; email: string; mxid: string | null }[]> = M
  ? async () => (await loadMatrix()).getCompanyMembers()
  : async () => [];
export const addRoomMember: (roomId: string, tfUserId: string) => Promise<void> = M
  ? async (roomId, tfUserId) => (await loadMatrix()).addRoomMember(roomId, tfUserId)
  : async () => {};
export const removeRoomMember: (roomId: string, mxid: string) => Promise<void> = M
  ? async (roomId, mxid) => (await loadMatrix()).removeRoomMember(roomId, mxid)
  : async () => {};
export const deleteRoom: (roomId: string) => Promise<void> = M
  ? async (roomId) => (await loadMatrix()).deleteRoom(roomId)
  : async () => {};
export const canManageRoom: (roomId: string) => boolean = M
  ? (roomId) => (matrixMod ? matrixMod.canManageRoom(roomId) : false)
  : () => false;
