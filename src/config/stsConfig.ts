/**
 * Конфигурация STS API
 */

/**
 * Код системы по умолчанию для STS API (БТО)
 * Используется как fallback если external_id сети не задан
 */
export const STS_SYSTEM_ID = 15;

/**
 * Получить system ID для выбранной сети
 * Использует external_id из настроек сети
 *
 * @param network - Объект сети с settings.external_id
 * @returns System ID для STS API
 */
export function getSystemId(network?: { settings?: { external_id?: string }; external_id?: string } | null): number {
  if (!network) {
    return STS_SYSTEM_ID;
  }

  // Проверяем external_id в settings
  const externalId = network.settings?.external_id || network.external_id;

  if (externalId && !isNaN(parseInt(externalId))) {
    return parseInt(externalId);
  }

  return STS_SYSTEM_ID;
}
