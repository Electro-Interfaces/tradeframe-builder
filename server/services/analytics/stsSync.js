/**
 * Синк транзакций STS → PostgreSQL (таблица sts_transactions).
 *
 * Синкаем ПО ДНЯМ: день — лёгкий запрос к STS (не падает как неделя/месяц).
 * Дедупликация upsert по (system, station_code, sts_id).
 *
 * Самоподстраховка от пробелов (курсор sts_sync_cursor):
 *  1. FORWARD — от (last_synced − RESYNC_TAIL) до сегодня: новые дни + сегодня +
 *     перечитывание хвоста последних дней (STS иногда дописывает прошлые дни
 *     задним числом).
 *  2. BACKFILL — досинк истории НАЗАД до глубины INITIAL_DAYS, останавливаясь на
 *     границе данных станции (N пустых дней подряд). Станции, появившиеся позже
 *     первого наполнения, автоматически догоняют полный период (кейс АЗС 207).
 *  3. DUAL-CODE — станции, сменившие номер, синкаются и под старым номером,
 *     данные пишутся под текущим (кейс Светогорск 9008 → 8).
 */
const postgres = require('../../db/pool');
const stsProxy = require('../stsProxyService');
const { normalizePaymentMethod } = require('./paymentNormalize');

const INITIAL_DAYS = Number(process.env.STS_SYNC_INITIAL_DAYS || 40);
// Перечитываем последние N закрытых дней — STS может дописать их задним числом.
const RESYNC_TAIL_DAYS = Number(process.env.STS_SYNC_TAIL_DAYS || 3);
// Backfill останавливается после стольких пустых дней подряд — это граница
// данных станции (раньше не работала / не слала).
const BACKFILL_EMPTY_STOP = Number(process.env.STS_SYNC_BACKFILL_STOP || 5);
// Потолок дней backfill за один прогон станции — чтобы не молотить STS слишком
// долго в одном тике; хвост догоняется в следующих прогонах.
const BACKFILL_MAX_DAYS = Number(process.env.STS_SYNC_BACKFILL_MAX || 60);

// Станции, сменившие STS-номер: текущий → [старые номера]. Данные старых номеров
// пишутся под текущим station_code. Расширяется по мере переименований.
const DUAL_STATION_CODES = { 8: [9008] };

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

// Многострочный upsert одной пачки транзакций. writeStation != null →
// station_code принудительно этот номер (для dual-code: читаем старый, пишем новый).
async function upsertBatch(networkId, system, rows, writeStation) {
  if (!rows.length) return 0;
  const cols = 23;
  const values = [];
  const params = [];
  rows.forEach((r, i) => {
    const b = i * cols;
    values.push(`($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13},$${b+14},$${b+15},$${b+16},$${b+17},$${b+18},$${b+19},$${b+20},$${b+21},$${b+22},$${b+23})`);
    params.push(
      networkId, system, writeStation != null ? writeStation : r.stationCode, r.stsId, r.dt, r.shift, r.receipt,
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
function midnight(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// Синк одного дня. readStation — номер запроса к STS; writeStation — под каким
// номером писать (для dual-code отличается). Возвращает число строк.
async function syncStationDay(networkId, system, readStation, date, writeStation) {
  const data = await stsProxy.stsInternalRequest('/v2/transactions', {
    system, station: readStation,
    dt_beg: `${date} 00:00:00`, dt_end: `${date} 23:59:59`,
  }, {});
  const rows = extractRows(data, readStation);
  let total = 0;
  for (let i = 0; i < rows.length; i += 500) {
    total += await upsertBatch(networkId, system, rows.slice(i, i + 500), writeStation);
  }
  return total;
}

// Чистая выборка транзакций станции за день из STS БЕЗ записи в БД —
// для STS-фолбэка на исторические периоды вне материализованного окна.
// writeStation != null → подменяем station_code (dual-code: читаем старый номер,
// отдаём под текущим).
async function fetchStationDayRows(system, readStation, date, writeStation) {
  const data = await stsProxy.stsInternalRequest('/v2/transactions', {
    system, station: readStation,
    dt_beg: `${date} 00:00:00`, dt_end: `${date} 23:59:59`,
  }, {});
  const rows = extractRows(data, readStation);
  if (writeStation != null) rows.forEach((r) => { r.stationCode = writeStation; });
  return rows;
}

// Выборка транзакций ОДНОЙ станции за произвольный диапазон [from, to] одним
// запросом (STS отдаёт месяц станции за ~секунды). Для STS-фолбэка на историю.
// Падает лишь очень широкий запрос (год+) — вызывающий откатывается на чанки.
async function fetchStationRangeRows(system, readStation, from, to, writeStation) {
  const data = await stsProxy.stsInternalRequest('/v2/transactions', {
    system, station: readStation,
    dt_beg: `${from} 00:00:00`, dt_end: `${to} 23:59:59`,
  }, {});
  const rows = extractRows(data, readStation);
  if (writeStation != null) rows.forEach((r) => { r.stationCode = writeStation; });
  return rows;
}

// Backfill истории НАЗАД от fromDay (включительно) до targetStart, с остановкой
// на границе данных (BACKFILL_EMPTY_STOP пустых дней подряд) и потолком дней.
// Возвращает { rows, reached (самый ранний обработанный день), done }.
async function backfillDown(networkId, system, readStation, writeStation, fromDay, targetStart) {
  let rows = 0;
  let emptyStreak = 0;
  let processed = 0;
  let reached = fromDay;
  let hitBoundary = false;
  for (let d = midnight(fromDay); d >= targetStart; d = addDays(d, -1)) {
    const got = await syncStationDay(networkId, system, readStation, ymd(d), writeStation);
    rows += got;
    reached = new Date(d);
    processed++;
    if (got === 0) { emptyStreak++; } else { emptyStreak = 0; }
    if (emptyStreak >= BACKFILL_EMPTY_STOP) { hitBoundary = true; break; }
    if (processed >= BACKFILL_MAX_DAYS) break; // добьём в следующем прогоне
  }
  // done, если дошли до целевой глубины или упёрлись в границу данных
  const done = hitBoundary || reached <= targetStart;
  return { rows, reached, done };
}

// Синк одной станции: forward (хвост+сегодня) + backfill истории.
async function syncStation(networkId, system, stationCode) {
  const cur = await postgres.queryOne(
    `SELECT last_synced_date, first_synced_date, backfill_done
       FROM sts_sync_cursor WHERE system=$1 AND station_code=$2`,
    [system, stationCode]
  );
  const today = midnight(new Date());
  const targetStart = addDays(today, -INITIAL_DAYS);
  let rowsTotal = 0;
  let minSynced = cur?.first_synced_date ? midnight(cur.first_synced_date) : null;

  try {
    // 1. FORWARD: от (last_synced − RESYNC_TAIL) или targetStart — до сегодня.
    let from;
    if (cur?.last_synced_date) {
      from = addDays(midnight(cur.last_synced_date), -RESYNC_TAIL_DAYS);
      if (from < targetStart) from = new Date(targetStart);
    } else {
      from = new Date(targetStart);
    }
    for (let d = new Date(from); d <= today; d = addDays(d, 1)) {
      rowsTotal += await syncStationDay(networkId, system, stationCode, ymd(d));
      if (!minSynced || d < minSynced) minSynced = new Date(d);
    }
    const yesterday = addDays(today, -1);

    // 2. BACKFILL истории назад до targetStart (пока не сделан).
    let backfillDone = !!cur?.backfill_done;
    if (!backfillDone && (!minSynced || minSynced > targetStart)) {
      const start = addDays(minSynced || from, -1);
      const bf = await backfillDown(networkId, system, stationCode, null, start, targetStart);
      rowsTotal += bf.rows;
      if (!minSynced || bf.reached < minSynced) minSynced = bf.reached;
      backfillDone = bf.done;
    }

    await postgres.query(
      `INSERT INTO sts_sync_cursor
         (system, station_code, network_id, last_synced_date, first_synced_date,
          backfill_done, last_run_at, last_ok_at, last_error, rows_total)
       VALUES ($1,$2,$3,$4,$5,$6, now(), now(), NULL,
               COALESCE((SELECT rows_total FROM sts_sync_cursor WHERE system=$1 AND station_code=$2),0) + $7)
       ON CONFLICT (system, station_code) DO UPDATE SET
         last_synced_date=EXCLUDED.last_synced_date,
         first_synced_date=LEAST(sts_sync_cursor.first_synced_date, EXCLUDED.first_synced_date),
         backfill_done=EXCLUDED.backfill_done,
         last_run_at=now(), last_ok_at=now(), last_error=NULL,
         rows_total=sts_sync_cursor.rows_total + $7, network_id=EXCLUDED.network_id`,
      [system, stationCode, networkId, ymd(yesterday), minSynced ? ymd(minSynced) : ymd(targetStart), backfillDone, rowsTotal]
    );

    // 3. DUAL-CODE: синк старых номеров станции (данные пишем под текущим).
    const aliases = DUAL_STATION_CODES[stationCode] || [];
    for (const alias of aliases) {
      try {
        rowsTotal += await syncAlias(networkId, system, stationCode, alias, targetStart, today);
      } catch (e) {
        console.warn(`[STS Sync] alias ${alias}→${stationCode} failed: ${e.message}`);
      }
    }

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

// Синк данных под старым номером станции (alias), запись под текущим station_code.
// Backfill истории один раз + перечитывание хвоста (вдруг старый номер ещё дописывает).
async function syncAlias(networkId, system, stationCode, aliasCode, targetStart, today) {
  const cur = await postgres.queryOne(
    `SELECT first_synced_date, backfill_done FROM sts_sync_alias_cursor
      WHERE system=$1 AND station_code=$2 AND alias_code=$3`,
    [system, stationCode, aliasCode]
  );
  let rows = 0;
  let minSynced = cur?.first_synced_date ? midnight(cur.first_synced_date) : null;
  let backfillDone = !!cur?.backfill_done;

  // Хвост: перечитываем последние RESYNC_TAIL_DAYS (на случай поздних дописок).
  const tailFrom = addDays(today, -RESYNC_TAIL_DAYS);
  for (let d = new Date(tailFrom); d <= today; d = addDays(d, 1)) {
    rows += await syncStationDay(networkId, system, aliasCode, ymd(d), stationCode);
  }

  // Backfill истории старого номера назад до targetStart (один раз).
  if (!backfillDone && (!minSynced || minSynced > targetStart)) {
    const start = addDays(minSynced || tailFrom, -1);
    const bf = await backfillDown(networkId, system, aliasCode, stationCode, start, targetStart);
    rows += bf.rows;
    if (!minSynced || bf.reached < minSynced) minSynced = bf.reached;
    backfillDone = bf.done;
  }

  await postgres.query(
    `INSERT INTO sts_sync_alias_cursor
       (system, station_code, alias_code, first_synced_date, backfill_done, last_run_at)
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT (system, station_code, alias_code) DO UPDATE SET
       first_synced_date=LEAST(sts_sync_alias_cursor.first_synced_date, EXCLUDED.first_synced_date),
       backfill_done=EXCLUDED.backfill_done, last_run_at=now()`,
    [system, stationCode, aliasCode, minSynced ? ymd(minSynced) : ymd(targetStart), backfillDone]
  );
  return rows;
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

// ─────────────── Ленивая материализация (on-demand backfill) ───────────────
// Когда analytics-роут отдаёт исторический период из STS-фолбэка, в фоне
// докачиваем этот период в sts_transactions для ВСЕХ станций сети и опускаем
// курсоры — чтобы повторные заходы шли из быстрого PG.
//
// Инвариант «покрытие равномерно по станциям сети» (на нём держится
// pickSource через MIN(first_synced_date)) сохраняется: курсоры двигаем ТОЛЬКО
// ПОСЛЕ материализации всех станций. Иначе MIN опустится раньше, чем PG реально
// получит данные всех точек, и запрос «все АЗС» за старый период вернёт неполно.

function eachDayStr(from, to) {
  const out = [];
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(`${from}T00:00:00`); d <= end; d = addDays(d, 1)) out.push(ymd(d));
  return out;
}
function monthChunksStr(from, to) {
  const chunks = [];
  const end = new Date(`${to}T00:00:00`);
  let cur = new Date(`${from}T00:00:00`);
  while (cur <= end) {
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const chunkEnd = monthEnd < end ? monthEnd : end;
    chunks.push({ from: ymd(cur), to: ymd(chunkEnd) });
    cur = addDays(chunkEnd, 1);
  }
  return chunks;
}

// Материализация диапазона одной станции (месячные чанки → upsert в PG).
// writeStation != null — для dual-code (читаем старый номер, пишем под текущим).
async function materializeStationRange(networkId, system, readStation, fromStr, toStr, writeStation) {
  let total = 0;
  for (const chunk of monthChunksStr(fromStr, toStr)) {
    let rows;
    try {
      rows = await fetchStationRangeRows(system, readStation, chunk.from, chunk.to);
    } catch (e) {
      rows = []; // капризный чанк — по дням
      for (const day of eachDayStr(chunk.from, chunk.to)) {
        try { rows.push(...await fetchStationDayRows(system, readStation, day)); } catch (_) { /* skip */ }
      }
    }
    for (let i = 0; i < rows.length; i += 500) {
      total += await upsertBatch(networkId, system, rows.slice(i, i + 500), writeStation);
    }
  }
  return total;
}

const coverageJobs = new Set(); // одна ленивая до-материализация на сеть за раз

// Докрыть материализацию сети до fromStr (фоном, не блокируя ответ роута).
async function ensureCoverage(networkId, fromStr) {
  if (coverageJobs.has(networkId)) return;
  coverageJobs.add(networkId);
  try {
    const net = await postgres.queryOne(
      `SELECT external_id FROM networks WHERE id=$1 AND deleted_at IS NULL`, [networkId]
    );
    const system = int(net?.external_id);
    if (system == null) return;
    const from = midnight(new Date(`${fromStr}T00:00:00`));
    const stations = await getNetworkStations(networkId);

    // Станции с реальным гэпом [from, first_synced_date-1]
    const gaps = [];
    for (const st of stations) {
      const cur = await postgres.queryOne(
        `SELECT first_synced_date FROM sts_sync_cursor WHERE system=$1 AND station_code=$2`, [system, st]
      );
      const curFirst = cur?.first_synced_date ? midnight(cur.first_synced_date) : null;
      if (curFirst && curFirst <= from) continue; // уже покрыто
      gaps.push({ station: st, gapEnd: curFirst ? addDays(curFirst, -1) : midnight(new Date()) });
    }
    if (!gaps.length) return;

    // 1. Материализуем гэпы всех станций (+ dual-code), НЕ трогая курсоры.
    let total = 0;
    for (const g of gaps) {
      total += await materializeStationRange(networkId, system, g.station, ymd(from), ymd(g.gapEnd));
      for (const alias of (DUAL_STATION_CODES[g.station] || [])) {
        total += await materializeStationRange(networkId, system, alias, ymd(from), ymd(g.gapEnd), g.station);
      }
    }

    // 2. ТОЛЬКО ПОСЛЕ материализации всех станций — опускаем курсоры
    //    (first_synced_date вниз через LEAST). Теперь MIN станет = from и
    //    pickSource переключит период на PG (данные всех станций уже в PG).
    for (const g of gaps) {
      await postgres.query(
        `INSERT INTO sts_sync_cursor (system, station_code, network_id, last_synced_date, first_synced_date, backfill_done, last_run_at)
         VALUES ($1,$2,$3,$4,$4,false, now())
         ON CONFLICT (system, station_code) DO UPDATE SET
           first_synced_date = LEAST(sts_sync_cursor.first_synced_date, EXCLUDED.first_synced_date),
           network_id = EXCLUDED.network_id, last_ok_at = now()`,
        [system, g.station, networkId, ymd(from)]
      );
    }
    console.log(`[STS lazy-mat] сеть ${networkId} докрыта до ${fromStr}: +${total} строк, станций ${gaps.length}`);
  } catch (e) {
    console.warn(`[STS lazy-mat] сеть ${networkId} до ${fromStr}: ${e.message}`);
  } finally {
    coverageJobs.delete(networkId);
  }
}

module.exports = { syncStation, syncNetwork, syncAllNetworks, getNetworkStations, extractRows, fetchStationDayRows, fetchStationRangeRows, ensureCoverage, DUAL_STATION_CODES };
