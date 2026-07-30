/**
 * Белый список измерений сводной («Операции» → таб «Сводная»).
 *
 * Один справочник на оба источника: PG считает GROUP BY по `sql`, STS-фолбэк
 * группирует те же строки в памяти по `valueOf`. Если завести измерение только
 * в одном из них — сводная начнёт врать на периодах глубже покрытия PG.
 *
 * В SQL попадает ТОЛЬКО `sql` из этой карты, никогда — значение из запроса.
 */

const DIMS = {
  station: { label: 'Станция',      sql: 'station_code',                    valueOf: (r) => r.stationCode },
  fuel:    { label: 'Вид топлива',  sql: 'fuel_name',                       valueOf: (r) => r.fuelName ?? null },
  payment: { label: 'Способ оплаты', sql: 'payment_method',                 valueOf: (r) => r.paymentMethod || null },
  payType: { label: 'Тип оплаты',   sql: 'pay_type_name',                   valueOf: (r) => r.payTypeName || null },
  day:     { label: 'День',         sql: 'dt::date',                        valueOf: (r) => String(r.dt || '').slice(0, 10) },
  month:   { label: 'Месяц',        sql: `to_char(dt, 'YYYY-MM')`,          valueOf: (r) => String(r.dt || '').slice(0, 7) },
  hour:    { label: 'Час',          sql: 'extract(hour FROM dt)::int',      valueOf: (r) => {
    const h = parseInt(String(r.dt || '').slice(11, 13), 10);
    return Number.isFinite(h) ? h : null;
  } },
  shift:   { label: 'Смена',        sql: 'shift',                           valueOf: (r) => r.shift ?? null },
  pos:     { label: 'ПОС',          sql: 'pos',                             valueOf: (r) => r.pos ?? null },
  nozzle:  { label: 'Пистолет',     sql: 'nozzle',                          valueOf: (r) => r.nozzle ?? null },
  tank:    { label: 'Резервуар',    sql: 'tank',                            valueOf: (r) => r.tank ?? null },
};

const MAX_DIMS = 5;

/**
 * Разбор параметра dims (CSV) в список валидных ключей.
 * Бросает Error с понятным текстом — роут отдаёт его как 400.
 */
function parseDims(raw) {
  const keys = String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error('Не указаны измерения (dims)');
  if (keys.length > MAX_DIMS) throw new Error(`Слишком много измерений: максимум ${MAX_DIMS}`);
  const unknown = keys.filter((k) => !DIMS[k]);
  if (unknown.length) throw new Error(`Неизвестные измерения: ${unknown.join(', ')}`);
  if (new Set(keys).size !== keys.length) throw new Error('Измерения не должны повторяться');
  return keys;
}

module.exports = { DIMS, MAX_DIMS, parseDims };
