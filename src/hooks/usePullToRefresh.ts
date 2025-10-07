/**
 * Хук для Pull-to-Refresh функциональности
 * Извлечен из компонента для переиспользования
 */

import { useState, useRef, useEffect } from 'react';

type PullState = 'idle' | 'pulling' | 'canRefresh' | 'refreshing';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  pullThreshold?: number;
  maxPullDistance?: number;
  indicatorAppearThreshold?: number;
}

interface UsePullToRefreshReturn {
  pullState: PullState;
  pullDistance: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

/**
 * Хук для реализации pull-to-refresh
 */
export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const {
    onRefresh,
    enabled = true,
    pullThreshold = 80,
    maxPullDistance = 120,
    indicatorAppearThreshold = 30
  } = options;

  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTouchRef = useRef<{ y: number; time: number } | null>(null);
  const rafId = useRef<number | null>(null);

  /**
   * Вибрация на поддерживаемых устройствах
   */
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && enabled) {
      navigator.vibrate(50);
    }
  };

  /**
   * Плавное обновление расстояния с throttling через RAF
   */
  const updatePullDistance = (distance: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const clampedDistance = Math.min(distance, maxPullDistance);
      setPullDistance(clampedDistance);

      if (clampedDistance >= pullThreshold && pullState !== 'canRefresh' && pullState !== 'refreshing') {
        setPullState('canRefresh');
        triggerHapticFeedback();
      } else if (clampedDistance < pullThreshold && pullState === 'canRefresh') {
        setPullState('pulling');
      }
    });
  };

  /**
   * Сброс состояния
   */
  const resetPull = () => {
    setPullState('idle');
    setPullDistance(0);
    startTouchRef.current = null;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  /**
   * Начало касания
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    startTouchRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
    setPullState('pulling');
  };

  /**
   * Движение пальца
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled || !startTouchRef.current || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startTouchRef.current.y;

    // Только если движение вниз и мы в верху страницы
    if (deltaY > 0 && container.scrollTop === 0) {
      e.preventDefault();

      // Применяем эластичность (чем больше тянем, тем медленнее)
      const elasticity = Math.max(0.5, 1 - (deltaY / maxPullDistance) * 0.5);
      const adjustedDistance = deltaY * elasticity;

      updatePullDistance(adjustedDistance);
    } else if (deltaY <= 0 || container.scrollTop > 0) {
      // Сбрасываем если движение вверх или начался скролл
      resetPull();
    }
  };

  /**
   * Конец касания
   */
  const handleTouchEnd = async () => {
    if (!enabled || !startTouchRef.current) return;

    const shouldRefresh = pullState === 'canRefresh';

    if (shouldRefresh) {
      setPullState('refreshing');
      triggerHapticFeedback();

      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          resetPull();
        }, 300);
      }
    } else {
      resetPull();
    }
  };

  // Cleanup RAF при размонтировании компонента
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return {
    pullState,
    pullDistance,
    scrollContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
