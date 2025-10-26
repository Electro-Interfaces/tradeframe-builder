/**
 * Сервис для работы с калибровочными таблицами резервуаров
 */

import type {
  CalibrationTable,
  CalculateCalibrationTableParams,
  CalculateCalibrationTableResult
} from '@/types/tanks';

const API_BASE = '/api/tank-calibration';

/**
 * Рассчитать новую калибровочную таблицу
 */
export async function calculateCalibrationTable(
  params: CalculateCalibrationTableParams
): Promise<CalculateCalibrationTableResult> {
  try {
    const response = await fetch(`${API_BASE}/${params.tank_id}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        period: params.period,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to calculate calibration table');
    }

    return await response.json();
  } catch (error) {
    console.error('Calculate calibration table error:', error);
    throw error;
  }
}

/**
 * Получить список всех калибровочных таблиц резервуара
 */
export async function getCalibrationTables(tankId: string): Promise<CalibrationTable[]> {
  try {
    const response = await fetch(`${API_BASE}/${tankId}/tables`);

    if (!response.ok) {
      throw new Error('Failed to fetch calibration tables');
    }

    return await response.json();
  } catch (error) {
    console.error('Get calibration tables error:', error);
    throw error;
  }
}

/**
 * Получить конкретную калибровочную таблицу по ID
 */
export async function getCalibrationTable(tableId: string): Promise<CalibrationTable> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch calibration table');
    }

    return await response.json();
  } catch (error) {
    console.error('Get calibration table error:', error);
    throw error;
  }
}

/**
 * Скачать калибровочную таблицу в указанном формате
 */
export async function downloadCalibrationTable(
  tableId: string,
  format: 'csv' | 'json' | 'xlsx' = 'csv'
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}/download?format=${format}`);

    if (!response.ok) {
      throw new Error('Failed to download calibration table');
    }

    // Получить имя файла из заголовка Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `calibration_table_${tableId}.${format}`;

    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    // Скачать файл
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download calibration table error:', error);
    throw error;
  }
}

/**
 * Утвердить калибровочную таблицу (только admin)
 */
export async function approveCalibrationTable(
  tableId: string,
  notes?: string
): Promise<CalibrationTable> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve calibration table');
    }

    const result = await response.json();
    return result.table;
  } catch (error) {
    console.error('Approve calibration table error:', error);
    throw error;
  }
}

/**
 * Отклонить калибровочную таблицу (только admin)
 */
export async function rejectCalibrationTable(
  tableId: string,
  reason: string
): Promise<CalibrationTable> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject calibration table');
    }

    const result = await response.json();
    return result.table;
  } catch (error) {
    console.error('Reject calibration table error:', error);
    throw error;
  }
}

/**
 * Применить калибровочную таблицу (сделать активной) - только admin
 */
export async function applyCalibrationTable(tableId: string): Promise<CalibrationTable> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to apply calibration table');
    }

    const result = await response.json();
    return result.table;
  } catch (error) {
    console.error('Apply calibration table error:', error);
    throw error;
  }
}

/**
 * Удалить калибровочную таблицу
 */
export async function deleteCalibrationTable(tableId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/tables/${tableId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete calibration table');
    }
  } catch (error) {
    console.error('Delete calibration table error:', error);
    throw error;
  }
}
