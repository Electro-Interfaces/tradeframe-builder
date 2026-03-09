/**
 * Сервис для работы с настройками автокалибровки резервуаров
 */

import type { TankCalibrationSettings } from '@/types/tanks';

const API_BASE_URL = '/api/tank-calibration';

function getAuthToken(): string {
  return localStorage.getItem('auth_token')
    || sessionStorage.getItem('auth_token')
    || '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Получить настройки калибровки для резервуара
 */
export async function getCalibrationSettings(tankId: string): Promise<TankCalibrationSettings | null> {
  const response = await fetch(`${API_BASE_URL}/${tankId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch calibration settings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Сохранить настройки калибровки резервуара
 */
export async function saveCalibrationSettings(settings: TankCalibrationSettings): Promise<TankCalibrationSettings> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error(`Failed to save calibration settings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Удалить настройки калибровки резервуара
 */
export async function deleteCalibrationSettings(tankId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${tankId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete calibration settings: ${response.statusText}`);
  }
}

/**
 * Запустить процесс калибровки для резервуара
 */
export async function runCalibration(tankId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/${tankId}/run`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to run calibration: ${response.statusText}`);
  }

  return response.json();
}
