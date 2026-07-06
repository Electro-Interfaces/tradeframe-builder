/**
 * Разбор строки поиска Операций в поля серверного запроса.
 * Сохраняет умный поиск вида «смена 9 азс 6 чек 42 карта 1234»:
 * распознанные сущности уходят точными фильтрами, остаток — свободным текстом.
 */
export interface ParsedSearch {
  shift?: string;
  station?: string;
  receipt?: string;
  pos?: string;
  card?: string;
  search?: string;
}

const PATTERNS: { regex: RegExp; field: keyof ParsedSearch }[] = [
  { regex: /(?:смена|shift)\s+(\d+)/i, field: 'shift' },
  { regex: /(\d+)\s+(?:смена|shift)/i, field: 'shift' },
  { regex: /(?:азс|станция|station|тт)\s+(\d+)/i, field: 'station' },
  { regex: /(\d+)\s+(?:азс|станция|station|тт)/i, field: 'station' },
  { regex: /(?:чек|receipt)\s+(\d+)/i, field: 'receipt' },
  { regex: /(\d+)\s+(?:чек|receipt)/i, field: 'receipt' },
  { regex: /(?:карта|card)\s+(\S+)/i, field: 'card' },
  { regex: /(?:pos|пос)\s+(\d+)/i, field: 'pos' },
];

export function parseOperationsSearch(query: string): ParsedSearch {
  const q = (query || '').trim();
  if (!q) return {};

  const result: ParsedSearch = {};
  let remaining = q;

  for (const { regex, field } of PATTERNS) {
    if (result[field]) continue; // поле уже распознано
    const m = remaining.match(regex);
    if (m) {
      result[field] = m[1];
      remaining = remaining.replace(m[0], ' ');
    }
  }

  const rest = remaining.trim().replace(/\s+/g, ' ');
  if (rest) {
    // Чистое число без ключевого слова — трактуем как чек (самый частый кейс),
    // иначе свободный текст (карта/топливо).
    if (/^\d+$/.test(rest) && !result.receipt && !result.shift && !result.station && !result.pos) {
      result.search = rest;
    } else if (rest) {
      result.search = rest;
    }
  }
  return result;
}
