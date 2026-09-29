/**
 * Время станции и часовой пояс сети.
 *
 * STS отдаёт время строкой без пояса ("2026-09-29T07:59:25") — это настенные
 * часы станции. Для сетей не в МСК (АЗС Н1, Тюмень, МСК+2) пояс задаётся в
 * networks.settings.timezone (IANA). Настенное время показываем как есть,
 * а переводим в момент только там, где оно сравнивается с «сейчас».
 * Копия логики на сервере: server/services/stationTime.js.
 */

export const DEFAULT_TIMEZONE = 'Europe/Moscow';

/** Пояс сети из её настроек; пусто — МСК. */
export function networkTimezone(network?: { settings?: Record<string, any> } | null): string {
  return network?.settings?.timezone || DEFAULT_TIMEZONE;
}

// Части момента date по настенным часам пояса tz.
function wallParts(date: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)) p[x.type] = x.value;
  return p;
}

// Смещение пояса tz от UTC в миллисекундах на момент date.
function tzOffsetMs(date: Date, tz: string): number {
  const p = wallParts(date, tz);
  const wallAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Время станции (строка без пояса) → момент. Строка с поясом/Z берётся как есть. */
export function stationTimeToDate(value: string | null | undefined, tz: string = DEFAULT_TIMEZONE): Date | null {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d))?(?:\.\d+)?$/);
  if (!m) return new Date(s);
  const wallAsUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return new Date(wallAsUtc - tzOffsetMs(new Date(wallAsUtc), tz));
}

/** Момент → настенное время станции строкой без пояса "YYYY-MM-DDTHH:mm:ss" (формат STS). */
export function formatStationTime(date: Date, tz: string = DEFAULT_TIMEZONE): string {
  const p = wallParts(date, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

/** Подпись пояса относительно МСК: '' для МСК, иначе «МСК+2». */
export function mskOffsetLabel(tz: string = DEFAULT_TIMEZONE, at: Date = new Date()): string {
  const h = Math.round((tzOffsetMs(at, tz) - tzOffsetMs(at, DEFAULT_TIMEZONE)) / 3600000);
  return h === 0 ? '' : `МСК${h > 0 ? '+' : ''}${h}`;
}
