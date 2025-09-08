import { Equipment } from '@/types/equipment';
import { Component } from '@/types/component';
import { currentEquipmentAPI } from '@/services/equipment';
import { currentComponentsAPI } from '@/services/components';

// Интерфейсы для данных, получаемых от торгового API
export interface TradingPointApiEquipment {
  id?: string;
  name: string;
  type: string;
  serial_number: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  system_type: string;
  location?: string;
  installation_date?: string;
  components?: TradingPointApiComponent[];
}

export interface TradingPointApiComponent {
  id?: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error' | 'disabled' | 'archived';
  serial_number?: string;
  model?: string;
  location?: string;
}

export interface TradingPointScanResult {
  success: boolean;
  equipment_found: TradingPointApiEquipment[];
  components_found: TradingPointApiComponent[];
  errors?: string[];
  scan_timestamp: string;
  trading_point_id: string;
}

// Сервис для опроса торговой точки
class TradingPointScanService {
  
  /**
   * Опрашивает торговую точку через торговое API
   */
  async scanTradingPoint(tradingPointId: string): Promise<TradingPointScanResult> {
    console.log(`Начинаем сканирование торговой точки: ${tradingPointId}`);
    
    try {
      // Симуляция API запроса к торговому API торговой точки
      await this.delay(1500);

      // ❌ Mock сканирование удалено - нужна реальная интеграция с API торговой сети
      throw new Error('Сканирование торговых точек требует настройки реального API в разделе "Обмен данными"');
      
    } catch (error) {
      console.error('Ошибка при сканировании торговой точки:', error);
      return {
        success: false,
        equipment_found: [],
        components_found: [],
        errors: ['Не удалось подключиться к торговому API'],
        scan_timestamp: new Date().toISOString(),
        trading_point_id: tradingPointId
      };
    }
  }

  /**
   * Добавляет найденное оборудование к торговой точке
   */
  async addDiscoveredEquipment(
    tradingPointId: string, 
    discoveredEquipment: TradingPointApiEquipment[]
  ): Promise<{ added: Equipment[], errors: string[] }> {
    const addedEquipment: Equipment[] = [];
    const errors: string[] = [];

    for (const equipmentData of discoveredEquipment) {
      try {
        // Создаем оборудование на основе найденных данных
        const newEquipment = await currentEquipmentAPI.create({
          trading_point_id: tradingPointId,
          template_id: this.getTemplateIdBySystemType(equipmentData.system_type),
          display_name: equipmentData.name,
          serial_number: equipmentData.serial_number,
          external_id: `DISCOVERED_${equipmentData.serial_number}`,
          status: equipmentData.status,
          installation_date: equipmentData.installation_date || new Date().toISOString(),
          params: {
            discovered_via_api: true,
            scan_timestamp: new Date().toISOString(),
            original_api_data: equipmentData
          }
        });

        addedEquipment.push(newEquipment);
        
        // Добавляем компоненты к оборудованию
        if (equipmentData.components?.length) {
          await this.addDiscoveredComponents(newEquipment.id, equipmentData.components);
        }

      } catch (error: any) {
        errors.push(`Не удалось добавить оборудование "${equipmentData.name}": ${error.message}`);
      }
    }

    return { added: addedEquipment, errors };
  }

  /**
   * Добавляет найденные компоненты к оборудованию
   */
  private async addDiscoveredComponents(
    equipmentId: string, 
    discoveredComponents: TradingPointApiComponent[]
  ): Promise<{ added: Component[], errors: string[] }> {
    const addedComponents: Component[] = [];
    const errors: string[] = [];

    for (const componentData of discoveredComponents) {
      try {
        const newComponent = await currentComponentsAPI.create({
          equipment_id: equipmentId,
          template_id: this.getComponentTemplateIdByType(componentData.type),
          display_name: componentData.name,
          serial_number: componentData.serial_number || `DISC_${Date.now()}`,
          status: componentData.status,
          params: {
            discovered_via_api: true,
            scan_timestamp: new Date().toISOString(),
            original_api_data: componentData
          }
        });

        addedComponents.push(newComponent);

      } catch (error: any) {
        errors.push(`Не удалось добавить компонент "${componentData.name}": ${error.message}`);
      }
    }

    return { added: addedComponents, errors };
  }

  /**
   * ❌ Mock генерация удалена - реальные данные через API
   */
  private generateMockScanResults(tradingPointId: string): TradingPointScanResult {
    throw new Error('Мок данные удалены - используйте реальное API');
  }

  /**
   * Получает ID шаблона оборудования по системному типу
   */
  private getTemplateIdBySystemType(systemType: string): string {
    const typeMapping: Record<string, string> = {
      'self_service_terminal': '2',
      'fuel_tank': '1', 
      'control_system': '3',
      'price_display': '4',
      'surveillance': '5',
      'audio_system': '6'
    };
    
    return typeMapping[systemType] || '1'; // По умолчанию резервуар
  }

  /**
   * Получает ID шаблона компонента по типу
   */
  private getComponentTemplateIdByType(componentType: string): string {
    const typeMapping: Record<string, string> = {
      'PAYMENT': '2', // Картридер банковских карт
      'PRINTER': '3', // Компонент принтера (нужно создать)
      'DISPLAY': '4', // Компонент дисплея (нужно создать) 
      'SENSOR': '1', // Датчик уровня
      'INTERFACE': '5' // Сенсорный экран
    };
    
    return typeMapping[componentType] || '1'; // По умолчанию датчик
  }

  /**
   * Утилита для задержки
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Экспортируем экземпляр сервиса
export const tradingPointScanService = new TradingPointScanService();