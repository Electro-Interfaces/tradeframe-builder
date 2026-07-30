/**
 * STS-фолбэк аналитики для исторических периодов ВНЕ материализованного окна PG.
 *
 * Материализация (sts_transactions) держит скользящее окно ~40 дней. Когда
 * запрошенный период начинается раньше границы покрытия, роут берёт данные
 * напрямую из STS (источник истины хранит историю глубже — вплоть до прошлых
 * лет). Тянем ПО ДНЯМ на станцию (лёгкие запросы, не падают как неделя/месяц),
 * с ограниченной параллельностью и ретраями, агрегируем/пагинируем в памяти.
 *
 * Формат ответа ИДЕНТИЧЕН analyticsPgSource (getOverview/getDetailedAnalytics/
 * getOperations) — фронт не меняется. Медленнее PG; для редких обращений к
 * старым датам это приемлемо (пользователь выбрал фолбэк, а не бэкфилл в PG).
 */
const postgres = require('../../db/pool');
const stsSync = require('./stsSync');
const { DIMS } = require('./pivotDims');

const FETCH_CONCURRENCY = 6;   // одновременных запросов к STS
const FETCH_RETRIES = 3;       // попыток на (станция, день)
const PIVOT_ROW_LIMIT = 20000; // как в analyticsPgSource

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Список дат 'YYYY-MM-DD' в диапазоне [from, to] включительно
function eachDay(from, to) {
  const out = [];
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(`${from}T00:00:00`); d <= end; d.setDate(d.getDate() + 1)) out.push(ymd(d));
  return out;
}

// Разбивка [from, to] на помесячные чанки. STS отдаёт месяц станции за 1 запрос
// (~секунды) — на порядок меньше запросов, чем по дням. Год+ бьётся на 12 чанков.
function monthChunks(from, to) {
  const chunks = [];
  const end = new Date(`${to}T00:00:00`);
  let cur = new Date(`${from}T00:00:00`);
  while (cur <= end) {
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0); // послед. день месяца
    const chunkEnd = monthEnd < end ? monthEnd : end;
    chunks.push({ from: ymd(cur), to: ymd(chunkEnd) });
    cur = new Date(chunkEnd); cur.setDate(cur.getDate() + 1);
  }
  return chunks;
}

const n0 = (v) => (v == null ? 0 : Number(v) || 0);

// Ограниченная параллельность (без внешних зависимостей)
async function mapLimit(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

// networkIds → [{ networkId, system, stations[] }] с учётом scope (allowedStations)
// и явного выбора станций (stations из UI).
async function resolveTargets(networkIds, allowedStations, stations) {
  const nets = await postgres.query(
    `SELECT id, external_id FROM networks
      WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL AND external_id ~ '^[0-9]+$'`,
    [networkIds]
  );
  const a = Array.isArray(allowedStations) ? allowedStations.map(Number).filter(Number.isFinite) : null;
  const s = Array.isArray(stations) ? stations.map(Number).filter(Number.isFinite) : null;
  const out = [];
  for (const net of nets.rows) {
    let sts = await stsSync.getNetworkStations(net.id);
    if (a) sts = sts.filter((x) => a.includes(x));
    if (s && s.length) sts = sts.filter((x) => s.includes(x));
    out.push({ networkId: net.id, system: Number(net.external_id), stations: sts });
  }
  return out;
}

// Выборка одного (станция, месячный чанк): один запрос за диапазон; при сбое
// (широкий/капризный чанк) — откат на по-дням, чтобы не терять данные.
async function fetchTaskRows(task) {
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      return await stsSync.fetchStationRangeRows(task.system, task.station, task.from, task.to, task.writeStation);
    } catch (e) {
      if (attempt < FETCH_RETRIES - 1) continue;
      // Последняя попытка — откат на по-дням
      const out = [];
      for (const day of eachDay(task.from, task.to)) {
        try {
          const rows = await stsSync.fetchStationDayRows(task.system, task.station, day, task.writeStation);
          out.push(...rows);
        } catch (_) { /* пропускаем проблемный день */ }
      }
      if (!out.length) console.warn(`[STS fallback] ${task.system}/${task.station} ${task.from}..${task.to}: ${e.message}`);
      return out;
    }
  }
  return [];
}

// Все транзакции за период из STS: 1 запрос на (станция, месяц), параллельно.
// stationSingular (фильтр «одна точка») сужает набор станций, чтобы не тянуть
// всю сеть, когда выбрана конкретная АЗС.
async function fetchAllRows({ networkIds, from, to, allowedStations, stations, station }) {
  const stationFilter = (Array.isArray(stations) && stations.length) ? stations
    : (station ? [station] : null);
  const targets = await resolveTargets(networkIds, allowedStations, stationFilter);
  const chunks = monthChunks(from, to);

  const tasks = [];
  for (const t of targets) {
    for (const st of t.stations) {
      for (const c of chunks) tasks.push({ networkId: t.networkId, system: t.system, station: st, from: c.from, to: c.to });
      for (const alias of (stsSync.DUAL_STATION_CODES[st] || [])) {
        for (const c of chunks) tasks.push({ networkId: t.networkId, system: t.system, station: alias, writeStation: st, from: c.from, to: c.to });
      }
    }
  }

  const all = [];
  await mapLimit(tasks, FETCH_CONCURRENCY, async (task) => {
    const rows = await fetchTaskRows(task);
    for (const r of rows) { r.networkId = task.networkId; all.push(r); }
  });
  return all;
}

// Группировка: keyFn(row) → { ops, volume, revenue }
function groupAgg(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    let g = m.get(k);
    if (!g) { g = { ops: 0, volume: 0, revenue: 0 }; m.set(k, g); }
    g.ops += 1; g.volume += n0(r.quantity); g.revenue += n0(r.cost);
  }
  return m;
}

const dayOf = (r) => String(r.dt || '').slice(0, 10);
const hourOf = (r) => { const h = parseInt(String(r.dt || '').slice(11, 13), 10); return Number.isFinite(h) ? h : 0; };

// ── Сводка «Обзора» — формат как в analyticsPgSource.getOverview ──
async function getOverview(opts) {
  const { from, to } = opts;
  const all = await fetchAllRows(opts);

  const ops = all.length;
  const volume = all.reduce((s, r) => s + n0(r.quantity), 0);
  const revenue = all.reduce((s, r) => s + n0(r.cost), 0);

  const SEP = '|@|'; // разделитель составных ключей — не встречается в данных
  const fuelMap = groupAgg(all, (r) => `${r.fuelName ?? ''}${SEP}${r.fuelCode ?? ''}`);
  const payMap = groupAgg(all, (r) => r.paymentMethod || '');
  const dayMap = groupAgg(all, dayOf);
  const stationMap = groupAgg(all, (r) => r.stationCode);
  const dayFuelMap = groupAgg(all, (r) => `${dayOf(r)}${SEP}${r.fuelName ?? ''}`);
  // Топливо × оплата — кросс-разрез для перекрёстной фильтрации KPI «Операций»
  const fuelPayMap = groupAgg(all, (r) => `${r.fuelName ?? ''}${SEP}${r.paymentMethod || ''}`);

  // byHour (ops + revenue)
  const hourMap = new Map();
  for (const r of all) {
    const h = hourOf(r);
    let g = hourMap.get(h); if (!g) { g = { ops: 0, revenue: 0 }; hourMap.set(h, g); }
    g.ops += 1; g.revenue += n0(r.cost);
  }
  // byDayHour (ops + revenue)
  const dayHourMap = new Map();
  for (const r of all) {
    const k = `${dayOf(r)}${SEP}${hourOf(r)}`;
    let g = dayHourMap.get(k); if (!g) { g = { ops: 0, revenue: 0 }; dayHourMap.set(k, g); }
    g.ops += 1; g.revenue += n0(r.cost);
  }

  return {
    period: { from, to },
    kpi: { operations: ops, volume, revenue, avgCheck: ops ? revenue / ops : 0 },
    byFuel: [...fuelMap.entries()].map(([k, g]) => {
      const [fuel, fc] = k.split(SEP);
      return { fuel: fuel || null, fuelCode: fc !== '' ? Number(fc) : null, operations: g.ops, volume: g.volume, revenue: g.revenue };
    }).sort((a, b) => b.revenue - a.revenue),
    byPayment: [...payMap.entries()].map(([method, g]) => ({ method, operations: g.ops, volume: g.volume, revenue: g.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    byDay: [...dayMap.entries()].map(([date, g]) => ({ date, operations: g.ops, volume: g.volume, revenue: g.revenue }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    byHour: [...hourMap.entries()].map(([hour, g]) => ({ hour, operations: g.ops, revenue: g.revenue }))
      .sort((a, b) => a.hour - b.hour),
    byStation: [...stationMap.entries()].map(([stationCode, g]) => ({ stationCode: Number(stationCode), operations: g.ops, volume: g.volume, revenue: g.revenue }))
      .sort((a, b) => b.revenue - a.revenue),
    byDayFuel: [...dayFuelMap.entries()].map(([k, g]) => {
      const [date, fuel] = k.split(SEP);
      return { date, fuel: fuel || null, operations: g.ops, volume: g.volume, revenue: g.revenue };
    }).sort((a, b) => (a.date < b.date ? -1 : 1)),
    byDayHour: [...dayHourMap.entries()].map(([k, g]) => {
      const [date, hour] = k.split(SEP);
      return { date, hour: Number(hour), operations: g.ops, revenue: g.revenue };
    }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.hour - b.hour)),
    byFuelPayment: [...fuelPayMap.entries()].map(([k, g]) => {
      const [fuel, method] = k.split(SEP);
      return { fuel: fuel || null, method, operations: g.ops, volume: g.volume, revenue: g.revenue };
    }),
  };
}

// ── Детальная аналитика Обзора — формат как getDetailedAnalytics ──
async function getDetailedAnalytics(opts) {
  const all = await fetchAllRows(opts);
  const SEP = '|@|'; // разделитель составных ключей — не встречается в данных
  const sfMap = groupAgg(all, (r) => `${r.stationCode}${SEP}${r.fuelName ?? ''}`);
  const sdMap = groupAgg(all, (r) => `${r.stationCode}${SEP}${dayOf(r)}`);
  // День × оплата (ops + revenue)
  const dpMap = new Map();
  for (const r of all) {
    const k = `${dayOf(r)}${SEP}${r.paymentMethod || ''}`;
    let g = dpMap.get(k); if (!g) { g = { ops: 0, revenue: 0 }; dpMap.set(k, g); }
    g.ops += 1; g.revenue += n0(r.cost);
  }
  return {
    byStationFuel: [...sfMap.entries()].map(([k, g]) => {
      const [st, fuel] = k.split(SEP);
      return { stationCode: Number(st), fuel: fuel || null, operations: g.ops, volume: g.volume, revenue: g.revenue };
    }).sort((a, b) => a.stationCode - b.stationCode),
    byStationDay: [...sdMap.entries()].map(([k, g]) => {
      const [st, date] = k.split(SEP);
      return { stationCode: Number(st), date, operations: g.ops, volume: g.volume, revenue: g.revenue };
    }).sort((a, b) => a.stationCode - b.stationCode || (a.date < b.date ? -1 : 1)),
    byDayPayment: [...dpMap.entries()].map(([k, g]) => {
      const [date, method] = k.split(SEP);
      return { date, method, operations: g.ops, revenue: g.revenue };
    }).sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

// Фильтры операций (мультивыбор/умный поиск) — как в analyticsPgSource.getOperations
function applyOperationFilters(rows, { fuels, payments, station, stations, shift, receipt, pos, card, search }) {
  const fuelArr = (Array.isArray(fuels) ? fuels : (fuels ? [fuels] : [])).filter(Boolean);
  const payArr = (Array.isArray(payments) ? payments : (payments ? [payments] : [])).filter(Boolean);
  const stationArr = Array.isArray(stations) ? stations.map(Number).filter(Number.isFinite) : [];
  const cardTxt = card ? String(card).toLowerCase() : null;
  const sTxt = search ? String(search).toLowerCase() : null;
  return rows.filter((r) => {
    if (fuelArr.length && !fuelArr.includes(r.fuelName)) return false;
    if (payArr.length && !payArr.includes(r.paymentMethod)) return false;
    if (station && r.stationCode !== Number(station)) return false;
    if (stationArr.length && !stationArr.includes(r.stationCode)) return false;
    if (shift && r.shift !== Number(shift)) return false;
    if (receipt && r.receipt !== Number(receipt)) return false;
    if (pos && r.pos !== Number(pos)) return false;
    if (cardTxt && !String(r.card || '').toLowerCase().includes(cardTxt)) return false;
    if (sTxt) {
      const hay = `${r.receipt ?? ''} ${r.card ?? ''} ${r.fuelName ?? ''}`.toLowerCase();
      if (!hay.includes(sTxt)) return false;
    }
    return true;
  });
}

// ── Список операций с пагинацией — формат как getOperations ──
async function getOperations(opts) {
  const { page = 1, pageSize = 100 } = opts;
  const all = await fetchAllRows(opts);
  const filtered = applyOperationFilters(all, opts);
  // dt DESC
  filtered.sort((a, b) => (String(a.dt) < String(b.dt) ? 1 : String(a.dt) > String(b.dt) ? -1 : 0));

  const limit = Math.min(Math.max(Number(pageSize) || 100, 1), 500);
  const p = Math.max(Number(page) || 1, 1);
  const start = (p - 1) * limit;
  const slice = filtered.slice(start, start + limit);

  return {
    total: filtered.length,
    page: p,
    pageSize: limit,
    rows: slice.map((r) => ({
      stsId: r.stsId, dt: r.dt, stationCode: r.stationCode, receipt: r.receipt, shift: r.shift,
      pos: r.pos, nozzle: r.nozzle, tank: r.tank, fuelName: r.fuelName, fuelCode: r.fuelCode,
      quantity: n0(r.quantity), price: n0(r.price), cost: n0(r.cost),
      mass: r.mass != null ? Number(r.mass) : null, paymentMethod: r.paymentMethod,
      payTypeName: r.payTypeName, card: r.card, status: null,
      orderQty: r.orderQty != null ? Number(r.orderQty) : null,
      orderCost: r.orderCost != null ? Number(r.orderCost) : null,
    })),
  };
}

// ── Сводная — формат как analyticsPgSource.getPivot ──
// Периоды глубже покрытия PG приходят сюда, поэтому измерения берём из того же
// справочника DIMS (valueOf), что и SQL-версия: иначе разрезы разъедутся.
async function getPivot(opts) {
  const { dims } = opts;
  const all = await fetchAllRows(opts);
  const filtered = applyOperationFilters(all, opts);

  const SEP = '|@|';
  const NULL_MARK = ' '; // отличить настоящий null от строки 'null'
  const enc = (v) => (v == null ? NULL_MARK : String(v));
  const grouped = groupAgg(filtered, (r) => dims.map((k) => enc(DIMS[k].valueOf(r))).join(SEP));

  const rows = [...grouped.entries()]
    .map(([key, g]) => ({
      keys: key.split(SEP).map((v) => (v === NULL_MARK ? null : v)),
      ops: g.ops, volume: g.volume, revenue: g.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const truncated = rows.length > PIVOT_ROW_LIMIT;
  return { dims, truncated, rows: truncated ? rows.slice(0, PIVOT_ROW_LIMIT) : rows };
}

module.exports = { getOverview, getDetailedAnalytics, getOperations, getPivot };
