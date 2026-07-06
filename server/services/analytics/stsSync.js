/**
 * Синк транзакций STS → PostgreSQL (таблица sts_transactions).
 *
 * Синкаем ПО ДНЯМ: день — лёгкий запрос к STS (не падает как неделя/месяц),
 * закрытый день неизменен → синкается один раз (курсор sts_sync_cursor),
 * «сегодня» перечитывается при каждом прогоне. Дедупликация upsert по
 * (system, station_code, sts_id).
 */
const postgres = require('../../db/pool');
const stsProxy = require('../stsProxyService');
const orgDataSource = require('../org/orgDataSource');
const { normalizePaymentMethod } = require('./paymentNormalize');

const INITIAL_DAYS = Number(process.env.STS_SYNC_INITIAL_DAYS || 40);

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

// Разбор ответа STS /v2/transactions в плоские строки с номером станции
function extractRows(data, fallbackStation) {
  let raw = [];
  if (Array.isArray(data) && data.length > 0 && data[0]?.items) {
    raw = data.flatMap((st) => (st.items || []).map((tx) => ({ ...tx, station: st.number })));
  } else if (Array.isArray(data)) {
    raw = data;
  } else if (data && Array.isArray(data.transactions)) {
    raw = data.transactions;
  }
  return raw.map((tx) => ({
    stationCode: int(tx.station ?? fallbackStation),
    stsId: int(tx.id),
    dt: tx.dt || tx.start_time || null,
    shift: int(tx.shift),
    receipt: int(tx.number),
    pos: int(tx.pos),
    nozzle: int(tx.nozzle),
    tank: int(tx.tank),
    fuelCode: int(tx.fuel),
    fuelName: tx.fuel_name || null,
    quantity: num(tx.quantity),
    price: num(tx.price),
    cost: num(tx.cost),
    mass: num(tx.amount),
    density: num(tx.density),
    payTypeId: int(tx.pay_type?.id),
    payTypeName: tx.pay_type?.name || null,
    paymentMethod: normalizePaymentMethod(tx.pay_type?.name || ''),
    card: tx.card || null,
    orderQty: num(tx.order),
    orderCost: num(tx.order_cost),
  })).filter((r) => r.stsId != null && r.dt != null);
}

// Многострочный upsert одной пачки транзакций
async function upsertBatch(networkId, system, rows) {
  if (!rows.length) return 0;
  const cols = 23;
  const values = [];
  const params = [];
  rows.forEach((r, i) => {
    const b = i * cols;
    values.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13},$${b+14},$${b+15},$${b+16},$${b+17},$${b+18},$${b+19},$${b+20},$${b+21},$${b+22},$${b+23})`);
    params.push(
      networkId, system, r.stationCode, r.stsId, r.dt, r.shift, r.receipt,
      r.pos, r.nozzle, r.tank, r.fuelCode, r.fuelName, r.quantity, r.price,
      r.cost, r.mass, r.density, r.payTypeId, r.payTypeName, r.paymentMethod,
      r.card, r.orderQty, r.orderCost
    );
  });
  const sql = `
    INSERT INTO sts_transactions (
      network_id, system, station_code, sts_id, dt, shift, receipt,
      pos, nozzle, tank, fuel_code, fuel_name, quantity, price,
      cost, mass, density, pay_type_id, pay_type_name, payment_method,
      card, order_qty, order_cost
    ) VALUES ${values.join(',')}
    ON CONFLICT (system, station_code, sts_id) DO UPDATE SET
      dt=EXCLUDED.dt, shift=EXCLUDED.shift, receipt=EXCLUDED.receipt,
      pos=EXCLUDED.pos, nozzle=EXCLUDED.nozzle, tank=EXCLUDED.tank,
      fuel_code=EXCLUDED.fuel_code, fuel_name=EXCLUDED.fuel_name,
      quantity=EXCLUDED.quantity, price=EXCLUDED.price, cost=EXCLUDED.cost,
      mass=EXCLUDED.mass, density=EXCLUDED.density,
      pay_type_id=EXCLUDED.pay_type_id, pay_type_name=EXCLUDED.pay_type_name,
      payment_method=EXCLUDED.payment_method, card=EXCLUDED.card,
      order_qty=EXCLUDED.order_qty, order_cost=EXCLUDED.order_cost,
      synced_at=now()`;
  await postgres.query(sql, params);
  return rows.length;
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Синк одного дня одной станции
async function syncStationDay(networkId, system, stationCode, date) {
  const data = await stsProxy.stsInternalRequest('/v2/transactions', {
    system, station: stationCode,
    dt_beg: `${date} 00:00:00`, dt_end: `${date} 23:59:59`,
  }, {});
  const rows = extractRows(data, stationCode);
  // upsert батчами по 500 строк
  let total = 0;
  for (let i = 0; i < rows.length; i += 500) {
    total += await upsertBatch(networkId, system, rows.slice(i, i + 500));
  }
  return total;
}

// Синк станции: от курсора (или INITIAL_DAYS назад) до сегодня, по дням.
// Прошлые дни синкаются один раз, сегодня перечитывается.
async function syncStation(networkId, system, stationCode) {
  const cur = await postgres.queryOne(
    `SELECT last_synced_date FROM sts_sync_cursor WHERE system=$1 AND station_code=$2`,
    [system, stationCode]
  );
  const today = new Date(); today.setHours(0,0,0,0);
  let from;
  if (cur?.last_synced_date) {
    from = new Date(cur.last_synced_date); from.setHours(0,0,0,0);
  } else {
    from = new Date(today); from.setDate(from.getDate() - INITIAL_DAYS);
  }

  let rowsTotal = 0;
  let lastClosed = cur?.last_synced_date ? new Date(cur.last_synced_date) : null;
  try {
    for (let d = new Date(from); d <= today; d.setDate(d.getDate() + 1)) {
      const isToday = d.getTime() === today.getTime();
      rowsTotal += await syncStationDay(networkId, system, stationCode, ymd(d));
      if (!isToday) lastClosed = new Date(d); // закрытый день зафиксирован
    }
    // last_synced_date = вчера (сегодня не закрыт, перечитаем в след. раз)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    await postgres.query(
      `INSERT INTO sts_sync_cursor (system, station_code, network_id, last_synced_date, last_run_at, last_ok_at, last_error, rows_total)
       VALUES ($1,$2,$3,$4, now(), now(), NULL,
               COALESCE((SELECT rows_total FROM sts_sync_cursor WHERE system=$1 AND station_code=$2),0) + $5)
       ON CONFLICT (system, station_code) DO UPDATE SET
         last_synced_date=EXCLUDED.last_synced_date, last_run_at=now(), last_ok_at=now(),
         last_error=NULL, rows_total=sts_sync_cursor.rows_total + $5, network_id=EXCLUDED.network_id`,
      [system, stationCode, networkId, ymd(yesterday), rowsTotal]
    );
    return { stationCode, rows: rowsTotal, ok: true };
  } catch (error) {
    await postgres.query(
      `INSERT INTO sts_sync_cursor (system, station_code, network_id, last_run_at, last_error)
       VALUES ($1,$2,$3, now(), $4)
       ON CONFLICT (system, station_code) DO UPDATE SET last_run_at=now(), last_error=$4`,
      [system, stationCode, networkId, String(error.message).slice(0, 500)]
    ).catch(() => {});
    return { stationCode, rows: rowsTotal, ok: false, error: error.message };
  }
}

// Список станций сети из справочника (external_id = STS station code)
async function getNetworkStations(networkId) {
  const rows = await postgres.query(
    `SELECT external_id FROM trading_points
      WHERE network_id=$1 AND deleted_at IS NULL AND external_id ~ '^[0-9]+$'`,
    [networkId]
  );
  return rows.rows.map((r) => int(r.external_id)).filter((n) => n != null);
}

// Синк всей сети (все станции последовательно — не долбим STS)
async function syncNetwork(networkId) {
  const net = await postgres.queryOne(
    `SELECT external_id FROM networks WHERE id=$1 AND deleted_at IS NULL`, [networkId]
  );
  const system = int(net?.external_id);
  if (system == null) return { ok: false, error: 'сеть без external_id' };

  const stations = await getNetworkStations(networkId);
  const results = [];
  for (const st of stations) {
    results.push(await syncStation(networkId, system, st));
  }
  const rows = results.reduce((s, r) => s + (r.rows || 0), 0);
  return { ok: true, network_id: networkId, system, stations: stations.length, rows, results };
}

// Синк всех сетей с external_id
async function syncAllNetworks() {
  const nets = await postgres.query(
    `SELECT id FROM networks WHERE deleted_at IS NULL AND external_id ~ '^[0-9]+$'`
  );
  const out = [];
  for (const n of nets.rows) {
    out.push(await syncNetwork(n.id));
  }
  return out;
}

module.exports = { syncStation, syncNetwork, syncAllNetworks, getNetworkStations, extractRows };
