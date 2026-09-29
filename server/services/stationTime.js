/**
 * Время станции → момент с учётом часового пояса сети (networks.settings.timezone).
 * STS отдаёт время без пояса — это настенные часы станции. Копия логики фронта:
 * src/utils/stationTime.ts.
 */

const DEFAULT_TIMEZONE = 'Europe/Moscow';

function tzOffsetMs(date, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)) p[x.type] = x.value;
  const wallAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function stationTimeToDate(value, tz = DEFAULT_TIMEZONE) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d))?(?:\.\d+)?$/);
  if (!m) return new Date(s);
  const wallAsUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  return new Date(wallAsUtc - tzOffsetMs(new Date(wallAsUtc), tz || DEFAULT_TIMEZONE));
}

module.exports = { DEFAULT_TIMEZONE, stationTimeToDate };
