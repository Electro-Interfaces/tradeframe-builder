/**
 * Индикатор Pull-to-Refresh
 * Переиспользуемый компонент для отображения состояния pull-to-refresh
 */

import { RefreshCw } from 'lucide-react';
import { PULL_TO_REFRESH_CONFIG } from '@/config/pullToRefresh';

type PullState = 'idle' | 'pulling' | 'canRefresh' | 'refreshing';

interface PullToRefreshIndicatorProps {
  pullState: PullState;
  pullDistance: number;
}

export function PullToRefreshIndicator({ pullState, pullDistance }: PullToRefreshIndicatorProps) {
  if (pullState === 'idle' || pullDistance < PULL_TO_REFRESH_CONFIG.INDICATOR_APPEAR_THRESHOLD) {
    return null;
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
      style={{
        transform: ,
        opacity: Math.min(1, (pullDistance - PULL_TO_REFRESH_CONFIG.INDICATOR_APPEAR_THRESHOLD) / 40)
      }}
    >
      <div className="bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-2">
        {pullState === 'refreshing' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Обновление...</span>
          </>
        ) : pullState === 'canRefresh' ? (
          <>
            <RefreshCw className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Отпустите для обновления</span>
          </>
        ) : (
          <>
            <RefreshCw
              className="w-4 h-4 text-slate-500"
              style={{ transform:  }}
            />
            <span className="text-sm font-medium">Потяните для обновления</span>
          </>
        )}
      </div>
    </div>
  );
}
