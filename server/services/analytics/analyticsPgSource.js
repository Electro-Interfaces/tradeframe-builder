/**
 * Агрегаты для «Обзора»/«Операций» из материализованной таблицы sts_transactions.
 * Всё через SQL GROUP BY — десятки/сотни мс вместо тащить сотни тысяч строк в
 * браузер. Период произвольный: [from, to] по дате.
 */
const postgres = require('../../db/pool');

// Границы периода в timestamptz (весь день to включительно)
function bounds(from, to) {
  return { from: `${from} 00:00:00`, to: `${to} 23:59:59.999` };
}

// Пересечение scope пользователя (allowedStations) и явного выбора станций
// (stations из UI). Возвращает {clause, params} для дописывания в WHERE.
// null-массивы означают «без ограничения». Пустой результат-массив → фильтр,
// который никогда не совпадёт (чтобы не показать чужое).
function stationScopeClause(allowedStations, stations, params) {
  const a = Array.isArray(allowedStations) ? allowedStations.map(Number).filter(Number.isFinite) : null;
  const s = Array.isArray(stations) ? stations.map(Number).filter(Number.isFinite) : null;
  let list;
  if (a && s) list = a.filter((x) => s.includes(x)); // пересечение
  else list = a || s; // одно из ограничений или ни одного
  if (!list) return ''; // без ограничения станций
  params.push(list);
  return ` AND station_code = ANY($${params.length}::int[])`;
}

// Сводка «Обзора»: KPI + разбивки по топливу/оплате/дням/часам/станциям.
// allowedStations — scope пользователя (null = без ограничений);
// stations — явный выбор станций в UI (null/пусто = все точки сети).
async function getOverview({ networkIds, from, to, allowedStations, stations }) {
  const b = bounds(from, to);
  const params = [networkIds, b.from, b.to];
  const scope = stationScopeClause(allowedStations, stations, params);
  const where = `WHERE network_id = ANY($1::uuid[]) AND dt >= $2 AND dt <= $3${scope}`;

  const [kpi, byFuel, byPayment, byDay, byHour, byStation, byDayFuel, byDayHour] = await Promise.all([
    postgres.queryOne(`
      SELECT count(*)::int ops,
             COALESCE(sum(quantity),0) volume,
             COALESCE(sum(cost),0) revenue,
             COALESCE(avg(cost),0) avg_check
        FROM sts_transactions ${where}`, params),
    postgres.query(`
      SELECT fuel_name, fuel_code, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY fuel_name, fuel_code ORDER BY revenue DESC NULLS LAST`, params),
    postgres.query(`
      SELECT payment_method, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY payment_method ORDER BY revenue DESC NULLS LAST`, params),
    postgres.query(`
      SELECT dt::date AS day_date, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY dt::date ORDER BY dt::date`, params),
    postgres.query(`
      SELECT extract(hour FROM dt)::int AS hour_num, count(*)::int ops,
             COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY hour_num ORDER BY hour_num`, params),
    postgres.query(`
      SELECT station_code, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY station_code ORDER BY revenue DESC NULLS LAST`, params),
    // День × топливо — для стекового графика «Реализация по дням»
    postgres.query(`
      SELECT dt::date AS day_date, fuel_name, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY dt::date, fuel_name ORDER BY dt::date`, params),
    // День × час — для тепловой карты активности
    postgres.query(`
      SELECT dt::date AS day_date, extract(hour FROM dt)::int AS hour_num,
             count(*)::int ops, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY dt::date, extract(hour FROM dt) ORDER BY dt::date, hour_num`, params),
  ]);

  return {
    period: { from, to },
    kpi: {
      operations: kpi.ops,
      volume: Number(kpi.volume),
      revenue: Number(kpi.revenue),
      avgCheck: Number(kpi.avg_check),
    },
    byFuel: byFuel.rows.map(r => ({ fuel: r.fuel_name, fuelCode: r.fuel_code, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byPayment: byPayment.rows.map(r => ({ method: r.payment_method, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byDay: byDay.rows.map(r => ({ date: r.day_date, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byHour: byHour.rows.map(r => ({ hour: r.hour_num, operations: r.ops, revenue: Number(r.revenue) })),
    byStation: byStation.rows.map(r => ({ stationCode: r.station_code, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byDayFuel: byDayFuel.rows.map(r => ({ date: r.day_date, fuel: r.fuel_name, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byDayHour: byDayHour.rows.map(r => ({ date: r.day_date, hour: r.hour_num, operations: r.ops, revenue: Number(r.revenue) })),
  };
}

// Детальная аналитика Обзора (расширенный блок): станция×топливо, станция×день,
// день×оплата. Отдельно от getOverview, чтобы не утяжелять базовый overview,
// который дёргают Операции. Период произвольный.
async function getDetailedAnalytics({ networkIds, from, to, allowedStations, stations }) {
  const b = bounds(from, to);
  const params = [networkIds, b.from, b.to];
  const scope = stationScopeClause(allowedStations, stations, params);
  const where = `WHERE network_id = ANY($1::uuid[]) AND dt >= $2 AND dt <= $3${scope}`;

  const [byStationFuel, byStationDay, byDayPayment] = await Promise.all([
    // Станция × топливо — StationFuelSalesChart
    postgres.query(`
      SELECT station_code, fuel_name, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY station_code, fuel_name ORDER BY station_code`, params),
    // Станция × день — StationRevenueTrendChart
    postgres.query(`
      SELECT station_code, dt::date AS day_date, count(*)::int ops,
             COALESCE(sum(quantity),0) volume, COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY station_code, dt::date ORDER BY station_code, dt::date`, params),
    // День × оплата — CashlessShareTrend
    postgres.query(`
      SELECT dt::date AS day_date, payment_method, count(*)::int ops,
             COALESCE(sum(cost),0) revenue
        FROM sts_transactions ${where}
       GROUP BY dt::date, payment_method ORDER BY dt::date`, params),
  ]);

  return {
    byStationFuel: byStationFuel.rows.map(r => ({ stationCode: r.station_code, fuel: r.fuel_name, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byStationDay: byStationDay.rows.map(r => ({ stationCode: r.station_code, date: r.day_date, operations: r.ops, volume: Number(r.volume), revenue: Number(r.revenue) })),
    byDayPayment: byDayPayment.rows.map(r => ({ date: r.day_date, method: r.payment_method, operations: r.ops, revenue: Number(r.revenue) })),
  };
}

// Список операций с серверной пагинацией + те же KPI/разбивки для шапки.
async function getOperations({ networkIds, from, to, allowedStations, fuels, payments, station, stations, shift, receipt, pos, card, search, page = 1, pageSize = 100 }) {
  const b = bounds(from, to);
  const params = [networkIds, b.from, b.to];
  const conds = [`network_id = ANY($1::uuid[])`, `dt >= $2`, `dt <= $3`];
  if (Array.isArray(allowedStations)) { params.push(allowedStations); conds.push(`station_code = ANY($${params.length}::int[])`); }
  // Мультивыбор топлива/оплаты (KPI-карточки) — массивы значений
  const fuelArr = Array.isArray(fuels) ? fuels.filter(Boolean) : (fuels ? [fuels] : []);
  const payArr = Array.isArray(payments) ? payments.filter(Boolean) : (payments ? [payments] : []);
  if (fuelArr.length) { params.push(fuelArr); conds.push(`fuel_name = ANY($${params.length}::text[])`); }
  if (payArr.length) { params.push(payArr); conds.push(`payment_method = ANY($${params.length}::text[])`); }
  if (station) { params.push(Number(station)); conds.push(`station_code = $${params.length}`); }
  // Мультивыбор станций (выбор точек в шапке). Пересекается со scope-ограничением
  // выше (оба через AND), поэтому чужое не покажет.
  const stationArr = Array.isArray(stations) ? stations.map(Number).filter(Number.isFinite) : [];
  if (stationArr.length) { params.push(stationArr); conds.push(`station_code = ANY($${params.length}::int[])`); }
  // Разобранные поля умного поиска (строгое совпадение по числам)
  if (shift) { params.push(Number(shift)); conds.push(`shift = $${params.length}`); }
  if (receipt) { params.push(Number(receipt)); conds.push(`receipt = $${params.length}`); }
  if (pos) { params.push(Number(pos)); conds.push(`pos = $${params.length}`); }
  if (card) { params.push(`%${card}%`); conds.push(`card ILIKE $${params.length}`); }
  // Свободный текст (остаток запроса) — по карте/топливу/чеку
  if (search) { params.push(`%${search}%`); conds.push(`(CAST(receipt AS TEXT) ILIKE $${params.length} OR card ILIKE $${params.length} OR fuel_name ILIKE $${params.length})`); }
  const where = `WHERE ${conds.join(' AND ')}`;

  const total = await postgres.queryOne(`SELECT count(*)::int c FROM sts_transactions ${where}`, params);

  const limit = Math.min(Math.max(Number(pageSize) || 100, 1), 500);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  params.push(limit); const limitParam = params.length;
  params.push(offset); const offsetParam = params.length;

  const rows = await postgres.query(`
    SELECT sts_id, dt, station_code, receipt, shift, pos, nozzle, tank, fuel_name, fuel_code,
           quantity, price, cost, mass, payment_method, pay_type_name, card, status,
           order_qty, order_cost
      FROM sts_transactions ${where}
     ORDER BY dt DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`, params);

  return {
    total: total.c,
    page: Number(page) || 1,
    pageSize: limit,
    rows: rows.rows.map(r => ({
      stsId: r.sts_id, dt: r.dt, stationCode: r.station_code, receipt: r.receipt, shift: r.shift,
      pos: r.pos, nozzle: r.nozzle, tank: r.tank, fuelName: r.fuel_name, fuelCode: r.fuel_code,
      quantity: Number(r.quantity), price: Number(r.price), cost: Number(r.cost),
      mass: r.mass != null ? Number(r.mass) : null, paymentMethod: r.payment_method,
      payTypeName: r.pay_type_name, card: r.card, status: r.status,
      orderQty: r.order_qty != null ? Number(r.order_qty) : null,
      orderCost: r.order_cost != null ? Number(r.order_cost) : null,
    })),
  };
}

// Метаданные синка (свежесть данных) для UI: когда последний раз синкали
async function getSyncStatus(networkId) {
  const rows = await postgres.query(
    `SELECT station_code, last_synced_date, last_ok_at, last_error, rows_total
       FROM sts_sync_cursor WHERE network_id=$1 ORDER BY station_code`, [networkId]
  );
  const lastOk = await postgres.queryOne(
    `SELECT max(last_ok_at) m FROM sts_sync_cursor WHERE network_id=$1`, [networkId]
  );
  return { lastSyncedAt: lastOk?.m || null, stations: rows.rows };
}

module.exports = { getOverview, getDetailedAnalytics, getOperations, getSyncStatus };
