/**
 * Сервис для работы с калибровочными таблицами резервуаров
 */

import type {
  CalibrationDiagnostics,
  CalibrationTable,
  CalibrationTableComparison,
  CalibrationTablePoint,
  CalibrationTableStatistics,
  CalculateCalibrationTableParams,
  CalculateCalibrationTableResult,
  TankCalibrationSettings
} from '@/types/tanks';

const API_BASE_URL = '/api/tank-calibration';

export interface CreateCalibrationTableParams {
  tank_id: string;
  table: CalibrationTablePoint[];
  analysis_start_date: string;
  analysis_end_date: string;
  creation_notes?: string;
  calibration_settings_snapshot?: TankCalibrationSettings;
  statistics?: CalibrationTableStatistics;
  diagnostics?: CalibrationDiagnostics;
  comparison_with_previous?: CalibrationTableComparison;
}

const STUB_ERROR = (endpoint: string) =>
  new Error(`Backend endpoint not implemented: ${endpoint}. Используйте клиентский расчёт в AnalysisDialog.`);

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseError(response: Response): Promise<Error> {
  try {
    const payload = await response.json();
    return new Error(payload?.error || response.statusText || 'Request failed');
  } catch {
    return new Error(response.statusText || 'Request failed');
  }
}

/**
 * Серверный алгоритм пока не реализован, расчёт выполняется на клиенте.
 */
export async function calculateCalibrationTable(
  params: CalculateCalibrationTableParams
): Promise<CalculateCalibrationTableResult> {
  throw STUB_ERROR(`POST /${params.tank_id}/calculate`);
}

export async function createCalibrationTable(
  params: CreateCalibrationTableParams
): Promise<CalibrationTable> {
  const response = await fetch(`${API_BASE_URL}/${params.tank_id}/tables`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function getCalibrationTables(tankId: string): Promise<CalibrationTable[]> {
  const response = await fetch(`${API_BASE_URL}/${tankId}/tables`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function getCalibrationTable(tableId: string): Promise<CalibrationTable> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function downloadCalibrationTable(
  tableId: string,
  format: 'csv' | 'json' | 'xlsx' = 'csv'
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}/download?format=${format}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);

  link.href = url;
  link.download = filenameMatch?.[1] || `calibration_table.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function approveCalibrationTable(
  tableId: string,
  notes?: string
): Promise<CalibrationTable> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ notes }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function rejectCalibrationTable(
  tableId: string,
  reason: string
): Promise<CalibrationTable> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function applyCalibrationTable(tableId: string): Promise<CalibrationTable> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}/apply`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.json();
}

export async function deleteCalibrationTable(tableId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tables/${tableId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw await parseError(response);
  }
}
