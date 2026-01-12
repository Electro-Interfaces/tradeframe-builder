/**
 * Модуль построчной сверки Corp ↔ TF
 *
 * Алгоритм сопоставления:
 * - По станции (exact match)
 * - По времени (±1 минута)
 * - По топливу (нормализованные имена)
 * - Проверка литров для определения статуса (matched/mismatch)
 */

import type {
  ReconciliationTransaction,
  ReconciliationTransactionStatus,
  CorpTransaction,
  TfTransaction,
  ShiftInfo
} from '@/types/reconciliation';

import { TIME_TOLERANCE_MS, LITERS_TOLERANCE, TRANSACTION_STATUS_ORDER } from './constants';
import { normalizeFuelName, getStationName } from './utils';

/**
 * Результат построчной сверки
 */
export interface MatchingResult {
  transactions: ReconciliationTransaction[];
  matched: number;
  onlyCorp: number;
  onlyTf: number;
  mismatch: number;
}

/**
 * Этап 1: Построчная сверка Corp ↔ TF
 */
export function performLineByLineReconciliation(
  corpTransactions: CorpTransaction[],
  tfTransactions: TfTransaction[],
  shiftsInfo: ShiftInfo[],
  stationNameMap: Map<number, string>
): MatchingResult {
  const transactions: ReconciliationTransaction[] = [];
  const matchedTfIds = new Set<number>();
  const matchedCorpIds = new Set<number>();

  let matched = 0;
  let onlyCorp = 0;
  let onlyTf = 0;
  let mismatch = 0;

  // Фильтруем нулевые транзакции Corp (авторизации без заправки, отмены)
  const filteredCorpTransactions = corpTransactions.filter(tx => Math.abs(tx.quantity) > 0);

  // Для каждой Corp транзакции ищем соответствие в TF
  for (const corp of filteredCorpTransactions) {
    const corpDate = new Date(corp.date);
    const corpFuel = normalizeFuelName(corp.productName);

    // Ищем TF по: станция + время (±1 мин) + топливо
    let bestMatch: TfTransaction | null = null;
    let bestTimeDiff = Infinity;

    for (const tf of tfTransactions) {
      if (matchedTfIds.has(tf.id)) continue;
      if (tf.stationId !== corp.stationNumber) continue;

      const tfFuel = normalizeFuelName(tf.fuelType);
      if (tfFuel !== corpFuel) continue;

      const tfDate = new Date(tf.date);
      const timeDiff = Math.abs(corpDate.getTime() - tfDate.getTime());

      if (timeDiff <= TIME_TOLERANCE_MS && timeDiff < bestTimeDiff) {
        bestMatch = tf;
        bestTimeDiff = timeDiff;
      }
    }

    const shiftId = findShiftForTransaction(corp.stationNumber, corpDate, shiftsInfo);

    if (bestMatch) {
      matchedTfIds.add(bestMatch.id);
      matchedCorpIds.add(corp.id);

      // Проверяем совпадение литров
      const corpLiters = Math.abs(corp.quantity);
      const tfLiters = Math.abs(bestMatch.volume);
      const litersMatch = Math.abs(corpLiters - tfLiters) < LITERS_TOLERANCE;

      let status: ReconciliationTransactionStatus;
      if (litersMatch) {
        status = 'matched';
        matched++;
      } else {
        status = 'mismatch';
        mismatch++;
      }

      transactions.push({
        id: `match_${corp.id}_${bestMatch.id}`,
        date: corp.date,
        stationId: corp.stationNumber,
        stationName: getStationName(corp.stationNumber, stationNameMap),
        fuelType: corp.productName,
        cardNumber: corp.cardNumber,
        shiftId,
        corpLiters,
        tfLiters,
        corpTransactionId: corp.id,
        tfTransactionId: bestMatch.id,
        status
      });
    } else {
      // Только в Corp
      onlyCorp++;
      transactions.push({
        id: `corp_${corp.id}`,
        date: corp.date,
        stationId: corp.stationNumber,
        stationName: getStationName(corp.stationNumber, stationNameMap),
        fuelType: corp.productName,
        cardNumber: corp.cardNumber,
        shiftId,
        corpLiters: Math.abs(corp.quantity),
        tfLiters: null,
        corpTransactionId: corp.id,
        status: 'only_corp'
      });
    }
  }

  // TF транзакции без соответствия в Corp (также пропускаем нулевые)
  for (const tf of tfTransactions) {
    if (matchedTfIds.has(tf.id)) continue;
    if (Math.abs(tf.volume) <= 0) continue; // Пропускаем нулевые транзакции

    onlyTf++;
    const tfDate = new Date(tf.date);
    const shiftId = findShiftForTransaction(tf.stationId, tfDate, shiftsInfo);

    transactions.push({
      id: `tf_${tf.id}`,
      date: tf.date,
      stationId: tf.stationId,
      stationName: getStationName(tf.stationId, stationNameMap),
      fuelType: tf.fuelType,
      cardNumber: tf.cardNumber || '',
      shiftId,
      corpLiters: null,
      tfLiters: Math.abs(tf.volume),
      tfTransactionId: tf.id,
      status: 'only_tf'
    });
  }

  // Сортируем: сначала расхождения, потом совпадения
  transactions.sort((a, b) => {
    const orderDiff = TRANSACTION_STATUS_ORDER[a.status] - TRANSACTION_STATUS_ORDER[b.status];
    if (orderDiff !== 0) return orderDiff;
    return a.date.localeCompare(b.date);
  });

  return { transactions, matched, onlyCorp, onlyTf, mismatch };
}

/**
 * Определить смену для транзакции по времени
 */
export function findShiftForTransaction(
  stationId: number,
  date: Date,
  shiftsInfo: ShiftInfo[]
): number | null {
  for (const shift of shiftsInfo) {
    if (shift.stationId !== stationId) continue;

    const openedAt = shift.openedAt ? new Date(shift.openedAt) : null;
    const closedAt = shift.closedAt ? new Date(shift.closedAt) : null;

    if (openedAt && closedAt) {
      if (date >= openedAt && date < closedAt) {
        return shift.id;
      }
    } else if (openedAt && !closedAt) {
      // Смена не закрыта
      if (date >= openedAt) {
        return shift.id;
      }
    }
  }

  return null;
}
