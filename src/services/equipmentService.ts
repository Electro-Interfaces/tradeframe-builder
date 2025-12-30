/**
 * Сервис для работы с терминальным оборудованием через Backend Proxy
 * Использует только STS API через proxy для получения реальных данных
 */

import { stsProxyClient } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
import type {
  TerminalInfo,
  TerminalEquipmentItem,
  RestartTerminalResult
} from '@/types/equipment';

class EquipmentService {
  /**
   * Получение информации о терминальном оборудовании через Backend Proxy
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

    // Вызываем STS API через Backend Proxy
    const terminalInfo = await stsProxyClient.get<TerminalInfo>('/v1/info', {
      system: networkId,
      station: tradingPoint.external_id
    });

    if (!terminalInfo) {
      throw new Error('STS API не вернул данных о терминале');
    }

    return terminalInfo;
  }

  /**
   * Проверка, прошло ли более 15 минут с последнего обновления
   */
  private isOfflineByTime(lastUpdate?: string): boolean {
    if (!lastUpdate) return true;

    const lastUpdateTime = new Date(lastUpdate).getTime();
    const now = Date.now();
    const fifteenMinutesMs = 15 * 60 * 1000; // 15 минут в миллисекундах

    return (now - lastUpdateTime) > fifteenMinutesMs;
  }

  /**
   * Преобразование данных из TerminalInfo в формат для отображения
   * @param info - информация о терминале
   * @param stationName - название станции из селектора (опционально)
   */
  mapTerminalInfoToEquipment(info: TerminalInfo, stationName?: string): TerminalEquipmentItem[] {
    const equipment: TerminalEquipmentItem[] = [];

    // Проверяем offline по времени (более 15 минут без связи)
    const isOffline = this.isOfflineByTime(info.pos.lastUpdate);
    const terminalStatus = isOffline ? 'offline' : info.terminal.status;

    // Станция (основной терминал) - offline если нет связи более 15 минут
    const stationCode = stationName || info.terminal.name || 'АЗС';
    const shiftInfo = info.shift ? `№${info.shift.number}` : '';
    // Объединяем название станции и номер смены в одну строку (компактно для mobile)
    const stationDisplay = shiftInfo ? `${stationCode} • ${shiftInfo}` : stationCode;
    equipment.push({
      id: 'station',
      name: 'Станция',
      code: stationDisplay,
      location: '',
      status: terminalStatus,
      statusText: terminalStatus === 'online' ? 'Онлайн' : 'Офлайн',
      lastUpdate: info.pos.lastUpdate
    });

    // POS терминал
    equipment.push({
      id: 'pos',
      name: 'POS',
      code: info.pos.version || 'POS 1',
      location: '',
      status: isOffline ? 'offline' : info.pos.status,
      statusText: isOffline ? 'Офлайн' : (info.pos.status === 'online' ? 'Онлайн' : 'Офлайн'),
      lastUpdate: info.pos.lastUpdate
    });

    // ККТ - Фискальный регистратор
    const cashSum = info.pos.cashSum || 0;
    const bankSum = info.pos.bankSum || 0;
    const hasUnpunchedReceipts = cashSum !== 0 || bankSum !== 0;
    const isEmergencyMode = info.devices?.fiscalRegister?.isEmergencyMode || false;
    const fiscalStatus = info.devices?.fiscalRegister?.status || 'offline';

    equipment.push({
      id: 'fiscal-register',
      name: 'ККТ',
      code: hasUnpunchedReceipts ? 'Есть чеки!' : 'Фиск. регистратор',
      location: '',
      status: isEmergencyMode ? 'error' : (fiscalStatus === 'online' ? 'online' : 'offline'),
      statusText: isEmergencyMode ? 'Авария' : (fiscalStatus === 'online' ? 'ОК' : 'Ошибка'),
      hasUnpunchedReceipts,
      cashSum,
      bankSum,
      isEmergencyMode,
      lastUpdate: info.pos.lastUpdate
    });

    // Картридер (считыватель топливных карт) - сразу после ККТ
    if (info.devices?.cardReader) {
      equipment.push({
        id: 'card-reader',
        name: 'Картридер',
        code: 'Топливные карты',
        location: '',
        status: info.devices.cardReader.status,
        statusText: info.devices.cardReader.status === 'online' ? 'ОК' : 'Ошибка'
      });
    }

    // МПС-ридер - сразу после Картридера
    if (info.devices?.mpsReader) {
      equipment.push({
        id: 'mps-reader',
        name: 'МПС',
        code: 'Банк. карты и СБП',
        location: '',
        status: info.devices.mpsReader.status,
        statusText: info.devices.mpsReader.status === 'online' ? 'ОК' : 'Ошибка'
      });
    }

    // QR (на основе статуса смены)
    equipment.push({
      id: 'qr',
      name: 'QR',
      code: 'Штрих коды',
      location: '',
      status: info.shift?.state === 'Открытая' ? 'online' : 'offline',
      statusText: info.shift?.state === 'Открытая' ? 'Активен' : 'Неактивен'
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

    return equipment;
  }

  /**
   * Перезагрузка терминала через Backend Proxy
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

    // Вызываем STS API через Backend Proxy
    const result = await stsProxyClient.post<RestartTerminalResult>('/v1/control/restart', {}, {
      system: networkId,
      station: tradingPoint.external_id
    });

    return result;
  }
}

// Экспортируем единственный экземпляр сервиса
export const equipmentService = new EquipmentService();
