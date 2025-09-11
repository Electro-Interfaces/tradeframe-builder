/**
 * React хук для удобной работы с улучшенным Supabase клиентом
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabase/client';
import { CacheUtils } from '@/lib/supabase/queryClient';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface SupabaseStatus {
  isInitialized: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  latency: number | null;
}

export function useSupabase() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [status, setStatus] = useState<SupabaseStatus>({
    isInitialized: false,
    isConnected: false,
    isLoading: true,
    error: null,
    latency: null
  });

  // Инициализация
  const initialize = async () => {
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const initialized = await supabaseClient.initialize();
      
      if (initialized) {
        const startTime = Date.now();
        const connectionTest = await supabaseClient.testConnection();
        const latency = Date.now() - startTime;

        setStatus({
          isInitialized: true,
          isConnected: connectionTest.success,
          isLoading: false,
          error: connectionTest.success ? null : connectionTest.error || null,
          latency: connectionTest.success ? latency : null
        });

        if (connectionTest.success) {
          // Предзагружаем критические данные
          await CacheUtils.prefetchCriticalData();
          
          if (!isMobile) {
            toast({
              title: "✅ Supabase подключен",
              description: `Соединение установлено (${latency}ms)`,
            });
          }
        } else {
          if (!isMobile) {
            toast({
              title: "❌ Ошибка подключения Supabase",
              description: connectionTest.error || "Неизвестная ошибка",
              variant: "destructive",
            });
          }
        }
      } else {
        setStatus({
          isInitialized: false,
          isConnected: false,
          isLoading: false,
          error: 'Настройки подключения не найдены',
          latency: null
        });
      }
    } catch (error: any) {
      setStatus({
        isInitialized: false,
        isConnected: false,
        isLoading: false,
        error: error.message,
        latency: null
      });

      toast({
        title: "❌ Критическая ошибка Supabase",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Переподключение
  const reconnect = async () => {
    await initialize();
  };

  // Проверка соединения
  const checkConnection = async (): Promise<boolean> => {
    try {
      const startTime = Date.now();
      const result = await supabaseClient.testConnection();
      const latency = Date.now() - startTime;

      setStatus(prev => ({
        ...prev,
        isConnected: result.success,
        error: result.success ? null : result.error || null,
        latency: result.success ? latency : null
      }));

      return result.success;
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: error.message,
        latency: null
      }));
      return false;
    }
  };

  // Очистка кэша
  const clearCache = () => {
    CacheUtils.clearAll();
    toast({
      title: "🧹 Кэш очищен",
      description: "Все кешированные данные удалены",
    });
  };

  // Автоматическая инициализация при монтировании
  useEffect(() => {
    initialize();
  }, []);

  // Периодическая проверка соединения
  useEffect(() => {
    if (!status.isInitialized) return;

    const interval = setInterval(async () => {
      await checkConnection();
    }, 60000); // Проверяем каждую минуту

    return () => clearInterval(interval);
  }, [status.isInitialized]);

  return {
    status,
    initialize,
    reconnect,
    checkConnection,
    clearCache,
    client: supabaseClient,
    
    // Утилиты для React Query
    invalidateUsers: CacheUtils.invalidateUsers,
    invalidateRoles: CacheUtils.invalidateRoles,
    invalidatePrices: CacheUtils.invalidatePrices,
    invalidateEquipment: CacheUtils.invalidateEquipment,
  };
}