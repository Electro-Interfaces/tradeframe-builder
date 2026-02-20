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
   * Получить самый свежий lastUpdate из всех постов
   */
  private getLatestPosUpdate(pos: TerminalInfo['pos']): string | undefined {
    return pos.reduce<string | undefined>((latest, p) => {
      if (!p.lastUpdate) return latest;
      if (!latest) return p.lastUpdate;
      return new Date(p.lastUpdate) > new Date(latest) ? p.lastUpdate : latest;
    }, undefined);
  }

  /**
   * Генерирует элементы оборудования для одного поста
   */
  private mapPosDevicesToEquipment(
    pos: TerminalInfo['pos'][0],
    isOffline: boolean,
    suffix: string,
    posNumber?: number
  ): TerminalEquipmentItem[] {
    const items: TerminalEquipmentItem[] = [];

    // POS терминал
    items.push({
      id: `pos${suffix}`,
      name: 'POS',
      code: pos.version || `POS ${pos.number}`,
      location: '',
      status: isOffline ? 'offline' : pos.status,
      statusText: isOffline ? 'Офлайн' : (pos.status === 'online' ? 'Онлайн' : 'Офлайн'),
      lastUpdate: pos.lastUpdate,
      posNumber
    });

    // ККТ - Фискальный регистратор
    const cashSum = pos.cashSum || 0;
    const bankSum = pos.bankSum || 0;
    const hasUnpunchedReceipts = cashSum !== 0 || bankSum !== 0;
    const isEmergencyMode = pos.devices?.fiscalRegister?.isEmergencyMode || false;
    const fiscalStatus = pos.devices?.fiscalRegister?.status || 'offline';

    items.push({
      id: `fiscal-register${suffix}`,
      name: 'ККТ',
      code: hasUnpunchedReceipts ? 'Есть чеки!' : 'Фиск. регистратор',
      location: '',
      status: isEmergencyMode ? 'error' : (fiscalStatus === 'online' ? 'online' : 'offline'),
      statusText: isEmergencyMode ? 'Авария' : (fiscalStatus === 'online' ? 'ОК' : 'Ошибка'),
      hasUnpunchedReceipts,
      cashSum,
      bankSum,
      isEmergencyMode,
      lastUpdate: pos.lastUpdate,
      posNumber
    });

    // Картридер
    if (pos.devices?.cardReader) {
      items.push({
        id: `card-reader${suffix}`,
        name: 'Картридер',
        code: 'Топливные карты',
        location: '',
        status: pos.devices.cardReader.status,
        statusText: pos.devices.cardReader.status === 'online' ? 'ОК' : 'Ошибка',
        posNumber
      });
    }

    // МПС-ридер
    if (pos.devices?.mpsReader) {
      items.push({
        id: `mps-reader${suffix}`,
        name: 'МПС',
        code: 'Банк. карты и СБП',
        location: '',
        status: pos.devices.mpsReader.status,
        statusText: pos.devices.mpsReader.status === 'online' ? 'ОК' : 'Ошибка',
        posNumber
      });
    }

    // Купюроприемник
    if (pos.devices?.billAcceptor) {
      const deviceStatus = pos.devices.billAcceptor.status;
      const isOnline = deviceStatus === 'online';
      items.push({
        id: `bill-acceptor${suffix}`,
        name: 'Купюроприемник',
        code: `ID: ${pos.devices.billAcceptor.name}`,
        location: `Устройство ${pos.devices.billAcceptor.name}`,
        status: deviceStatus,
        statusText: isOnline ? 'Готов' : 'Ошибка',
        billCount: pos.devices.billAcceptor.billCount,
        billAmount: pos.devices.billAcceptor.billAmount,
        posNumber
      });
    }

    return items;
  }

  /**
   * Преобразование данных из TerminalInfo в формат для отображения
   * Поддерживает многопостовые станции (несколько POS)
   * @param info - информация о терминале
   * @param stationName - название станции из селектора (опционально)
   */
  mapTerminalInfoToEquipment(info: TerminalInfo, stationName?: string): TerminalEquipmentItem[] {
    const equipment: TerminalEquipmentItem[] = [];

    // Самый свежий lastUpdate из всех постов
    const latestLastUpdate = this.getLatestPosUpdate(info.pos);

    // Проверяем offline по времени (более 15 минут без связи)
    const isOffline = this.isOfflineByTime(latestLastUpdate);
    const terminalStatus = isOffline ? 'offline' : info.terminal.status;

    // Станция (основной терминал) - общий элемент
    const hasTerminalError = info.terminalState && info.terminalState.code !== 0;
    const stationCode = stationName || info.terminal.name || 'АЗС';
    const shiftInfo = info.shift ? `№${info.shift.number}` : '';
    const stationDisplay = shiftInfo ? `${stationCode} • ${shiftInfo}` : stationCode;
    const stationStatus = hasTerminalError ? 'error' : terminalStatus;
    const stationStatusText = hasTerminalError
      ? info.terminalState!.description
      : (terminalStatus === 'online' ? 'Онлайн' : 'Офлайн');
    equipment.push({
      id: 'station',
      name: 'Станция',
      code: stationDisplay,
      location: '',
      status: stationStatus,
      statusText: stationStatusText,
      lastUpdate: latestLastUpdate
    });

    if (info.pos.length <= 1) {
      // === Один пост — текущее поведение без изменений ===
      const pos = info.pos[0];
      if (!pos) return equipment;

      const posIsOffline = this.isOfflineByTime(pos.lastUpdate);

      // POS, ККТ, Картридер, МПС (без суффикса)
      const posDevices = this.mapPosDevicesToEquipment(pos, posIsOffline, '');

      // Вставляем POS и ККТ
      equipment.push(...posDevices.filter(eq => eq.name === 'POS' || eq.name === 'ККТ'));

      // Картридер и МПС
      equipment.push(...posDevices.filter(eq => eq.name === 'Картридер' || eq.name === 'МПС'));

      // QR (общий)
      equipment.push({
        id: 'qr',
        name: 'QR',
        code: 'Штрих коды',
        location: '',
        status: info.shift?.state === 'Открытая' ? 'online' : 'offline',
        statusText: info.shift?.state === 'Открытая' ? 'Активен' : 'Неактивен'
      });

      // Купюроприемник
      equipment.push(...posDevices.filter(eq => eq.name === 'Купюроприемник'));
    } else {
      // === Несколько постов — группировка по постам ===

      // QR (общий, перед блоками постов)
      equipment.push({
        id: 'qr',
        name: 'QR',
        code: 'Штрих коды',
        location: '',
        status: info.shift?.state === 'Открытая' ? 'online' : 'offline',
        statusText: info.shift?.state === 'Открытая' ? 'Активен' : 'Неактивен'
      });

      // Для каждого поста — свой набор устройств
      for (const pos of info.pos) {
        const posNum = pos.number;
        const posIsOffline = this.isOfflineByTime(pos.lastUpdate);
        const posDevices = this.mapPosDevicesToEquipment(pos, posIsOffline, `-${posNum}`, posNum);
        equipment.push(...posDevices);
      }
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
