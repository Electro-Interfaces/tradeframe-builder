function toNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCorporateOrder(row) {
  return {
    id: String(row.id),
    corporateClientId: String(row.corporate_client_id || row.corporateClientId),
    corporateClientName: row.client_name || row.corporateClientName || '',
    networkId: String(row.network_id || row.networkId),
    tradingPointId: row.trading_point_id || row.tradingPointId || null,
    stationCode: row.station_code || row.stationCode || '',
    stationName: row.station_name || row.stationName || undefined,
    fuelCode: row.fuel_code != null ? Number(row.fuel_code) : null,
    fuelName: row.fuel_name || row.fuelName || undefined,
    columnNumber: row.column_number != null ? Number(row.column_number) : null,
    mode: row.mode || 'liters',
    orderedVolume: toNum(row.ordered_volume ?? row.orderedVolume),
    orderedAmount: toNum(row.ordered_amount ?? row.orderedAmount),
    price: row.price != null ? toNum(row.price) : null,
    status: row.status || 'draft',
    mstoOrderId: row.msto_order_id || row.mstoOrderId || null,
    mstoSessionId: row.msto_session_id || row.mstoSessionId || null,
    actualVolume: toNum(row.actual_volume ?? row.actualVolume),
    actualAmount: toNum(row.actual_amount ?? row.actualAmount),
    comment: row.comment || '',
    createdAt: new Date(row.created_at || row.createdAt || Date.now()),
    updatedAt: new Date(row.updated_at || row.updatedAt || row.created_at || Date.now()),
    fulfilledAt: row.fulfilled_at ? new Date(row.fulfilled_at) : null,
    createdBy: row.created_by || row.createdBy || undefined,
  };
}

function buildCorporateOrderRecord(input, actorUserId) {
  const mode = input.mode === 'rubles' ? 'rubles' : 'liters';
  const qty = toNum(input.quantity ?? (mode === 'liters' ? input.orderedVolume : input.orderedAmount));
  const price = input.price != null ? toNum(input.price) : null;

  const orderedVolume = mode === 'liters' ? qty : 0;
  const orderedAmount = mode === 'rubles' ? qty : (price ? qty * price : 0);

  return {
    corporate_client_id: input.corporateClientId,
    network_id: input.networkId,
    trading_point_id: input.tradingPointId || null,
    station_code: String(input.stationCode || '').trim(),
    station_name: input.stationName || null,
    fuel_code: input.fuelCode != null ? Number(input.fuelCode) : null,
    fuel_name: input.fuelName || null,
    column_number: input.columnNumber != null ? Number(input.columnNumber) : null,
    mode,
    ordered_volume: orderedVolume,
    ordered_amount: orderedAmount,
    price,
    status: input.status || 'draft',
    comment: input.comment || '',
    created_by: actorUserId || 'system',
    updated_by: actorUserId || 'system',
  };
}

module.exports = {
  normalizeCorporateOrder,
  buildCorporateOrderRecord,
};
