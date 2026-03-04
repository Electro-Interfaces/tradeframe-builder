/**
 * Сервис для работы с калибровочными таблицами резервуаров
 *
 * ВНИМАНИЕ: Бэкенд-эндпоинты для этих функций НЕ реализованы.
 * server/routes/tankCalibration.js содержит только GET/POST/DELETE настроек + /run (заглушка).
 * Эти функции сохранены как контракт для будущей реализации бэкенда.
 */

import type {
  CalibrationTable,
  CalculateCalibrationTableParams,
  CalculateCalibrationTableResult
} from '@/types/tanks';

const STUB_ERROR = (endpoint: string) =>
  new Error(`Backend endpoint not implemented: ${endpoint}. Используйте клиентский расчёт в AnalysisDialog.`);

/**
 * Рассчитать новую калибровочную таблицу
 * STUB: POST /:tankId/calculate — не реализован на бэкенде
 */
export async function calculateCalibrationTable(
  params: CalculateCalibrationTableParams
): Promise<CalculateCalibrationTableResult> {
  throw STUB_ERROR(`POST /${params.tank_id}/calculate`);
}

/**
 * Получить список всех калибровочных таблиц резервуара
 * STUB: GET /:tankId/tables — не реализован на бэкенде
 */
export async function getCalibrationTables(tankId: string): Promise<CalibrationTable[]> {
  throw STUB_ERROR(`GET /${tankId}/tables`);
}

/**
 * Получить конкретную калибровочную таблицу по ID
 * STUB: GET /tables/:tableId — не реализован на бэкенде
 */
export async function getCalibrationTable(tableId: string): Promise<CalibrationTable> {
  throw STUB_ERROR(`GET /tables/${tableId}`);
}

/**
 * Скачать калибровочную таблицу в указанном формате
 * STUB: GET /tables/:tableId/download — не реализован на бэкенде
 */
export async function downloadCalibrationTable(
  tableId: string,
  format: 'csv' | 'json' | 'xlsx' = 'csv'
): Promise<void> {
  throw STUB_ERROR(`GET /tables/${tableId}/download?format=${format}`);
}

/**
 * Утвердить калибровочную таблицу (только admin)
 * STUB: POST /tables/:tableId/approve — не реализован на бэкенде
 */
export async function approveCalibrationTable(
  tableId: string,
  notes?: string
): Promise<CalibrationTable> {
  throw STUB_ERROR(`POST /tables/${tableId}/approve`);
}

/**
 * Отклонить калибровочную таблицу (только admin)
 * STUB: POST /tables/:tableId/reject — не реализован на бэкенде
 */
export async function rejectCalibrationTable(
  tableId: string,
  reason: string
): Promise<CalibrationTable> {
  throw STUB_ERROR(`POST /tables/${tableId}/reject`);
}

/**
 * Применить калибровочную таблицу (сделать активной) - только admin
 * STUB: POST /tables/:tableId/apply — не реализован на бэкенде
 */
export async function applyCalibrationTable(tableId: string): Promise<CalibrationTable> {
  throw STUB_ERROR(`POST /tables/${tableId}/apply`);
}

/**
 * Удалить калибровочную таблицу
 * STUB: DELETE /tables/:tableId — не реализован на бэкенде
 */
export async function deleteCalibrationTable(tableId: string): Promise<void> {
  throw STUB_ERROR(`DELETE /tables/${tableId}`);
}
