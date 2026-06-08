/**
 * Источник данных чата: TSupport (по умолчанию) или Matrix (VITE_CHAT_BACKEND=matrix).
 * ChatPage импортирует chat-функции отсюда — переключение источника без правок UI.
 * Сигнатуры канонизированы под supportService (Matrix-реализация приводится к ним).
 */
import * as support from './supportService';
import * as matrix from './matrixChat';

const M = import.meta.env.VITE_CHAT_BACKEND === 'matrix';

export const getChatRooms: typeof support.getChatRooms = M ? matrix.getChatRooms : support.getChatRooms;
export const getChatMessages: typeof support.getChatMessages = M
  ? (matrix.getChatMessages as typeof support.getChatMessages)
  : support.getChatMessages;
export const sendChatMessage: typeof support.sendChatMessage = M
  ? (matrix.sendChatMessage as typeof support.sendChatMessage)
  : support.sendChatMessage;
export const markChatRead: typeof support.markChatRead = M ? matrix.markChatRead : support.markChatRead;
export const createChatRoom: typeof support.createChatRoom = M
  ? (matrix.createChatRoom as typeof support.createChatRoom)
  : support.createChatRoom;
export const getChatRoom: typeof support.getChatRoom = M ? matrix.getChatRoom : support.getChatRoom;
export const editChatMessage: typeof support.editChatMessage = M ? matrix.editChatMessage : support.editChatMessage;
export const deleteChatMessage: typeof support.deleteChatMessage = M ? matrix.deleteChatMessage : support.deleteChatMessage;
export const getTSupportMe: typeof support.getTSupportMe = M ? matrix.getTSupportMe : support.getTSupportMe;
export const uploadChatFiles: typeof support.uploadChatFiles = M
  ? (matrix.uploadChatFiles as typeof support.uploadChatFiles)
  : support.uploadChatFiles;

// Realtime-подписка и unread-счётчик чата. Для TSupport-режима — заглушки
// (там работает polling, а unread приходит из getUnreadCounts).
export const subscribeChat: (handler: (roomId: string) => void) => () => void = M
  ? matrix.subscribeChat
  : () => () => {};
export const getChatUnread: () => number | null = M ? matrix.getChatUnread : () => null;
