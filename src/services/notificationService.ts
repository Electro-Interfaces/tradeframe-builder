/**
 * Notification Service - работа с системой уведомлений через backend API
 */

import type {
  NotificationRule,
  Notification,
  UserNotificationSettings,
  UserNotificationSubscription,
  RoleNotificationSubscription
} from '@/types/notification';
import { notificationApiRequest } from './notificationApiClient';

/**
 * Получить список правил уведомлений для тенанта
 */
export async function getNotificationRules(tenantId: string): Promise<NotificationRule[]> {
  const result = await notificationApiRequest<{ success: boolean; data: NotificationRule[] }>(
    `/api/telegram/get-rules/${tenantId}`
  );
  return result.data || [];
}

/**
 * Получить правило по ID
 */
export async function getNotificationRule(ruleId: string): Promise<NotificationRule | null> {
  const result = await notificationApiRequest<{ success: boolean; data: NotificationRule | null }>(
    `/api/telegram/get-rule/${ruleId}`
  );
  return result.data || null;
}

/**
 * Создать новое правило
 */
export async function createNotificationRule(rule: Partial<NotificationRule>): Promise<NotificationRule> {
  const result = await notificationApiRequest<{ success: boolean; data: NotificationRule }>(
    '/api/telegram/create-rule',
    {
      method: 'POST',
      body: JSON.stringify({ rule })
    }
  );
  return result.data;
}

/**
 * Обновить правило
 */
export async function updateNotificationRule(
  ruleId: string,
  updates: Partial<NotificationRule>
): Promise<NotificationRule> {
  const result = await notificationApiRequest<{ success: boolean; data: NotificationRule }>(
    `/api/telegram/update-rule/${ruleId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ updates })
    }
  );
  return result.data;
}

/**
 * Удалить правило
 */
export async function deleteNotificationRule(ruleId: string): Promise<void> {
  await notificationApiRequest<{ success: boolean }>(`/api/telegram/delete-rule/${ruleId}`, {
    method: 'DELETE'
  });
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
  const query = new URLSearchParams();
  if (options?.status) query.set('status', options.status);
  if (options?.limit) query.set('limit', String(options.limit));
  if (options?.offset) query.set('offset', String(options.offset));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await notificationApiRequest<{ success: boolean; data: Notification[] }>(
    `/api/telegram/get-notifications/${tenantId}${suffix}`
  );

  return result.data || [];
}

/**
 * Отметить уведомление как прочитанное
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await notificationApiRequest<{ success: boolean }>(`/api/telegram/mark-notification-read/${notificationId}`, {
    method: 'POST'
  });
}

/**
 * Получить настройки уведомлений пользователя
 */
export async function getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
  const result = await notificationApiRequest<{ success: boolean; data: UserNotificationSettings | null }>(
    `/api/telegram/get-settings/${userId}`
  );
  return result.data;
}

/**
 * Обновить настройки уведомлений пользователя
 */
export async function updateUserNotificationSettings(
  userId: string,
  settings: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings> {
  const result = await notificationApiRequest<{ success: boolean; data: UserNotificationSettings }>(
    '/api/telegram/save-settings',
    {
      method: 'POST',
      body: JSON.stringify({ userId, settings })
    }
  );
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
  const data = await notificationApiRequest<{
    success: boolean;
    linkCode: string;
    telegramLink: string;
    expiresAt: string;
  }>('/api/telegram/generate-link-code', {
    method: 'POST',
    body: JSON.stringify({ userId })
  });

  return data;
}

/**
 * Получить подписки пользователя
 */
export async function getUserNotificationSubscriptions(userId: string): Promise<UserNotificationSubscription[]> {
  const result = await notificationApiRequest<{ success: boolean; data: UserNotificationSubscription[] }>(
    `/api/telegram/get-subscriptions/${userId}`
  );
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
  const result = await notificationApiRequest<{ success: boolean; data: UserNotificationSubscription }>(
    '/api/telegram/save-subscription',
    {
      method: 'POST',
      body: JSON.stringify({ userId, notificationType, subscription })
    }
  );
  return result.data;
}

/**
 * Получить подписки роли
 */
export async function getRoleNotificationSubscriptions(roleId: string): Promise<RoleNotificationSubscription[]> {
  const result = await notificationApiRequest<{ success: boolean; data: RoleNotificationSubscription[] }>(
    `/api/telegram/get-role-subscriptions/${roleId}`
  );
  return result.data || [];
}

/**
 * Отправить тестовое уведомление в Telegram
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
  const result = await notificationApiRequest<{ success: boolean; message: string }>(
    '/api/telegram/send-test-notification',
    {
      method: 'POST',
      body: JSON.stringify({ userId })
    }
  );
  return result;
}
