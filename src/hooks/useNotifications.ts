/**
 * Хук для управления уведомлениями и правилами
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getNotificationRules,
  updateNotificationRule,
  deleteNotificationRule,
  createNotificationRule,
  getNotifications,
  markNotificationAsRead
} from '@/services/notificationService';
import type { NotificationRule, Notification } from '@/types/notification';

interface UseNotificationsOptions {
  tenantId?: string;
  autoLoad?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { tenantId, autoLoad = true } = options;
  const { toast } = useToast();

  // States
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<Notification[]>([]);
  const [historyNotifications, setHistoryNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load rules
  const loadRules = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const data = await getNotificationRules(tenantId);
      setRules(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить правила уведомлений',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId, toast]);

  // Load active notifications
  const loadActiveNotifications = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await getNotifications(tenantId, {
        status: 'pending',
        limit: 50
      });
      setActiveNotifications(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить активные уведомления',
        variant: 'destructive'
      });
    }
  }, [tenantId, toast]);

  // Load history notifications
  const loadHistoryNotifications = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await getNotifications(tenantId, {
        limit: 100
      });
      setHistoryNotifications(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить историю уведомлений',
        variant: 'destructive'
      });
    }
  }, [tenantId, toast]);

  // Load all data
  const loadAll = useCallback(async () => {
    await Promise.all([
      loadRules(),
      loadActiveNotifications(),
      loadHistoryNotifications()
    ]);
  }, [loadRules, loadActiveNotifications, loadHistoryNotifications]);

  // Auto load on mount
  useEffect(() => {
    if (autoLoad && tenantId) {
      loadAll();
    }
  }, [autoLoad, tenantId, loadAll]);

  // Toggle rule active state
  const toggleRule = useCallback(async (ruleId: string, currentState: boolean) => {
    try {
      await updateNotificationRule(ruleId, { is_active: !currentState });
      await loadRules();
      toast({
        title: currentState ? 'Правило отключено' : 'Правило активировано',
        description: 'Изменения сохранены'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить состояние правила',
        variant: 'destructive'
      });
      throw error;
    }
  }, [loadRules, toast]);

  // Delete rule
  const removeRule = useCallback(async (ruleId: string) => {
    try {
      await deleteNotificationRule(ruleId);
      await loadRules();
      toast({
        title: 'Правило удалено',
        description: 'Правило успешно удалено'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить правило',
        variant: 'destructive'
      });
      throw error;
    }
  }, [loadRules, toast]);

  // Create or update rule
  const saveRule = useCallback(async (ruleData: Partial<NotificationRule>, isEdit: boolean = false) => {
    try {
      if (isEdit && ruleData.id) {
        await updateNotificationRule(ruleData.id, ruleData);
        toast({
          title: 'Правило обновлено',
          description: 'Изменения сохранены'
        });
      } else {
        await createNotificationRule(ruleData);
        toast({
          title: 'Правило создано',
          description: 'Новое правило успешно создано'
        });
      }
      await loadRules();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить правило',
        variant: 'destructive'
      });
      throw error;
    }
  }, [loadRules, toast]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await Promise.all([loadActiveNotifications(), loadHistoryNotifications()]);
      toast({
        title: 'Уведомление прочитано',
        description: 'Статус обновлен'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive'
      });
      throw error;
    }
  }, [loadActiveNotifications, loadHistoryNotifications, toast]);

  return {
    // State
    rules,
    activeNotifications,
    historyNotifications,
    loading,
    refreshing,

    // Actions
    loadRules,
    loadActiveNotifications,
    loadHistoryNotifications,
    loadAll,
    toggleRule,
    removeRule,
    saveRule,
    markAsRead
  };
}
