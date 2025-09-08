/**
 * Equipment Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с equipmentSupabase
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './equipmentSupabase';

// Для обратной совместимости экспортируем основной сервис
import { equipmentSupabaseService } from './equipmentSupabase';
export const equipmentService = equipmentSupabaseService;

// Экспортируем currentEquipmentAPI из apiSwitch
export { currentEquipmentAPI } from './apiSwitch';

// Типы для компонентов здоровья
export type ComponentHealthStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface ComponentHealth {
  aggregatedStatus: ComponentHealthStatus;
  componentCount: number;
  statusBreakdown: Record<string, number>;
}

// Функция для получения здоровья компонентов оборудования
export const getEquipmentComponentsHealth = async (equipmentId: string): Promise<ComponentHealth> => {
  try {
    // Получаем компоненты оборудования через API
    const { currentComponentsAPI } = await import('./components');
    const response = await currentComponentsAPI.list({ equipment_id: equipmentId });
    const components = response.data || [];

    if (components.length === 0) {
      return {
        aggregatedStatus: 'offline',
        componentCount: 0,
        statusBreakdown: {}
      };
    }

    // Подсчет статусов компонентов
    const statusBreakdown: Record<string, number> = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    components.forEach(component => {
      const status = component.status || 'offline';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      
      switch (status) {
        case 'healthy':
        case 'active':
        case 'online':
          healthyCount++;
          break;
        case 'warning':
        case 'degraded':
          warningCount++;
          break;
        case 'critical':
        case 'error':
        case 'failed':
          criticalCount++;
          break;
        default:
          offlineCount++;
          break;
      }
    });

    // Определяем агрегированный статус
    let aggregatedStatus: ComponentHealthStatus = 'healthy';
    if (criticalCount > 0) {
      aggregatedStatus = 'critical';
    } else if (warningCount > 0) {
      aggregatedStatus = 'warning';
    } else if (offlineCount === components.length) {
      aggregatedStatus = 'offline';
    } else if (healthyCount > 0) {
      aggregatedStatus = 'healthy';
    } else {
      aggregatedStatus = 'offline';
    }

    return {
      aggregatedStatus,
      componentCount: components.length,
      statusBreakdown
    };

  } catch (error) {
    console.warn(`Failed to get component health for equipment ${equipmentId}:`, error);
    return {
      aggregatedStatus: 'offline',
      componentCount: 0,
      statusBreakdown: {}
    };
  }
};