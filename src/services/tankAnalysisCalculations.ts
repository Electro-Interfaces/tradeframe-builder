/**
 * Модуль расчетов для детального анализа резервуаров
 *
 * Содержит чистые функции для расчета:
 * - Фактических и книжных остатков
 * - Фактической и книжной реализации
 * - Погрешностей
 */

import type { TankHistoryRecord, TransactionV2Response, ReceiptResponse } from '@/types/tanks';

/**
 * Нормализованная транзакция для быстрых расчетов
 */
interface NormalizedTransaction {
  time: number;
  quantity: number;
}

/**
 * Нормализованное поступление для быстрых расчетов
 */
interface NormalizedReceipt {
  time: number;
  volume: number;
}

/**
 * Точка данных для графиков
 */
export interface ChartDataPoint {
  time: string;                // Время в формате "ДД.ММ, ЧЧ:ММ"
  volumeActual: number;        // Фактический остаток (из датчиков)
  volumeBook: number;          // Книжный остаток (расчетный)
  releaseActual: number;       // Фактическая реализация (из изменения остатков)
  releaseBook: number;         // Книжная реализация (из транзакций)
  releaseDifference: number;   // Разница между фактом и книгой
  temperature: number;         // Температура
  density: number;             // Плотность
  waterLevel: number;          // Уровень воды
}

/**
 * Начальные значения для расчетов
 */
interface InitialValues {
  firstVolume: number;          // Первый фактический остаток в периоде
  firstVolumeBegin: number;     // Начальный объем первой записи
  firstReleaseBook: number;     // Накопленная книжная реализация до начала периода
  firstReceiptsBook: number;    // Накопленные поступления до начала периода
}

/**
 * Нормализует транзакции для быстрых расчетов
 * Фильтрует по номеру резервуара, парсит числа, сортирует по времени
 */
export function normalizeTransactions(
  transactions: TransactionV2Response | null,
  fuelCode: number,
  dt_beg?: string,
  dt_end?: string
): NormalizedTransaction[] {
  if (!transactions?.items) return [];

  // Преобразуем даты фильтра в timestamp для быстрого сравнения
  const filterStartTime = dt_beg ? new Date(dt_beg).getTime() : -Infinity;
  const filterEndTime = dt_end ? new Date(dt_end).getTime() : Infinity;

  // Фильтрация по коду топлива (fuel), не по tank — маппинг tank в транзакциях ≠ физ. резервуарам
  return transactions.items
    .filter(item => item.fuel === fuelCode)
    .map(item => ({
      time: new Date(item.dt || '').getTime(),
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity
    }))
    .filter(item =>
      !isNaN(item.quantity) &&
      item.quantity > 0 &&
      item.time >= filterStartTime &&
      item.time <= filterEndTime
    )
    .sort((a, b) => a.time - b.time);
}

/**
 * Нормализует поступления для быстрых расчетов
 * Извлекает из смен, фильтрует по резервуару, парсит числа, сортирует
 */
export function normalizeReceipts(
  receipts: ReceiptResponse | null,
  tankNumber: number,
  dt_beg?: string,
  dt_end?: string
): NormalizedReceipt[] {
  if (!receipts?.shifts) return [];

  // Преобразуем даты фильтра в timestamp для быстрого сравнения
  const filterStartTime = dt_beg ? new Date(dt_beg).getTime() : -Infinity;
  const filterEndTime = dt_end ? new Date(dt_end).getTime() : Infinity;

  return receipts.shifts
    .flatMap(shift => shift.receipt || [])
    .filter(item => item.tank === tankNumber)
    .map(item => ({
      time: new Date(item.dt).getTime(),
      volume: typeof item.fact.volume === 'string'
        ? parseFloat(item.fact.volume)
        : item.fact.volume
    }))
    .filter(item =>
      !isNaN(item.volume) &&
      item.volume > 0 &&
      item.time >= filterStartTime &&
      item.time <= filterEndTime
    )
    .sort((a, b) => a.time - b.time);
}

/**
 * Вычисляет начальные значения для расчетов
 * Определяет точку отсчета и накопленные значения до начала периода
 */
export function calculateInitialValues(
  firstRecord: TankHistoryRecord | undefined,
  transactions: NormalizedTransaction[],
  receipts: NormalizedReceipt[]
): InitialValues {
  if (!firstRecord) {
    return {
      firstVolume: 0,
      firstVolumeBegin: 0,
      firstReleaseBook: 0,
      firstReceiptsBook: 0
    };
  }

  const firstTime = new Date(firstRecord.dt).getTime();
  const firstVolume = parseFloat(firstRecord.volume);
  const firstVolumeBegin = parseFloat(firstRecord.volume_begin);

  // Суммируем все транзакции ДО начала периода
  const firstReleaseBook = transactions
    .filter(tx => tx.time <= firstTime)
    .reduce((sum, tx) => sum + tx.quantity, 0);

  // Суммируем все поступления ДО начала периода
  const firstReceiptsBook = receipts
    .filter(rcp => rcp.time <= firstTime)
    .reduce((sum, rcp) => sum + rcp.volume, 0);

  return {
    firstVolume,
    firstVolumeBegin,
    firstReleaseBook,
    firstReceiptsBook
  };
}

/**
 * Основная функция расчета данных для графиков
 *
 * Использует алгоритм TWO-POINTER для эффективного расчета O(n+m)
 *
 * Формулы:
 * - Книжный остаток = Начальный объем + Чистые поступления - Чистая реализация
 * - Фактическая реализация = Начальный объем + Чистые поступления - Текущий остаток
 * - Книжная реализация = Сумма транзакций за период
 *
 * где:
 * - Чистые поступления = Поступления за период (без учета до начала)
 * - Чистая реализация = Транзакции за период (без учета до начала)
 */
export function calculateChartData(
  history: TankHistoryRecord[],
  transactions: NormalizedTransaction[],
  receipts: NormalizedReceipt[],
  initialValues: InitialValues
): ChartDataPoint[] {
  if (history.length === 0) return [];

  const {
    firstVolume,
    firstVolumeBegin,
    firstReleaseBook,
    firstReceiptsBook
  } = initialValues;

  // TWO-POINTER алгоритм: указатели на текущую позицию в массивах
  let txPointer = 0;
  let rcpPointer = 0;

  // Накопительные счетчики (включают ВСЕ транзакции/поступления с начала времен)
  let cumulativeRelease = 0;
  let cumulativeReceipts = 0;

  const result = history.map((record) => {
    const currentTime = new Date(record.dt).getTime();
    const currentVolume = parseFloat(record.volume);

    // ═══════════════════════════════════════════════════════════════════
    // НАКОПЛЕНИЕ ТРАНЗАКЦИЙ до текущего момента
    // ═══════════════════════════════════════════════════════════════════
    while (txPointer < transactions.length && transactions[txPointer].time <= currentTime) {
      cumulativeRelease += transactions[txPointer].quantity;
      txPointer++;
    }

    // ═══════════════════════════════════════════════════════════════════
    // НАКОПЛЕНИЕ ПОСТУПЛЕНИЙ до текущего момента
    // ═══════════════════════════════════════════════════════════════════
    while (rcpPointer < receipts.length && receipts[rcpPointer].time <= currentTime) {
      cumulativeReceipts += receipts[rcpPointer].volume;
      rcpPointer++;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ЧИСТЫЕ ЗНАЧЕНИЯ ЗА ПЕРИОД (вычитаем то, что было ДО начала периода)
    // ═══════════════════════════════════════════════════════════════════
    const releaseBook = cumulativeRelease - firstReleaseBook;
    const receiptsBook = cumulativeReceipts - firstReceiptsBook;

    // ═══════════════════════════════════════════════════════════════════
    // РАСЧЕТ ОСТАТКОВ И РЕАЛИЗАЦИИ
    // ═══════════════════════════════════════════════════════════════════

    // КНИЖНЫЙ ОСТАТОК = Начало + Поступления - Реализация
    const volumeBook = firstVolume + receiptsBook - releaseBook;

    // ФАКТИЧЕСКАЯ РЕАЛИЗАЦИЯ = Начало + Поступления - Текущий остаток
    const releaseActual = firstVolume + receiptsBook - currentVolume;

    // РАЗНИЦА между фактом и книгой показывает погрешность учета
    const releaseDifference = releaseActual - releaseBook;

    return {
      time: new Date(record.dt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      volumeActual: currentVolume,
      volumeBook: volumeBook,
      releaseActual: releaseActual,
      releaseBook: releaseBook,
      releaseDifference: releaseDifference,
      temperature: parseFloat(record.temperature),
      density: parseFloat(record.density),
      waterLevel: parseFloat(record.water.level)
    };
  });

  // ═══════════════════════════════════════════════════════════════════
  // СГЛАЖИВАНИЕ releaseActual В ОКНАХ ПОСТАВОК
  //
  // releaseActual = firstVolume + receiptsBook - currentVolume даёт
  // точные ИТОГО, но артефакты (пики/провалы) когда timestamp
  // поступления и физическое изменение объёма не совпадают.
  //
  // Решение: определяем окна поставок по датчику (скачки объёма),
  // расширяем их чтобы покрыть и приход документа, затем линейно
  // интерполируем releaseActual через эти окна. Граничные точки
  // (до и после поставки) корректны — оба источника синхронизированы.
  // ═══════════════════════════════════════════════════════════════════
  const DELIVERY_THRESHOLD = 200;

  // Шаг 1: Пометить точки где объём вырос (физическая поставка)
  const isDeliveryPoint: boolean[] = new Array(result.length).fill(false);
  for (let i = 1; i < result.length; i++) {
    if (result[i].volumeActual - result[i - 1].volumeActual > DELIVERY_THRESHOLD) {
      isDeliveryPoint[i] = true;
    }
  }

  // Шаг 2: Пометить точки с аномальными скачками releaseActual
  // (receipt пришёл раньше/позже физической поставки)
  if (result.length > 1) {
    const totalRelease = result[result.length - 1].releaseActual;
    const avgRate = Math.abs(totalRelease) / result.length;
    const spikeThreshold = Math.max(avgRate * 10, 100); // 10x средней скорости или 100 л

    for (let i = 1; i < result.length; i++) {
      const change = Math.abs(result[i].releaseActual - result[i - 1].releaseActual);
      if (change > spikeThreshold) {
        isDeliveryPoint[i] = true;
      }
    }
  }

  // Шаг 3: Расширяем окна на ±2 точки для плавного перехода
  const inWindow: boolean[] = new Array(result.length).fill(false);
  for (let i = 0; i < result.length; i++) {
    if (isDeliveryPoint[i]) {
      for (let j = Math.max(0, i - 2); j <= Math.min(result.length - 1, i + 2); j++) {
        inWindow[j] = true;
      }
    }
  }

  // Шаг 4: Интерполяция через окна поставок
  let idx = 0;
  while (idx < result.length) {
    if (inWindow[idx]) {
      const wStart = idx;
      while (idx < result.length && inWindow[idx]) idx++;
      const wEnd = idx; // exclusive

      // Якорные точки: последняя нормальная до окна, первая нормальная после
      const leftAnchor = wStart > 0 ? wStart - 1 : 0;
      const rightAnchor = wEnd < result.length ? wEnd : result.length - 1;
      const leftVal = result[leftAnchor].releaseActual;
      const rightVal = result[rightAnchor].releaseActual;
      const span = rightAnchor - leftAnchor;

      if (span > 0) {
        for (let j = wStart; j < Math.min(wEnd, result.length); j++) {
          const t = (j - leftAnchor) / span;
          result[j].releaseActual = leftVal + t * (rightVal - leftVal);
          result[j].releaseDifference = result[j].releaseActual - result[j].releaseBook;
        }
      }
    } else {
      idx++;
    }
  }

  return result;
}

/**
 * Тип аномалии
 */
export type AnomalyType =
  | 'delivery_receipt_desync'   // Рассинхрон поставки и документа
  | 'systematic_divergence'     // Систематическое расхождение факт/книга
  | 'negative_release'          // Фактическая реализация ушла в минус
  | 'volume_gap'                // Резкий необъяснимый скачок объёма
  | 'data_gap'                  // Разрыв в данных датчика
  | 'density_spike';            // Резкое изменение плотности (возможная пересортица)

export type AnomalySeverity = 'info' | 'warning' | 'critical';

/**
 * Обнаруженная аномалия
 */
export interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  /** Возможные причины — готовые сценарии для оператора */
  causes: string[];
  /** Что проверить / рекомендации */
  actions: string[];
  timeRange: { from: string; to: string };
}

/**
 * Обнаруживает аномалии в данных графика
 */
export function detectAnomalies(
  chartData: ChartDataPoint[],
  history: { dt: string; volume: string }[]
): DetectedAnomaly[] {
  if (chartData.length < 3) return [];
  const anomalies: DetectedAnomaly[] = [];

  // ─── 1. Рассинхрон поставки и документа поступления ───
  // Если releaseActual уходит глубоко в минус — физическая поставка
  // произошла, а документ (receipt) ещё не зафиксирован
  let inNegativeZone = false;
  let negStart = 0;
  let negMin = 0;

  for (let i = 0; i < chartData.length; i++) {
    const ra = chartData[i].releaseActual;
    if (ra < -50 && !inNegativeZone) {
      inNegativeZone = true;
      negStart = i;
      negMin = ra;
    } else if (inNegativeZone) {
      if (ra < negMin) negMin = ra;
      if (ra >= 0 || i === chartData.length - 1) {
        // Зона закончилась
        const duration = i - negStart;
        if (duration >= 2 && negMin < -200) {
          anomalies.push({
            type: 'delivery_receipt_desync',
            severity: Math.abs(negMin) > 2000 ? 'critical' : 'warning',
            title: 'Рассинхрон поставки и документа',
            description: `Физическая поставка зафиксирована датчиком, но документ поступления появился позже. Провал фактической реализации до ${negMin.toFixed(0)} л в течение ${duration} точек (~${formatDuration(duration, chartData, negStart)}).`,
            causes: [
              'Документ поступления (ТТН) оформлен позже физического слива топлива в резервуар',
              'Водитель бензовоза слил топливо, но оператор не провёл приёмку в системе вовремя',
              'Смена не была закрыта — поступление попало в следующую смену'
            ],
            actions: [
              'Проверить время физического слива по журналу приёмки и сравнить с временем документа в системе',
              'Если рассинхрон повторяется — наладить оперативный ввод ТТН оператором сразу после слива',
              'Проверить, что смена закрывается корректно и поступления не переносятся'
            ],
            timeRange: { from: chartData[negStart].time, to: chartData[Math.min(i, chartData.length - 1)].time }
          });
        }
        inNegativeZone = false;
      }
    }
  }

  // ─── 2. Падение накопительной фактической реализации ───
  // Накопительная реализация не может уменьшаться — нельзя «отменить» проданное.
  // Если падает — в резервуар поступило больше топлива, чем указано в документе,
  // либо поставка прошла без документа вообще.
  {
    let inDropZone = false;
    let dropStart = 0;
    let peakBefore = 0;
    let dropMin = Infinity;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1].releaseActual;
      const curr = chartData[i].releaseActual;

      if (curr < prev - 50 && !inDropZone) {
        inDropZone = true;
        dropStart = i;
        peakBefore = prev;
        dropMin = curr;
      } else if (inDropZone) {
        if (curr < dropMin) dropMin = curr;
        // Зона заканчивается когда линия перестала падать (стабилизировалась или пошла вверх)
        if (curr > dropMin + 50 || i === chartData.length - 1) {
          const dropAmount = peakBefore - dropMin;
          if (dropAmount > 200) {
            // Проверяем восстановилась ли линия — смотрим вперёд до конца данных.
            // Если разница факт/книга в конце периода мала относительно провала — восстановилась.
            const lastPoint = chartData[chartData.length - 1];
            const endGap = Math.abs(lastPoint.releaseActual - lastPoint.releaseBook);
            const recovered = endGap < dropAmount * 0.3;
            const desc = recovered
              ? `Фактическая реализация упала с ${peakBefore.toFixed(0)} до ${dropMin.toFixed(0)} л (−${dropAmount.toFixed(0)} л) и затем восстановилась. Вероятная причина: рассинхронизация документа поступления и физического слива.`
              : `Фактическая реализация упала с ${peakBefore.toFixed(0)} до ${dropMin.toFixed(0)} л (−${dropAmount.toFixed(0)} л) и не восстановилась. По датчику в резервуар поступило на ${dropAmount.toFixed(0)} л больше, чем указано в документе поступления, либо поставка прошла без документа.`;
            anomalies.push({
              type: 'delivery_receipt_desync',
              severity: dropAmount > 2000 ? 'critical' : 'warning',
              title: recovered ? 'Временный провал реализации' : 'Расхождение при поставке',
              description: desc,
              causes: recovered
                ? [
                    'Временная рассинхронизация: документ поступления и физический слив произошли в разное время',
                    'Система сначала увидела топливо (рост объёма), а документ появился позже — или наоборот'
                  ]
                : [
                    'Бензовоз привёз больше топлива, чем указано в ТТН (например, по ТТН 8000 л, фактически слито 8500 л)',
                    'Была поставка без оформления документа — топливо физически поступило, но в системе не зафиксировано',
                    'Ошибка в документе поступления: неверно указан объём или резервуар',
                    'Перекачка топлива из соседнего резервуара без документального оформления'
                  ],
              actions: recovered
                ? [
                    'Это нормальная ситуация — после синхронизации документа и физических данных значение восстановилось',
                    'Для уменьшения временных скачков — ускорить ввод ТТН сразу после слива'
                  ]
                : [
                    'Сравнить фактический объём слива (по показаниям уровнемера до и после) с объёмом в ТТН',
                    'Проверить акт приёмки: совпадает ли указанный резервуар с фактическим',
                    'Проверить, не было ли перекачки между резервуарами в этот период',
                    'Если расхождение систематическое — организовать контрольный замер при следующей поставке'
                  ],
              timeRange: { from: chartData[dropStart].time, to: chartData[Math.min(i, chartData.length - 1)].time }
            });
          }
          inDropZone = false;
        }
      }
    }
  }

  // ─── 4. Резкие скачки объёма без документов (необъяснимые) ───
  for (let i = 1; i < chartData.length; i++) {
    const volDelta = chartData[i].volumeActual - chartData[i - 1].volumeActual;
    const bookDelta = chartData[i].releaseBook - chartData[i - 1].releaseBook;
    // Резкое падение объёма, не объяснимое продажами (book)
    if (volDelta < -500 && bookDelta < Math.abs(volDelta) * 0.3) {
      anomalies.push({
        type: 'volume_gap',
        severity: Math.abs(volDelta) > 2000 ? 'critical' : 'warning',
        title: 'Резкое падение объёма',
        description: `Объём снизился на ${Math.abs(volDelta).toFixed(0)} л за одну точку, при этом книжная реализация за тот же период — ${bookDelta.toFixed(0)} л.`,
        causes: [
          'Несанкционированный слив топлива из резервуара',
          'Перекачка в другой резервуар без документального оформления',
          'Технические работы: откачка остатков, зачистка резервуара',
          'Кратковременный сбой уровнемера (ложное показание)'
        ],
        actions: [
          'Проверить журнал событий терминала на наличие технических работ в этот период',
          'Запросить у оператора смены информацию о перекачках или сливах',
          'Проверить, не было ли зачистки/промывки резервуара',
          'Если причина не установлена — зафиксировать инцидент и усилить контроль'
        ],
        timeRange: { from: chartData[i - 1].time, to: chartData[i].time }
      });
    }
  }

  // ─── 5. Разрывы в данных датчика ───
  if (history.length > 1) {
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].dt).getTime();
      const curr = new Date(history[i].dt).getTime();
      const gapHours = (curr - prev) / 3600000;
      if (gapHours > 3) {
        const from = new Date(history[i - 1].dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const to = new Date(history[i].dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        anomalies.push({
          type: 'data_gap',
          severity: gapHours > 12 ? 'warning' : 'info',
          title: 'Разрыв данных датчика',
          description: `Нет данных от уровнемера в течение ${gapHours.toFixed(1)} ч.`,
          causes: [
            'Отключение электропитания терминала или уровнемера',
            'Потеря связи между терминалом и сервером (интернет, модем)',
            'Перезагрузка терминала или плановые технические работы',
            gapHours > 24 ? 'Длительное отключение — возможно, объект был закрыт' : 'Кратковременный сбой связи'
          ],
          actions: [
            'Проверить журнал событий терминала — были ли перезагрузки',
            'Уточнить у оператора, было ли отключение электроэнергии',
            gapHours > 12
              ? 'Обратить внимание: в период без данных могли происходить поставки и продажи, которые не попали в аналитику'
              : 'Незначительный разрыв — скорее всего, кратковременный сбой связи'
          ],
          timeRange: { from, to }
        });
      }
    }
  }

  // ─── 6. Резкое изменение плотности (возможная пересортица) ───
  for (let i = 1; i < chartData.length; i++) {
    const dDensity = Math.abs(chartData[i].density - chartData[i - 1].density);
    if (dDensity > 10 && chartData[i].density > 0 && chartData[i - 1].density > 0) {
      anomalies.push({
        type: 'density_spike',
        severity: dDensity > 30 ? 'critical' : 'warning',
        title: 'Резкое изменение плотности',
        description: `Плотность изменилась на ${dDensity.toFixed(1)} кг/м³ (${chartData[i - 1].density.toFixed(1)} → ${chartData[i].density.toFixed(1)}).`,
        causes: [
          'Пересортица: в резервуар залили топливо другой марки (например, АИ-95 вместо АИ-92)',
          'Смешивание остатков разных партий при поставке',
          'Поставка топлива с существенно отличающейся плотностью (другой НПЗ, другая партия)',
          dDensity > 30 ? 'При изменении >30 кг/м³ — вероятна пересортица или грубая ошибка' : 'Умеренное изменение — возможна поставка другой партии'
        ],
        actions: [
          'Сверить марку топлива в ТТН с маркой, закреплённой за резервуаром',
          'Проверить паспорт качества поставленной партии — указана ли плотность',
          'Если пересортица подтвердилась — зафиксировать акт, уведомить поставщика',
          'Отобрать пробу из резервуара для лабораторного анализа'
        ],
        timeRange: { from: chartData[i - 1].time, to: chartData[i].time }
      });
    }
  }

  // ─── 7. Систематическое расхождение факт/книга ───
  // Если к концу периода разница между фактической и книжной реализацией
  // устойчиво велика — это не временный рассинхрон, а системная проблема.
  if (chartData.length > 10) {
    const last = chartData[chartData.length - 1];
    const finalDiff = last.releaseActual - last.releaseBook;
    const finalDiffPct = last.releaseBook > 0 ? (finalDiff / last.releaseBook) * 100 : 0;

    if (Math.abs(finalDiff) > 200 && Math.abs(finalDiffPct) > 5) {
      const isUnder = finalDiff < 0; // факт < книга = недоучёт
      anomalies.push({
        type: 'systematic_divergence',
        severity: Math.abs(finalDiffPct) > 20 ? 'critical' : 'warning',
        title: isUnder ? 'Факт. реализация ниже книжной' : 'Факт. реализация выше книжной',
        description: isUnder
          ? `За период факт. реализация (${last.releaseActual.toFixed(0)} л) отстаёт от книжной (${last.releaseBook.toFixed(0)} л) на ${Math.abs(finalDiff).toFixed(0)} л (${finalDiffPct.toFixed(1)}%).`
          : `За период факт. реализация (${last.releaseActual.toFixed(0)} л) превышает книжную (${last.releaseBook.toFixed(0)} л) на ${finalDiff.toFixed(0)} л (+${finalDiffPct.toFixed(1)}%).`,
        causes: isUnder
          ? [
              'При каждой поставке датчик фиксирует больший объём, чем указан в ТТН — накопительный эффект',
              'Не все поставки оформлены документально (например, внутренние перекачки)',
              'Неверный маппинг кода топлива в транзакциях — часть транзакций другого резервуара ошибочно учтена здесь',
              'Дублирование транзакций в учётной системе (одна продажа засчитана дважды)'
            ]
          : [
              'Неучтённый отпуск топлива: продажи, не зафиксированные в кассовой системе',
              'Утечка или испарение топлива из резервуара',
              'Объём поставок по документам завышен относительно фактически слитого',
              'Часть транзакций не попала в выгрузку (сбой кассового ПО, потеря данных)'
            ],
        actions: isUnder
          ? [
              'Провести сверку объёмов поставок: данные уровнемера (до/после слива) vs объём в ТТН за последние 5 поставок',
              'Проверить маппинг кодов топлива — убедиться, что код в транзакциях соответствует именно этому резервуару',
              'Исключить дублирование транзакций: сверить количество транзакций в системе с Z-отчётом кассы',
              'При систематическом расхождении >3% — запросить метрологическую поверку расходомера бензовоза'
            ]
          : [
              'Проверить наличие безналичных/служебных отпусков, которые могли не попасть в транзакции',
              'Осмотреть резервуар на предмет утечек (днище, обвязка, запорная арматура)',
              'Сверить объём последних поставок по паспорту качества с данными уровнемера',
              'Проверить полноту выгрузки транзакций за период — сравнить итоговую сумму с кассовым отчётом'
            ],
        timeRange: { from: chartData[0].time, to: last.time }
      });
    }
  }

  return anomalies;
}

/** Оценивает длительность аномалии в читаемом формате */
function formatDuration(points: number, chartData: ChartDataPoint[], startIdx: number): string {
  // Грубая оценка по количеству точек: данные обычно каждые 10-15 мин
  if (chartData.length < 2) return `${points} точек`;
  // Пробуем вычислить по меткам времени
  const parseTime = (t: string) => {
    // Формат "ДД.ММ, ЧЧ:ММ"
    const m = t.match(/(\d{2})\.(\d{2}),?\s*(\d{2}):(\d{2})/);
    if (!m) return 0;
    return (parseInt(m[1]) * 24 + parseInt(m[3])) * 60 + parseInt(m[4]);
  };
  const endIdx = Math.min(startIdx + points, chartData.length - 1);
  const t1 = parseTime(chartData[startIdx].time);
  const t2 = parseTime(chartData[endIdx].time);
  let diffMin = t2 - t1;
  if (diffMin < 0) diffMin += 31 * 24 * 60; // переход через месяц
  if (diffMin >= 60) return `${(diffMin / 60).toFixed(1)} ч`;
  return `${diffMin} мин`;
}

/**
 * Пересчитывает статистику для книжного остатка на основе chartData
 * Исправляет значения, полученные из tankHistoryService
 */
export function recalculateVolumeBookStats(chartData: ChartDataPoint[]): {
  current: number;
  min: number;
  max: number;
  avg: number;
} {
  if (chartData.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0 };
  }

  const volumeBookValues = chartData.map(point => point.volumeBook);

  return {
    current: volumeBookValues[volumeBookValues.length - 1],
    min: Math.min(...volumeBookValues),
    max: Math.max(...volumeBookValues),
    avg: volumeBookValues.reduce((a, b) => a + b, 0) / volumeBookValues.length
  };
}
