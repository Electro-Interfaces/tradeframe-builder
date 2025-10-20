/**
 * Хук для управления состоянием broadcast сообщения
 */

import { useState } from 'react';
import type { MessagePriority, MessageType, RecipientType, MessageChannel } from '@/types/message';

// ВРЕМЕННО: API работает только с одной сетью (ID 15)
const DEFAULT_NETWORK_ID = '15';

export function useBroadcastMessage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('news');
  const [priority, setPriority] = useState<MessagePriority>('medium');
  const [channels, setChannels] = useState<MessageChannel[]>(['telegram', 'email']);
  const [recipientType, setRecipientType] = useState<RecipientType>('networks');
  const [selectedNetworkId] = useState<string>(DEFAULT_NETWORK_ID); // Фиксированная сеть

  const reset = () => {
    setTitle('');
    setContent('');
    setMessageType('news');
    setPriority('medium');
    setChannels(['telegram', 'email']);
    setRecipientType('networks');
    // selectedNetworkId всегда фиксирован
  };

  const getFormData = () => ({
    title,
    content,
    message_type: messageType,
    priority,
    channels,
    recipient_type: recipientType,
    recipient_filter: selectedNetworkId ? { network_ids: [selectedNetworkId] } : undefined
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
    selectedNetworkId, // Только для чтения, всегда DEFAULT_NETWORK_ID

    // Сеттеры
    setTitle,
    setContent,
    setMessageType,
    setPriority,
    setChannels,
    setRecipientType,
    // setSelectedNetworkId убран - сеть фиксирована

    // Утилиты
    reset,
    getFormData,
    isValid
  };
}
