/**
 * Утилиты для работы с торговыми точками
 */

/**
 * Извлекает номер станции STS API из объекта торговой точки
 *
 * Приоритет извлечения:
 * 1. external_id (если это число)
 * 2. Код из externalCodes с system='sts' и isActive=true
 * 3. Номер из ID (например, bto-azs-4 -> 4)
 *
 * @param tradingPoint - Объект торговой точки
 * @returns Номер станции или undefined если не найден
 */
export function extractStationNumber(tradingPoint: any): number | undefined {
  if (!tradingPoint) {
    return undefined;
  }

  // 1. Проверяем external_id
  if (tradingPoint.external_id && !isNaN(parseInt(tradingPoint.external_id))) {
    const stationNum = parseInt(tradingPoint.external_id);
    return stationNum;
  }

  // 2. Ищем код для системы STS в externalCodes
  const stsCode = tradingPoint.externalCodes?.find(
    (code: any) => code.system === 'sts' && code.isActive
  );
  if (stsCode && !isNaN(parseInt(stsCode.code))) {
    return parseInt(stsCode.code);
  }

  // 3. Пытаемся извлечь номер из ID (например, bto-azs-4 -> 4)
  if (tradingPoint.id) {
    const match = tradingPoint.id.match(/(\d+)$/);
    if (match) {
      return parseInt(match[1]);
    }
  }

  return undefined;
}

/**
 * Проверяет, настроен ли номер станции STS API для торговой точки
 *
 * @param tradingPoint - Объект торговой точки
 * @returns true если номер станции настроен
 */
export function hasStationNumber(tradingPoint: any): boolean {
  return extractStationNumber(tradingPoint) !== undefined;
}
