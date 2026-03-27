/**
 * Настроенный QueryClient для оптимальной работы с PostgreSQL
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

// Конфигурация кэширования
const CACHE_TIMES = {
  SHORT: 30 * 1000,      // 30 секунд - для часто изменяемых данных
  MEDIUM: 5 * 60 * 1000, // 5 минут - для стандартных данных
  LONG: 30 * 60 * 1000,  // 30 минут - для редко изменяемых данных
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 часа - для справочников
};

const STALE_TIMES = {
  SHORT: 10 * 1000,      // 10 секунд
  MEDIUM: 60 * 1000,     // 1 минута
  LONG: 5 * 60 * 1000,   // 5 минут
  VERY_LONG: 60 * 60 * 1000, // 1 час
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Не показываем ошибки авторизации — они обрабатываются AuthContext
      if (error?.status === 401 || error?.status === 403) {
        return;
      }

      console.error(`❌ Query error for ${query.queryKey}:`, error);

      // Показываем toast только для важных ошибок
      if (query.meta?.showErrorToast !== false) {
        toast({
          title: "Ошибка загрузки данных",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    }
  }),
  
  mutationCache: new MutationCache({
    onError: (error: any, variables, context, mutation) => {
      console.error('❌ Mutation error:', error);
      
      if (mutation.meta?.showErrorToast !== false) {
        toast({
          title: "Ошибка выполнения операции",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    onSuccess: (data, variables, context, mutation) => {
      if (mutation.meta?.showSuccessToast) {
        toast({
          title: "Операция выполнена успешно",
          description: mutation.meta.successMessage as string || "Данные обновлены",
        });
      }
    }
  }),

  defaultOptions: {
    queries: {
      // Основные настройки кэширования
      staleTime: STALE_TIMES.MEDIUM,
      gcTime: CACHE_TIMES.LONG, // было cacheTime в v4
      
      // Retry стратегии
      retry: (failureCount, error: any) => {
        // Для 401 ошибок даем ОДИН шанс на повторную попытку
        // (токен может обновиться автоматически на уровне HTTP клиента)
        if (error?.status === 401) {
          return failureCount < 1; // Один retry для 401
        }

        // Для 408 (Request Timeout) тоже даем шанс
        if (error?.status === 408 || error?.isTimeout) {
          return failureCount < 2; // Два retry для timeout
        }

        // Не повторяем для других клиентских ошибок (403, 404, 422 и т.д.)
        if (error?.status === 403) return false;
        if (error?.status >= 400 && error?.status < 500) return false;

        // Повторяем до 3 раз для сетевых ошибок (5xx, network errors)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Оптимизация производительности
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      
      // Дедупликация одинаковых запросов
      structuralSharing: true,
    },
    
    mutations: {
      retry: (failureCount, error: any) => {
        // Не повторяем мутации для избежания дублирования данных
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Утилита для определения человекочитаемого сообщения об ошибке
function getErrorMessage(error: any): string {
  if (error?.message) {
    // Переводим стандартные ошибки БД
    const translations: Record<string, string> = {
      'fetch failed': 'Проблемы с подключением к серверу',
      'timeout': 'Превышено время ожидания',
      'network error': 'Ошибка сети',
      'unauthorized': 'Нет доступа к данным',
      'forbidden': 'Недостаточно прав',
      'not found': 'Данные не найдены',
      'duplicate key': 'Данные уже существуют',
      'foreign key': 'Нарушена целостность данных',
    };

    const message = error.message.toLowerCase();
    for (const [key, translation] of Object.entries(translations)) {
      if (message.includes(key)) {
        return translation;
      }
    }
  }

  return error?.message || 'Произошла неизвестная ошибка';
}

// Предустановленные конфигурации для разных типов данных
export const QueryConfigs = {
  // Для пользователей (средняя частота изменений)
  users: {
    staleTime: STALE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
  },

  // Для ролей (редко изменяются, но должны обновляться при смене прав)
  roles: {
    staleTime: STALE_TIMES.MEDIUM, // 1 мин (было 5 мин) — быстрее подхватывает смену прав
    gcTime: CACHE_TIMES.MEDIUM,    // 5 мин (было 30 мин)
    refetchOnWindowFocus: false,
  },

  // Для цен (изменяются несколько раз в день, не каждые 10 сек)
  prices: {
    staleTime: STALE_TIMES.MEDIUM, // 1 мин (было 10 сек) — цены меняются редко
    gcTime: CACHE_TIMES.MEDIUM,    // 5 мин (было 30 сек)
    refetchOnWindowFocus: true,
  },

  // Для оборудования (средняя частота изменений)
  equipment: {
    staleTime: STALE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM,
    refetchOnWindowFocus: false,
  },

  // Для справочников (очень редко изменяются)
  references: {
    staleTime: STALE_TIMES.VERY_LONG,
    gcTime: CACHE_TIMES.VERY_LONG,
    refetchOnWindowFocus: false,
  },

  // Для real-time данных
  realtime: {
    staleTime: 0,
    gcTime: CACHE_TIMES.SHORT,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Обновление каждые 30 сек
  },
};

// Утилиты для инвалидации кэша
export const CacheUtils = {
  // Инвалидация всех пользователей
  invalidateUsers: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['external-users'] });
  },

  // Инвалидация всех ролей
  invalidateRoles: () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    queryClient.invalidateQueries({ queryKey: ['external-roles'] });
  },

  // Инвалидация цен
  invalidatePrices: () => {
    queryClient.invalidateQueries({ queryKey: ['prices'] });
  },

  // Инвалидация оборудования
  invalidateEquipment: () => {
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  },

  // Полная очистка кэша
  clearAll: () => {
    queryClient.clear();
  },

  // Предзагрузка важных данных
  prefetchCriticalData: async () => {
    try {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['external-users'],
          staleTime: STALE_TIMES.MEDIUM,
        }),
        queryClient.prefetchQuery({
          queryKey: ['external-roles'],
          staleTime: STALE_TIMES.LONG,
        }),
      ]);
    } catch (error) {
      // Failed to prefetch critical data
    }
  },
};
