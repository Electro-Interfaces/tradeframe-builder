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
 * НОВАЯ ФУНКЦИЯ: Получить остатки на основе ТОЛЬКО сменных отчётов
 * Использует только /v1/shifts и /v1/report/shift_report
 */
export async function getInventoryFromShiftReports(params: InventoryParams): Promise<TankInventory[]> {
  const inventory: TankInventory[] = [];

  // Границы периода
  const periodStart = new Date(params.dt_beg!);
  const periodEnd = new Date(params.dt_end!);

  // Получаем список всех ТТ
  const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);

  // ✅ ОПТИМИЗАЦИЯ: Обрабатываем все ТТ параллельно с Promise.all()
  const pointPromises = tradingPoints
    .filter(point => {
      if (!point.external_id) return false;
      // Если выбрана конкретная ТТ - обрабатываем только её
      if (params.station && parseInt(point.external_id) !== params.station) {
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

      // 3. ✅ ОПТИМИЗАЦИЯ: Получаем данные из сменных отчётов параллельно с отслеживанием прогресса
      const totalShifts = validShifts.length;

      // Вызываем начальный прогресс
      if (params.onProgress) {
        params.onProgress(0, totalShifts);
      }

      // Используем Promise.allSettled для отслеживания завершения каждого промиса
      const shiftReportPromises = validShifts.map(async (shift, index) => {
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
          // Игнорируем ошибки получения отдельных отчетов
          return null;
        }
      });

      // Оборачиваем каждый промис для отслеживания прогресса без race condition
      const trackedPromises = shiftReportPromises.map((promise, index) =>
        promise.then((result) => {
          // Безопасно обновляем прогресс после завершения промиса
          if (params.onProgress) {
            params.onProgress(index + 1, totalShifts);
          }
          return result;
        }).catch((err) => {
          // Даже при ошибке обновляем прогресс
          if (params.onProgress) {
            params.onProgress(index + 1, totalShifts);
          }
          return null;
        })
      );

      const shiftReportsResults = await Promise.all(trackedPromises);
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
        capacity: number;
        fuelCode: number;
        fuelName: string;
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
              capacity: tankCapacities.get(tankNumber) || 0, // Реальная емкость из tank_history
              fuelCode: tank.service?.service_code || tank.fuel || 0,
              fuelName: tank.service?.service_name || 'Неизвестно'
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
          data.receipts += parseFloat(tank.receipt?.volume || '0');
          data.sales += parseFloat(tank.release?.volume || '0');
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
  console.log('\n🔍 ========== ВАЛИДАЦИЯ КНИЖНОГО ОСТАТКА ==========');
  console.log(`📅 Период: с ${params.dt_beg} по ${params.dt_end}`);
  console.log(`🏢 Сеть: ${params.system}`);

  try {
    // Получаем список всех ТТ сети
    const tradingPoints = await tradingPointsService.getByNetworkId(params.networkId);
    console.log(`🏪 Торговых точек в сети: ${tradingPoints.length}`);

    // Для каждой ТТ проверяем смены
    for (const point of tradingPoints) {
      if (!point.external_id) continue;

      const stationId = parseInt(point.external_id);
      console.log(`\n📍 ТТ ${stationId} (${point.name}):`);

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

      console.log(`  📊 Закрытых смен в периоде: ${periodicShifts.length}`);

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

          const closeDate = new Date(shift.dt_close);
          console.log(`\n  ⏰ Смена #${shift.shift} (закрыта ${closeDate.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}):`);

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

            console.log(`    ${icon} Р${tank.tank} (${tank.service?.service_name}):`);
            console.log(`       Начало: ${docBeg.toFixed(2)} л`);
            console.log(`       + Поступления: ${receipts.toFixed(2)} л`);
            console.log(`       - Реализация: ${sales.toFixed(2)} л`);
            console.log(`       = Расчет: ${calculated.toFixed(2)} л`);
            console.log(`       📋 Официально: ${official.toFixed(2)} л`);
            if (!isValid) {
              console.log(`       ⚠️ ${status}: ${diff.toFixed(2)} л`);
            }
          }
        } catch (err) {
          console.error(`  ❌ Ошибка получения отчета смены #${shift.shift}:`, err);
        }
      }
    }

    console.log('\n🔍 ========== ВАЛИДАЦИЯ ЗАВЕРШЕНА ==========\n');
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
  console.warn('⚠️ getInventoryHistory: not implemented yet');
  return [];
}
