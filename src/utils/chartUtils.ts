/**
 * Утилиты для работы с графиками Chart.js
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartConfiguration,
  ChartType
} from 'chart.js';

/**
 * Создает canvas с графиком и возвращает его в виде Data URL
 *
 * @param type - Тип графика (bar, line, pie и т.д.)
 * @param data - Данные для графика
 * @param options - Опции графика
 * @returns Promise с Data URL изображения графика
 */
export function createChartCanvas(
  type: ChartType,
  data: ChartConfiguration['data'],
  options: ChartConfiguration['options']
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;

      // Регистрируем необходимые компоненты Chart.js
      ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        LineElement,
        PointElement,
        ArcElement,
        Title,
        Tooltip,
        Legend,
        TimeScale
      );

      const chart = new ChartJS(canvas.getContext('2d')!, {
        type,
        data,
        options: {
          ...options,
          animation: false,
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            ...options?.plugins,
            legend: {
              ...(options?.plugins?.legend as any),
              labels: {
                color: '#ffffff',
                font: { size: 12 }
              }
            }
          },
          scales: options?.scales
            ? {
                ...options.scales,
                x: options.scales.x
                  ? {
                      ...options.scales.x,
                      ticks: { color: '#ffffff', font: { size: 10 } },
                      grid: { color: '#374151' }
                    }
                  : undefined,
                y: options.scales.y
                  ? {
                      ...options.scales.y,
                      ticks: { color: '#ffffff', font: { size: 10 } },
                      grid: { color: '#374151' }
                    }
                  : undefined
              }
            : undefined
        }
      });

      setTimeout(() => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          chart.destroy();
          resolve(dataUrl);
        } catch (error) {
          chart.destroy();
          // Возвращаем пустое изображение 1x1 в случае ошибки
          resolve(
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          );
        }
      }, 200);
    } catch (error) {
      // Возвращаем пустое изображение 1x1 в случае ошибки
      resolve(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      );
    }
  });
}
