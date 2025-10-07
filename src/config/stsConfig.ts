/**
 * Конфигурация STS API
 */

/**
 * Код системы для STS API
 * Используется в запросах к STS API для идентификации системы
 */
export const STS_SYSTEM_ID = 15;

/**
 * Получить system ID для выбранной сети
 * В будущем можно расширить логику для разных сетей
 *
 * @param networkId - ID сети (опционально)
 * @returns System ID для STS API
 */
export function getSystemId(networkId?: string): number {
  // В будущем можно добавить маппинг по networkId
  // const systemMapping: Record<string, number> = {
  //   'network-1': 15,
  //   'network-2': 16,
  // };
  // return systemMapping[networkId] || STS_SYSTEM_ID;

  return STS_SYSTEM_ID;
}
