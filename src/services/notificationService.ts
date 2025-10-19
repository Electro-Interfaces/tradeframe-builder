/**
 * Notification Service - работа с системой уведомлений через Supabase
 */

import { createClient } from '@supabase/supabase-js';
import type {
  NotificationRule,
  Notification,
  UserNotificationSettings,
  UserNotificationSubscription,
  RoleNotificationSubscription
} from '@/types/notification';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDM4MzQsImV4cCI6MjA3MjkxOTgzNH0.D-sYdRV7AZ9-plDl2Gh5eFW2jfl7-LC2slKQ3CrgqB8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Получить список правил уведомлений для тенанта
 */
export async function getNotificationRules(tenantId: string): Promise<NotificationRule[]> {
  const response = await fetch(`/api/telegram/get-rules/${tenantId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notification rules');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Получить правило по ID
 */
export async function getNotificationRule(ruleId: string): Promise<NotificationRule | null> {
  const { data, error } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch notification rule: ${error.message}`);
  }

  return data;
}

/**
 * Создать новое правило
 */
export async function createNotificationRule(rule: Partial<NotificationRule>): Promise<NotificationRule> {
  const response = await fetch('/api/telegram/create-rule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rule })
  });

  if (!response.ok) {
    throw new Error('Failed to create notification rule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Обновить правило
 */
export async function updateNotificationRule(
  ruleId: string,
  updates: Partial<NotificationRule>
): Promise<NotificationRule> {
  const response = await fetch(`/api/telegram/update-rule/${ruleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ updates })
  });

  if (!response.ok) {
    throw new Error('Failed to update notification rule');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Удалить правило
 */
export async function deleteNotificationRule(ruleId: string): Promise<void> {
  const response = await fetch(`/api/telegram/delete-rule/${ruleId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete notification rule');
  }
}

/**
 * Получить список уведомлений для тенанта
 */
export async function getNotifications(
  tenantId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }

  return data || [];
}

/**
 * Отметить уведомление как прочитанное
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
      status: 'read'
    })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * Получить настройки уведомлений пользователя
 */
export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
  const response = await fetch(`/api/telegram/get-settings/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user notification settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Обновить настройки уведомлений пользователя
 */
export async function updateUserNotificationSettings(
  userId: string,
  settings: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings> {
  const response = await fetch('/api/telegram/save-settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, settings })
  });

  if (!response.ok) {
    throw new Error('Failed to update user notification settings');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Генерировать код привязки Telegram
 */
export async function generateTelegramLinkCode(userId: string): Promise<{
  linkCode: string;
  telegramLink: string;
  expiresAt: string;
}> {
  const response = await fetch('/api/telegram/generate-link-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    throw new Error('Failed to generate Telegram link code');
  }

  const data = await response.json();
  return data;
}

/**
 * Получить подписки пользователя
 */
export async function getUserNotificationSubscriptions(userId: string): Promise<UserNotificationSubscription[]> {
  const response = await fetch(`/api/telegram/get-subscriptions/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user notification subscriptions');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Обновить подписку пользователя
 */
export async function updateUserNotificationSubscription(
  userId: string,
  notificationType: string,
  subscription: Partial<UserNotificationSubscription>
): Promise<UserNotificationSubscription> {
  const response = await fetch('/api/telegram/save-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, notificationType, subscription })
  });

  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Получить подписки роли
 */
export async function getRoleNotificationSubscriptions(roleId: string): Promise<RoleNotificationSubscription[]> {
  const { data, error } = await supabase
    .from('role_notification_subscriptions')
    .select('*')
    .eq('role_id', roleId);

  if (error) {
    throw new Error(`Failed to fetch role notification subscriptions: ${error.message}`);
  }

  return data || [];
}

/**
 * Отправить тестовое уведомление в Telegram
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/telegram/send-test-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send test notification');
  }

  const result = await response.json();
  return result;
}
