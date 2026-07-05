/**
 * Тесты scopeFilter — ядро RBAC/мультитенантности.
 * getAllowedNetworkIds — основа scope-изоляции ведомостей, инвентаризации и support.
 * orgDataSource мокается подменой метода на общем module-объекте.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const orgDataSource = require('../services/org/orgDataSource');
const { getUserScope, hasNetworkAccess, getAllowedNetworkIds } = require('../middleware/scopeFilter');

const NET_A = '73ccc1c3-dc69-4684-8c21-18a1fcec967c';
const NET_B = 'cbb4029e-757b-41a2-a770-e619f1bf74e9';

function userWith(roles, role = 'operator') {
  return { id: 'u1', role, roles };
}

// ─── getUserScope ──────────────────────────────────────

test('пустой/отсутствующий пользователь — ограничен и пуст', () => {
  const scope = getUserScope(null);
  assert.equal(scope.hasRestrictions, true);
  assert.equal(scope.networkIds.size, 0);
});

test('super_admin — без ограничений', () => {
  const scope = getUserScope(userWith([{ scope: 'network', scopeValues: [NET_A] }], 'super_admin'));
  assert.equal(scope.hasRestrictions, false);
});

test('роль с global scope — без ограничений', () => {
  const scope = getUserScope(userWith([{ scope: 'global', scopeValues: [] }]));
  assert.equal(scope.hasRestrictions, false);
});

test('network scope — сети попадают в networkIds', () => {
  const scope = getUserScope(userWith([{ scope: 'network', scopeValues: [NET_A, NET_B] }]));
  assert.equal(scope.hasRestrictions, true);
  assert.ok(scope.networkIds.has(NET_A));
  assert.ok(scope.networkIds.has(NET_B));
});

test('trading_point scope — pointIds полностью, networkCodes по префиксу', () => {
  const scope = getUserScope(userWith([{ scope: 'trading_point', scopeValues: ['bto-azs-2', 'bto-azs-4'] }]));
  assert.equal(scope.hasRestrictions, true);
  assert.ok(scope.pointIds.has('bto-azs-2'));
  assert.ok(scope.pointIds.has('bto-azs-4'));
  assert.ok(scope.networkCodes.has('bto'));
});

test('роли без scopeValues — ограничений нет (network_admin на все сети)', () => {
  const scope = getUserScope(userWith([{ scope: 'network', scopeValues: [] }], 'network_admin'));
  assert.equal(scope.hasRestrictions, false);
});

// ─── hasNetworkAccess ──────────────────────────────────

test('hasNetworkAccess: по id, code, external_id; чужая сеть — отказ', () => {
  const scope = getUserScope(userWith([
    { scope: 'network', scopeValues: [NET_A] },
    { scope: 'trading_point', scopeValues: ['bto-azs-2'] },
  ]));
  assert.equal(hasNetworkAccess({ id: NET_A, code: 'gig', external_id: '15' }, scope), true);
  assert.equal(hasNetworkAccess({ id: 'other', code: 'bto', external_id: null }, scope), true);
  assert.equal(hasNetworkAccess({ id: 'other', code: 'x', external_id: 'bto' }, scope), true);
  assert.equal(hasNetworkAccess({ id: 'other', code: 'y', external_id: '19' }, scope), false);
});

// ─── getAllowedNetworkIds ──────────────────────────────

test('getAllowedNetworkIds: super_admin → null (без ограничений)', async () => {
  const allowed = await getAllowedNetworkIds(userWith([], 'super_admin'));
  assert.equal(allowed, null);
});

test('getAllowedNetworkIds: network scope → Set с UUID, без похода в БД', async () => {
  const allowed = await getAllowedNetworkIds(userWith([{ scope: 'network', scopeValues: [NET_A] }]));
  assert.ok(allowed instanceof Set);
  assert.ok(allowed.has(NET_A));
  assert.equal(allowed.size, 1);
});

test('getAllowedNetworkIds: trading_point scope резолвит код сети в UUID через справочник', async () => {
  const original = orgDataSource.getNetworks;
  orgDataSource.getNetworks = async () => [
    { id: NET_B, code: 'bto', external_id: null },
    { id: NET_A, code: '15', external_id: '15' },
  ];
  try {
    const allowed = await getAllowedNetworkIds(
      userWith([{ scope: 'trading_point', scopeValues: ['bto-azs-2'] }])
    );
    assert.ok(allowed instanceof Set);
    assert.ok(allowed.has(NET_B), 'код bto должен резолвиться в UUID сети БТО');
    assert.equal(allowed.has(NET_A), false, 'чужая сеть не должна попадать в allowed');
  } finally {
    orgDataSource.getNetworks = original;
  }
});

test('getAllowedNetworkIds: роли без scopeValues → null (текущая семантика «без ограничений»)', async () => {
  // Документируем текущее поведение: пустой список ролей/значений трактуется как
  // полный доступ (network_admin без scope_values). Ужесточение — отдельное решение.
  const allowed = await getAllowedNetworkIds(userWith([]));
  assert.equal(allowed, null);
});

test('getAllowedNetworkIds: user без поля roles → пустой Set (доступа никуда нет)', async () => {
  const allowed = await getAllowedNetworkIds({ id: 'u1', role: 'operator' });
  assert.ok(allowed instanceof Set);
  assert.equal(allowed.size, 0);
});
