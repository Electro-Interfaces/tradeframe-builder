/**
 * Сервис для работы с настройками автокалибровки резервуаров
 */

import type { TankCalibrationSettings } from '@/types/tanks';

const API_BASE_URL = '/api/tank-calibration';

/**
 * Получить настройки калибровки для резервуара
 */
export async function getCalibrationSettings(tankId: string): Promise<TankCalibrationSettings | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${tankId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch calibration settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching calibration settings:', error);
    throw error;
  }
}

/**
 * Сохранить настройки калибровки резервуара
 */
export async function saveCalibrationSettings(settings: TankCalibrationSettings): Promise<TankCalibrationSettings> {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`Failed to save calibration settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving calibration settings:', error);
    throw error;
  }
}

/**
 * Удалить настройки калибровки резервуара
 */
export async function deleteCalibrationSettings(tankId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/${tankId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete calibration settings: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting calibration settings:', error);
    throw error;
  }
}

/**
 * Запустить процесс калибровки для резервуара
 */
export async function runCalibration(tankId: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/${tankId}/run`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to run calibration: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error running calibration:', error);
    throw error;
  }
}
