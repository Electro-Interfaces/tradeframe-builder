/**
 * Хук для управления состоянием broadcast сообщения
 */

import { useState } from 'react';
import type { MessagePriority, MessageType, RecipientType, MessageChannel } from '@/types/message';

export function useBroadcastMessage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('news');
  const [priority, setPriority] = useState<MessagePriority>('medium');
  const [channels, setChannels] = useState<MessageChannel[]>(['telegram', 'email']);
  const [recipientType, setRecipientType] = useState<RecipientType>('all');

  const reset = () => {
    setTitle('');
    setContent('');
    setMessageType('news');
    setPriority('medium');
    setChannels(['telegram', 'email']);
    setRecipientType('all');
  };

  const getFormData = () => ({
    title,
    content,
    message_type: messageType,
    priority,
    channels,
    recipient_type: recipientType
  });

  const isValid = () => {
    return title.trim() !== '' && content.trim() !== '' && channels.length > 0;
  };

  return {
    // Состояние
    title,
    content,
    messageType,
    priority,
    channels,
    recipientType,

    // Сеттеры
    setTitle,
    setContent,
    setMessageType,
    setPriority,
    setChannels,
    setRecipientType,

    // Утилиты
    reset,
    getFormData,
    isValid
  };
}
