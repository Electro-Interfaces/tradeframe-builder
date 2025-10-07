/**
 * Сервис для работы с терминальным оборудованием
 * Использует только STS API для получения реальных данных
 */

import { stsApiService } from './stsApi';
import { tradingPointsService } from './tradingPointsService';
import type {
  TerminalInfo,
  TerminalEquipmentItem,
  RestartTerminalResult
} from '@/types/equipment';

class EquipmentService {
  /**
   * Получение информации о терминальном оборудовании
   */
  async getTerminalInfo(networkId: string, tradingPointId: string): Promise<TerminalInfo> {
    // Валидация параметров
    if (!networkId || !tradingPointId) {
      throw new Error('Не указаны сеть или торговая точка');
    }

    // Получаем торговую точку для external_id
    const tradingPoint = await tradingPointsService.getById(tradingPointId);
    if (!tradingPoint) {
      throw new Error('Торговая точка не найдена в системе');
    }

    if (!tradingPoint.external_id) {
      throw new Error('У торговой точки не указан external_id для API');
    }

    // Вызываем STS API
    const terminalInfo = await stsApiService.getTerminalInfo({
      networkId: networkId,
      tradingPointId: tradingPoint.external_id
    });

    if (!terminalInfo) {
      throw new Error('STS API не вернул данных о терминале');
    }

    return terminalInfo;
  }

  /**
   * Преобразование данных из TerminalInfo в формат для отображения
   */
  mapTerminalInfoToEquipment(info: TerminalInfo): TerminalEquipmentItem[] {
    const equipment: TerminalEquipmentItem[] = [];

    // АЗС (основной терминал)
    equipment.push({
      id: 'azs',
      name: 'АЗС',
      code: info.terminal.name || 'АЗС',
      location: '',
      status: info.terminal.status,
      statusText: info.terminal.status === 'online' ? 'Онлайн' : 'Офлайн'
    });

    // POS терминал
    equipment.push({
      id: 'pos',
      name: 'POS',
      code: info.pos.version || 'POS 1',
      location: '',
      status: info.pos.status,
      statusText: info.pos.status === 'online' ? 'Онлайн' : 'Офлайн'
    });

    // QR (на основе статуса смены)
    equipment.push({
      id: 'qr',
      name: 'QR',
      code: 'Готов',
      location: info.shift ? `Смена №${info.shift.number}` : '',
      status: info.shift?.state === 'Открытая' ? 'online' : 'offline',
      statusText: 'Готов'
    });

    // Купюроприемник с данными о купюрах
    if (info.devices?.billAcceptor) {
      const deviceStatus = info.devices.billAcceptor.status;
      const isOnline = deviceStatus === 'online';

      equipment.push({
        id: 'bill-acceptor',
        name: 'Купюроприемник',
        code: `ID: ${info.devices.billAcceptor.name}`,
        location: `Устройство ${info.devices.billAcceptor.name}`,
        status: deviceStatus,
        statusText: isOnline ? 'Готов' : 'Ошибка',
        billCount: info.devices.billAcceptor.billCount,
        billAmount: info.devices.billAcceptor.billAmount
      });
    }

    // Картридер
    if (info.devices?.cardReader) {
      equipment.push({
        id: 'card-reader',
        name: 'Картридер',
        code: info.devices.cardReader.status === 'online' ? 'Готов' : 'Ошибка',
        location: `ID: ${info.devices.cardReader.name}`,
        status: info.devices.cardReader.status,
        statusText: info.devices.cardReader.status === 'online' ? 'Готов' : 'Ошибка'
      });
    }

    // МПС-ридер
    if (info.devices?.mpsReader) {
      equipment.push({
        id: 'mps-reader',
        name: 'МПС-ридер',
        code: info.devices.mpsReader.status === 'online' ? 'Готов' : 'Ошибка',
        location: `ID: ${info.devices.mpsReader.name}`,
        status: info.devices.mpsReader.status,
        statusText: info.devices.mpsReader.status === 'online' ? 'Готов' : 'Ошибка'
      });
    }

    return equipment;
  }

  /**
   * Перезагрузка терминала
   */
  async restartTerminal(networkId: string, tradingPointId: string): Promise<RestartTerminalResult> {
    // Валидация параметров
    if (!networkId || !tradingPointId) {
      throw new Error('Не указаны сеть или торговая точка для перезагрузки');
    }

    // Получаем торговую точку для external_id
    const tradingPoint = await tradingPointsService.getById(tradingPointId);
    if (!tradingPoint) {
      throw new Error('Торговая точка не найдена в системе');
    }

    if (!tradingPoint.external_id) {
      throw new Error('У торговой точки не указан external_id для API');
    }

    // Вызываем STS API
    const result = await stsApiService.restartTerminal({
      networkId: networkId,
      tradingPointId: tradingPoint.external_id
    });

    return result;
  }
}

// Экспортируем единственный экземпляр сервиса
export const equipmentService = new EquipmentService();
