import { useState, useEffect, useRef } from 'react';

interface EngagementMetrics {
  timeSpent: number;
  interactions: number;
  scrollEvents: number;
  pageViews: number;
  isEngaged: boolean;
}

/**
 * Hook для отслеживания активности пользователя
 * Chrome требует достаточного engagement перед показом beforeinstallprompt
 */
export const useEngagementTracker = () => {
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    timeSpent: 0,
    interactions: 0,
    scrollEvents: 0,
    pageViews: 1,
    isEngaged: false
  });

  const startTime = useRef<number>(Date.now());
  const lastActivity = useRef<number>(Date.now());
  const interactionTimer = useRef<NodeJS.Timeout | null>(null);

  // Определяем достаточный engagement на основе Chrome критериев
  const isEngagementSufficient = (m: EngagementMetrics): boolean => {
    const MIN_TIME_SECONDS = 30; // 30 секунд минимум
    const MIN_INTERACTIONS = 5;   // 5 взаимодействий минимум

    return (
      m.timeSpent >= MIN_TIME_SECONDS &&
      m.interactions >= MIN_INTERACTIONS &&
      m.scrollEvents >= 2 // пользователь должен хотя бы немного поскролить
    );
  };

  useEffect(() => {

    // Обновляем время каждую секунду
    const timeTracker = setInterval(() => {
      const currentTime = Date.now();
      const timeSpent = Math.floor((currentTime - startTime.current) / 1000);

      setMetrics(prev => {
        const newMetrics = { ...prev, timeSpent };
        const nowEngaged = isEngagementSufficient(newMetrics);

        if (!wasEngaged && nowEngaged) {
        }

        return { ...newMetrics, isEngaged: nowEngaged };
      });
    }, 1000);

    // Отслеживаем клики, тапы, нажатия клавиш
    const handleInteraction = (event: Event) => {
      lastActivity.current = Date.now();

      setMetrics(prev => ({
        ...prev,
        interactions: prev.interactions + 1
      }));
    };

    // Отслеживаем скролл
    const handleScroll = () => {
      setMetrics(prev => ({
        ...prev,
        scrollEvents: prev.scrollEvents + 1
      }));
    };

    // Отслеживаем изменения страниц
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setMetrics(prev => ({
          ...prev,
          pageViews: prev.pageViews + 1
        }));
      }
    };

    // Отслеживаем движения мыши для определения активности
    const handleMouseMove = () => {
      lastActivity.current = Date.now();
    };

    // События для отслеживания
    const interactionEvents = ['click', 'touchstart', 'keydown'];

    interactionEvents.forEach(event => {
      document.addEventListener(event, handleInteraction, { passive: true });
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      clearInterval(timeTracker);
      if (interactionTimer.current) {
        clearTimeout(interactionTimer.current);
      }

      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });

      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleMouseMove);

    };
  }, []);

  // Метод для принудительного увеличения engagement (для тестирования)
  const boostEngagement = () => {

    setMetrics(prev => ({
      timeSpent: Math.max(prev.timeSpent, 31),
      interactions: Math.max(prev.interactions, 6),
      scrollEvents: Math.max(prev.scrollEvents, 3),
      pageViews: prev.pageViews,
      isEngaged: true
    }));
  };

  // Проверяем активность пользователя (не AFK)
  const isUserActive = (): boolean => {
    const timeSinceLastActivity = Date.now() - lastActivity.current;
    return timeSinceLastActivity < 30000; // 30 секунд без активности = AFK
  };

  return {
    metrics,
    isEngagementSufficient: isEngagementSufficient(metrics),
    isUserActive: isUserActive(),
    boostEngagement // для отладки
  };
};