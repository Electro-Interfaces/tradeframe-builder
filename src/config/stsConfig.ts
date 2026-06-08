/**
 * Конфигурация STS API
 * Сети: БТО=15, ГИГ=65, Энтиком=29, ВиБенз=19
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

  // Колонка external_id — источник истины (её меняют миграции при смене system).
  // settings.external_id — legacy-дубль, оставлен только как fallback, чтобы не
  // перебивать колонку (иначе при смене external_id в колонке, но не в settings,
  // в STS уходит устаревший system — см. инцидент переезда ГИГ 65→15).
  const externalId = network.external_id || network.settings?.external_id;

  if (externalId && !isNaN(parseInt(externalId))) {
    return parseInt(externalId);
  }

  throw new Error(`У сети не задан external_id — невозможно определить system ID для STS API`);
}
