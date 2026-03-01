/**
 * Сервис для работы с остатками топлива по всей сети
 */

import { stsProxyRequest } from './stsProxyClient';
import { tradingPointsService } from './tradingPointsService';
import type { TankHistoryRecord, ReceiptResponse, TransactionV2Response } from '@/types/tanks';

/**
 * Параметры для получения остатков
 */
export interface InventoryParams {
  system: number;           // external_id сети для STS API
  networkId: string;        // UUID сети для получения списка ТТ
  station?: number;         // external_id ТТ (опционально)
  dt_beg?: string;
  dt_end?: string;
  allowedStations?: Set<string> | null; // Разрешенные станции для фильтрации по ролям
  onProgress?: (loaded: number, total: number) => void; // Callback для отслеживания прогресса загрузки смен
}

/**
 * Агрегированные остатки по виду топлива (ТОЛЬКО КНИЖНЫЕ ДАННЫЕ)
 */
export interface FuelInventorySummary {
  fuelCode: number;
  fuelName: string;
  totalVolumeBook: number;       // Книжный остаток (расчетный)
  totalVolumeBegin: number;      // Начальный остаток
  totalReceipts: number;         // Поступления
  totalSales: number;            // Реализация
  totalCapacity: number;         // Общая вместимость
  totalFree: number;             // Свободный объем
  tankCount: number;             // Количество резервуаров
}

/**
 * Остатки по резервуару (ТОЛЬКО КНИЖНЫЕ ДАННЫЕ)
 */
export interface TankInventory {
  station: number;
  stationName?: string;
  tankNumber: number;
  fuelCode: number;
  fuelName: string;
  volumeBook: number;            // Книжный остаток (расчетный)
  volumeBegin: number;           // Остаток на начало периода
  volumeReceipts: number;        // Поступления за период
  volumeSales: number;           // Реализация за период
  receiptCount: number;          // Количество поступлений (ТТН)
  shiftCount: number;            // Количество смен
  capacity: number;              // Вместимость
  freeVolume: number;            // Свободный объем
  fillPercent: number;           // Процент заполнения
  lastUpdate: string;            // Время последнего обновления
  initialShift?: {               // Информация о сменном отчете для начальных данных
    number: number;              // Номер смены
    date: string;                // Дата смены
  };
}

/**
 * История остатков для графика динамики
 */
export interface InventoryHistory {
  timestamp: string;
  fuelCode: number;
  fuelName: string;
  totalVolume: number;
  stationData: {
    station: number;
    volume: number;
  }[];
}



/**
 * Вспомогательная функция для выполнения промисов пачками
 * Ограничивает количество одновременных запросов для предотвращения перегрузки API
 */
async function batchPromises<T>(
  items: any[],
  processFn: (item: any, index: number) => Promise<T>,
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => processFn(item, i + batchIndex))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Получить остатки через серверную агрегацию (один POST-запрос вместо ~200+ round-trips)
 * Backend агрегирует данные STS API с использованием NodeCache (2h TTL для shift_reports)
 */
export async function getInventoryFromServer(params: InventoryParams): Promise<TankInventory[]> {
  // Получаем список ТТ (из Supabase, кэшируется React Query)
  const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);

  const stations = tradingPoints
    .filter(point => {
      if (!point.external_id) return false;
      if (params.station && parseInt(point.external_id) !== params.station) return false;
      if (params.allowedStations && !params.allowedStations.has(point.external_id)) return false;
      return true;
    })
    .map(point => ({
      id: parseInt(point.external_id!),
      name: point.name || `АЗС ${point.external_id}`
    }));

  if (stations.length === 0) return [];

  return stsProxyRequest<TankInventory[]>('/fuel-inventory', {
    method: 'POST',
    body: {
      system: params.system,
      stations,
      dt_beg: params.dt_beg,
      dt_end: params.dt_end,
      allowedStations: params.allowedStations ? Array.from(params.allowedStations) : null
    }
  });
}

/**
 * Получить остатки из сменных отчётов (клиентская агрегация, fallback)
 * Использует только /v1/shifts и /v1/report/shift_report
 */
export async function getInventoryFromShiftReports(params: InventoryParams): Promise<TankInventory[]> {
  const inventory: TankInventory[] = [];

  // ✅ Показываем индикатор загрузки СРАЗУ в начале
  if (params.onProgress) {
    params.onProgress(0, 0); // Показываем, что загрузка началась
  }

  // Границы периода
  const periodStart = new Date(params.dt_beg!);
  const periodEnd = new Date(params.dt_end!);

  // Получаем список всех ТТ
  const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);

  // ✅ Агрегированный счетчик прогресса для ВСЕХ станций
  let totalShiftsAcrossAllStations = 0;
  let loadedShiftsAcrossAllStations = 0;

  // ✅ ОПТИМИЗАЦИЯ: Обрабатываем все ТТ параллельно с Promise.all()
  const pointPromises = tradingPoints
    .filter(point => {
      if (!point.external_id) return false;
      // Если выбрана конкретная ТТ - обрабатываем только её
      if (params.station && parseInt(point.external_id) !== params.station) {
        return false;
      }
      // Фильтрация по разрешенным станциям (RBAC)
      if (params.allowedStations && !params.allowedStations.has(point.external_id)) {
        return false;
      }
      return true;
    })
    .map(async (point) => {
      const stationId = parseInt(point.external_id!);

      try {
      // 1. Получаем список всех смен
      const shiftsResponse = await stsProxyRequest<any>(
        '/v1/shifts',
        {
          method: 'GET',
          params: {
            system: params.system,
            station: stationId
          }
        }
      );

      let allShifts = [];
      if (Array.isArray(shiftsResponse)) {
        if (shiftsResponse.length > 0 && shiftsResponse[0].shift !== undefined) {
          allShifts = shiftsResponse;
        } else {
          allShifts = shiftsResponse[0]?.shifts || [];
        }
      } else if (shiftsResponse?.shifts) {
        allShifts = shiftsResponse.shifts;
      }

      // 2. Фильтруем смены в периоде ПО ДАТЕ ОТКРЫТИЯ (dt_open)
      // Используем dt_open, так как dt_close может содержать некорректные данные
      const validShifts = allShifts.filter((shift: any) => {
        const openDate = shift.dt_open ? new Date(shift.dt_open) : null;
        if (!openDate) return false;
        return openDate >= periodStart && openDate <= periodEnd;
      }).sort((a: any, b: any) => {
        const dateA = new Date(a.dt_open);
        const dateB = new Date(b.dt_open);
        return dateA.getTime() - dateB.getTime();
      });

      if (validShifts.length === 0) {
        return []; // Нет смен в периоде - возвращаем пустой массив
      }

      // 2.5. Получаем емкости резервуаров из tank_history
      const tankCapacities = new Map<number, number>();
      
      try {
        const tankHistoryResponse = await stsProxyRequest<any[]>(
          '/v1/tank_history',
          {
            method: 'GET',
            params: {
              system: params.system,
              station: stationId,
              dt_beg: params.dt_beg,
              dt_end: params.dt_end
            }
          }
        );

        // /v1/tank_history возвращает массив TankHistoryRecord[]
        if (Array.isArray(tankHistoryResponse) && tankHistoryResponse.length > 0) {
          // Берем последнюю запись для каждого резервуара (самый актуальный volume_max)
          const latestRecords = new Map<number, any>();
          
          tankHistoryResponse.forEach((record: any) => {
            if (record.number && record.volume_max) {
              const existing = latestRecords.get(record.number);
              const recordDate = new Date(record.dt);
              
              if (!existing || recordDate > new Date(existing.dt)) {
                latestRecords.set(record.number, record);
              }
            }
          });
          
          latestRecords.forEach((record, tankNumber) => {
            const capacity = parseFloat(record.volume_max);
            tankCapacities.set(tankNumber, capacity);
          });
        }
      } catch (tankErr) {
        // Игнорируем ошибки получения емкостей
      }

      // 3. ✅ ОПТИМИЗАЦИЯ: Получаем данные из сменных отчётов пачками для предотвращения перегрузки API
      const totalShifts = validShifts.length;

      // Добавляем смены этой станции к общему счетчику
      totalShiftsAcrossAllStations += totalShifts;

      // Вызываем начальный прогресс с обновленным total
      if (params.onProgress) {
        params.onProgress(loadedShiftsAcrossAllStations, totalShiftsAcrossAllStations);
      }

      // Используем пакетную обработку (5 запросов параллельно) для предотвращения перегрузки STS API
      const shiftReportsResults = await batchPromises(
        validShifts,
        async (shift, index) => {
          try {
            const report = await stsProxyRequest<any>(
              '/v1/report/shift_report',
              {
                method: 'GET',
                params: {
                  system: params.system,
                  station: stationId,
                  shift: shift.shift
                }
              }
            );

            // Обновляем ГЛОБАЛЬНЫЙ счетчик загруженных смен
            loadedShiftsAcrossAllStations++;

            // Обновляем прогресс с агрегированными значениями
            if (params.onProgress) {
              params.onProgress(loadedShiftsAcrossAllStations, totalShiftsAcrossAllStations);
            }

            let reportData = report;
            if (Array.isArray(report) && report.length > 0) {
              reportData = report[0];
            }

            if (reportData?.release && reportData.release.length > 0) {
              return {
                shiftNumber: shift.shift,
                shiftDate: shift.dt_close || shift.dt_open,
                data: reportData
              };
            }
            return null;
          } catch (err) {
            // Обновляем ГЛОБАЛЬНЫЙ счетчик даже при ошибке
            loadedShiftsAcrossAllStations++;

            // Обновляем прогресс с агрегированными значениями
            if (params.onProgress) {
              params.onProgress(loadedShiftsAcrossAllStations, totalShiftsAcrossAllStations);
            }
            // Игнорируем ошибки получения отдельных отчетов
            return null;
          }
        },
        10 // Размер пачки: 10 запросов одновременно
      );

      const shiftReports = shiftReportsResults.filter(report => report !== null);

      if (shiftReports.length === 0) {
        return []; // Нет данных из отчетов - возвращаем пустой массив
      }

      // 4. Группируем данные по резервуарам
      const tankDataMap = new Map<number, {
        firstShift: any;
        lastShift: any;
        receipts: number;
        sales: number;
        receiptCount: number;
        shiftCount: number;
        capacity: number;
        fuelCode: number;
        fuelName: string;
        processedShifts: Set<number>;
      }>();

      shiftReports.forEach(report => {
        report.data.release.forEach((tank: any) => {
          const tankNumber = tank.tank;

          if (!tankDataMap.has(tankNumber)) {
            tankDataMap.set(tankNumber, {
              firstShift: report,
              lastShift: report,
              receipts: 0,
              sales: 0,
              receiptCount: 0,
              shiftCount: 0,
              capacity: tankCapacities.get(tankNumber) || 0, // Реальная емкость из tank_history
              fuelCode: tank.service?.service_code || tank.fuel || 0,
              fuelName: tank.service?.service_name || 'Неизвестно',
              processedShifts: new Set()
            });
          }

          const data = tankDataMap.get(tankNumber)!;

          // Обновляем последнюю смену
          const currentDate = new Date(report.shiftDate);
          const lastDate = new Date(data.lastShift.shiftDate);
          if (currentDate > lastDate) {
            data.lastShift = report;
          }

          // Накапливаем поступления и реализацию
          const receiptVolume = parseFloat(tank.receipt?.volume || '0');
          data.receipts += receiptVolume;
          data.sales += parseFloat(tank.release?.volume || '0');

          // Считаем количество поступлений (ТТН) - только если объем > 0
          if (receiptVolume > 0) {
            data.receiptCount++;
          }

          // Считаем уникальные смены
          if (!data.processedShifts.has(report.shiftNumber)) {
            data.processedShifts.add(report.shiftNumber);
            data.shiftCount++;
          }
        });
      });

      // 5. Создаём TankInventory для каждого резервуара
      const tankInventories: TankInventory[] = [];
      tankDataMap.forEach((data, tankNumber) => {
        const firstTank = data.firstShift.data.release.find((t: any) => t.tank === tankNumber);
        const lastTank = data.lastShift.data.release.find((t: any) => t.tank === tankNumber);

        const volumeBegin = parseFloat(firstTank?.doc_beg?.volume || '0');
        const volumeEnd = parseFloat(lastTank?.doc_end?.volume || '0');

        tankInventories.push({
          station: stationId,
          stationName: point.name,
          tankNumber: tankNumber,
          fuelCode: data.fuelCode,
          fuelName: data.fuelName,
          volumeBook: volumeEnd,
          volumeBegin: volumeBegin,
          volumeReceipts: data.receipts,
          volumeSales: data.sales,
          receiptCount: data.receiptCount,
          shiftCount: data.shiftCount,
          capacity: data.capacity,
          freeVolume: data.capacity - volumeEnd,
          fillPercent: (volumeEnd / data.capacity) * 100,
          lastUpdate: data.lastShift.shiftDate,
          initialShift: {
            number: data.firstShift.shiftNumber,
            date: data.firstShift.shiftDate
          }
        });
      });

      return tankInventories;

    } catch (err) {
      // Игнорируем ошибки обработки ТТ
      return [];
    }
  });

  // ✅ ОПТИМИЗАЦИЯ: Ждем завершения всех торговых точек параллельно
  const allResults = await Promise.all(pointPromises);

  // Объединяем результаты всех ТТ в один массив
  allResults.forEach(tankInventories => {
    inventory.push(...tankInventories);
  });

  return inventory;
}

/**
 * Получить агрегированные остатки по видам топлива (ТОЛЬКО КНИЖНЫЕ ДАННЫЕ)
 */
export function aggregateByFuel(inventory: TankInventory[]): FuelInventorySummary[] {
  const fuelMap = new Map<number, FuelInventorySummary>();

  inventory.forEach(tank => {
    // Пропускаем резервуары с некорректными данными
    if (isNaN(tank.volumeBook) || isNaN(tank.capacity) || tank.capacity === 0) {
      return;
    }

    const existing = fuelMap.get(tank.fuelCode);

    if (existing) {
      existing.totalVolumeBook += tank.volumeBook;
      existing.totalVolumeBegin += tank.volumeBegin;
      existing.totalReceipts += tank.volumeReceipts;
      existing.totalSales += tank.volumeSales;
      existing.totalCapacity += tank.capacity;
      existing.totalFree += tank.freeVolume || 0;
      existing.tankCount += 1;
    } else {
      fuelMap.set(tank.fuelCode, {
        fuelCode: tank.fuelCode,
        fuelName: tank.fuelName,
        totalVolumeBook: tank.volumeBook,
        totalVolumeBegin: tank.volumeBegin,
        totalReceipts: tank.volumeReceipts,
        totalSales: tank.volumeSales,
        totalCapacity: tank.capacity,
        totalFree: tank.freeVolume || 0,
        tankCount: 1
      });
    }
  });

  return Array.from(fuelMap.values());
}

/**
 * Валидация расчетов книжного остатка
 * Сравнивает наши расчеты с официальными данными из сменных отчетов
 */
export async function validateBookInventory(params: InventoryParams): Promise<void> {

  try {
    // Получаем список всех ТТ сети
    const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);

    // Для каждой ТТ проверяем смены
    for (const point of tradingPoints) {
      if (!point.external_id) continue;

      const stationId = parseInt(point.external_id);

      // Получаем список всех смен за период
      const shiftsResponse = await stsProxyRequest<any>(
        '/v1/shifts',
        {
          method: 'GET',
          params: {
            system: params.system,
            station: stationId
          }
        }
      );

      let shifts = [];
      if (Array.isArray(shiftsResponse)) {
        if (shiftsResponse.length > 0 && shiftsResponse[0].shift !== undefined) {
          shifts = shiftsResponse;
        } else {
          shifts = shiftsResponse[0]?.shifts || [];
        }
      } else if (shiftsResponse?.shifts) {
        shifts = shiftsResponse.shifts;
      }

      // Фильтруем смены в пределах периода
      const periodStart = new Date(params.dt_beg!);
      const periodEnd = new Date(params.dt_end!);

      const periodicShifts = shifts.filter((shift: any) => {
        const closeDate = shift.dt_close ? new Date(shift.dt_close) : null;
        if (!closeDate) return false;
        return closeDate >= periodStart && closeDate <= periodEnd;
      }).sort((a: any, b: any) => {
        const dateA = new Date(a.dt_close || a.dt_open);
        const dateB = new Date(b.dt_close || b.dt_open);
        return dateA.getTime() - dateB.getTime();
      });

      // Для каждой смены сравниваем расчеты
      for (const shift of periodicShifts) {
        try {
          // Получаем официальный сменный отчет
          const shiftReport = await stsProxyRequest<any>(
            '/v1/report/shift_report',
            {
              method: 'GET',
              params: {
                system: params.system,
                station: stationId,
                shift: shift.shift
              }
            }
          );

          let reportData = shiftReport;
          if (Array.isArray(shiftReport) && shiftReport.length > 0) {
            reportData = shiftReport[0];
          }

          const release = reportData?.release || [];
          if (release.length === 0) continue;

          // Проверяем каждый резервуар
          for (const tank of release) {
            const docBeg = parseFloat(tank.doc_beg?.volume || '0');
            const docEnd = parseFloat(tank.doc_end?.volume || '0');
            const receipts = parseFloat(tank.receipt?.volume || '0');
            const sales = parseFloat(tank.release?.volume || '0');

            // Наш расчет книжного остатка
            const calculated = docBeg + receipts - sales;

            // Официальный остаток из отчета
            const official = docEnd;

            // Разница
            const diff = Math.abs(calculated - official);
            const isValid = diff < 0.01; // Допуск 0.01 л

            const icon = isValid ? '✅' : '❌';
            const status = isValid ? 'СОВПАДАЕТ' : 'РАСХОЖДЕНИЕ';

            if (!isValid) {
              // Discrepancy detected in tank/shift calculation
            }
          }
        } catch (err) {
          console.error(`  ❌ Ошибка получения отчета смены #${shift.shift}:`, err);
        }
      }
    }

  } catch (error) {
    console.error('❌ Ошибка валидации:', error);
  }
}

/**
 * Получить динамику остатков за период
 */
export async function getInventoryHistory(
  params: InventoryParams,
  interval: '1h' | '6h' | '1d' = '6h'
): Promise<InventoryHistory[]> {
  // TODO: Реализовать получение истории с агрегацией по времени
  // Пока возвращаем пустой массив
  // TODO: getInventoryHistory not implemented yet
  return [];
}
