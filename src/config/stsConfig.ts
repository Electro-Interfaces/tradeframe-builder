/**
 * Конфигурация STS API
 * Сети: БТО=15, ГИГ=65, Энтиком=29
 */

/**
 * Получить system ID для выбранной сети
 * Возвращает null если сеть не выбрана (нормальная ситуация при загрузке)
 * Бросает ошибку если сеть выбрана, но external_id не задан (ошибка конфигурации)
 */
export function getSystemId(network?: { settings?: { external_id?: string }; external_id?: string } | null): number | null {
  if (!network) {
    return null;
  }

  const externalId = network.settings?.external_id || network.external_id;

  if (externalId && !isNaN(parseInt(externalId))) {
    return parseInt(externalId);
  }

  throw new Error(`У сети не задан external_id — невозможно определить system ID для STS API`);
}
