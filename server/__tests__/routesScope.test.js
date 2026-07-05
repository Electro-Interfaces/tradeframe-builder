/**
 * HTTP-тесты scope-изоляции роутов (ведомости, корпклиенты, инвентаризация).
 * Реальные express-роутеры + requireAuth + scopeFilter; мокаются только
 * источники данных (подмена методов на общих module-объектах). Запросы —
 * нативным fetch на эфемерный порт, без новых зависимостей.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.NODE_ENV = 'test';

const tokenService = require('../services/auth/tokenService');
const authDataSource = require('../services/auth/authDataSource');
const ordersDS = require('../services/corporateOrders/corporateOrdersDataSource');
const clientsDS = require('../services/corporateClients/corporateClientsDataSource');
const inventoryService = require('../services/inventoryAdjustments/inventoryAdjustmentsService');
const inventoryRepo = require('../repositories/inventoryAdjustmentsRepository');

const corporateOrdersRouter = require('../routes/corporateOrders');
const corporateClientsRouter = require('../routes/corporateClients');
const inventoryRouter = require('../routes/inventoryAdjustments');

const NET_GIG = '73ccc1c3-dc69-4684-8c21-18a1fcec967c';
const NET_OTHER = 'fb35d612-24f9-45ba-8fdf-e6738676c639';

const INVENTORY_PERMS = [{ section: 'inventory', resource: '*', actions: ['read', 'write', 'send'] }];

const USERS = {
  'uuid-gig': {
    id: 'uuid-gig',
    email: 'gig@test',
    name: 'ГИГ Менеджер',
    role: 'bto_manager',
    permissions: INVENTORY_PERMS,
    roles: [{ roleCode: 'bto_manager', scope: 'network', scopeValues: [NET_GIG] }],
  },
  'uuid-super': {
    id: 'uuid-super',
    email: 'root@test',
    name: 'Супер',
    role: 'super_admin',
    permissions: [],
    roles: [{ roleCode: 'super_admin', scope: 'global', scopeValues: [] }],
  },
  'uuid-noperm': {
    id: 'uuid-noperm',
    email: 'noperm@test',
    name: 'Без прав',
    role: 'operator',
    permissions: [],
    roles: [{ roleCode: 'operator', scope: 'network', scopeValues: [NET_GIG] }],
  },
};

// ─── Моки данных ───────────────────────────────────────

const calls = { ordersList: [], ordersDeleted: [], clientsList: [], invList: [], invUpsert: [] };

const originals = {
  getAppUserById: authDataSource.getAppUserById,
  getCorporateOrders: ordersDS.getCorporateOrders,
  getCorporateOrderById: ordersDS.getCorporateOrderById,
  createCorporateOrder: ordersDS.createCorporateOrder,
  deleteCorporateOrder: ordersDS.deleteCorporateOrder,
  getCorporateClients: clientsDS.getCorporateClients,
  getCorporateClientById: clientsDS.getCorporateClientById,
  invGetById: inventoryService.getById,
  invList: inventoryService.list,
  upsertEmailRecipients: inventoryRepo.upsertEmailRecipients,
};

let server;
let base;

before(() => {
  authDataSource.getAppUserById = async (id) => USERS[id] || null;

  ordersDS.getCorporateOrders = async (filters) => { calls.ordersList.push(filters); return []; };
  ordersDS.getCorporateOrderById = async (id) => {
    if (id === 'order-gig') return { id, networkId: NET_GIG, status: 'draft' };
    if (id === 'order-other') return { id, networkId: NET_OTHER, status: 'draft' };
    return null;
  };
  ordersDS.createCorporateOrder = async (input) => ({ id: 'new-order', networkId: input.networkId });
  ordersDS.deleteCorporateOrder = async (id) => { calls.ordersDeleted.push(id); };

  clientsDS.getCorporateClients = async (filters) => { calls.clientsList.push(filters); return []; };
  clientsDS.getCorporateClientById = async (id) =>
    id === 'client-other' ? { id, networkId: NET_OTHER } : null;

  inventoryService.getById = async (id) => {
    if (id === 'adj-gig') return { id, networkId: NET_GIG, items: [] };
    if (id === 'adj-other') return { id, networkId: NET_OTHER, items: [] };
    return null;
  };
  inventoryService.list = async (filters) => { calls.invList.push(filters); return []; };
  inventoryRepo.upsertEmailRecipients = async (networkId, cfg) => { calls.invUpsert.push(networkId); return cfg; };

  const app = express();
  app.use(express.json());
  app.use('/api/corporate-orders', corporateOrdersRouter);
  app.use('/api/corporate-clients', corporateClientsRouter);
  app.use('/api/inventory-adjustments', inventoryRouter);

  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  Object.assign(authDataSource, { getAppUserById: originals.getAppUserById });
  Object.assign(ordersDS, {
    getCorporateOrders: originals.getCorporateOrders,
    getCorporateOrderById: originals.getCorporateOrderById,
    createCorporateOrder: originals.createCorporateOrder,
    deleteCorporateOrder: originals.deleteCorporateOrder,
  });
  Object.assign(clientsDS, {
    getCorporateClients: originals.getCorporateClients,
    getCorporateClientById: originals.getCorporateClientById,
  });
  inventoryService.getById = originals.invGetById;
  inventoryService.list = originals.invList;
  inventoryRepo.upsertEmailRecipients = originals.upsertEmailRecipients;
});

function tokenFor(userId) {
  return tokenService.createAccessToken(USERS[userId]).token;
}

function req(path, { method = 'GET', user, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${tokenFor(user)}`;
  return fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Ведомости: corporate-orders ───────────────────────

test('orders: без токена — 401', async () => {
  const r = await req('/api/corporate-orders');
  assert.equal(r.status, 401);
});

test('orders: чужая сеть в query — 403', async () => {
  const r = await req(`/api/corporate-orders?networkId=${NET_OTHER}`, { user: 'uuid-gig' });
  assert.equal(r.status, 403);
});

test('orders: scoped-список передаёт allowedNetworkIds в источник', async () => {
  calls.ordersList.length = 0;
  const r = await req('/api/corporate-orders', { user: 'uuid-gig' });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.ordersList[0].allowedNetworkIds, [NET_GIG]);
});

test('orders: super_admin — без фильтра (allowedNetworkIds null)', async () => {
  calls.ordersList.length = 0;
  const r = await req('/api/corporate-orders', { user: 'uuid-super' });
  assert.equal(r.status, 200);
  assert.equal(calls.ordersList[0].allowedNetworkIds, null);
});

test('orders: чужой заказ по id — 404, свой — 200', async () => {
  const foreign = await req('/api/corporate-orders/order-other', { user: 'uuid-gig' });
  assert.equal(foreign.status, 404);
  const own = await req('/api/corporate-orders/order-gig', { user: 'uuid-gig' });
  assert.equal(own.status, 200);
});

test('orders: DELETE чужого — 404 и удаление НЕ вызывается', async () => {
  calls.ordersDeleted.length = 0;
  const r = await req('/api/corporate-orders/order-other', { method: 'DELETE', user: 'uuid-gig' });
  assert.equal(r.status, 404);
  assert.equal(calls.ordersDeleted.length, 0);
});

test('orders: DELETE своего — 204', async () => {
  calls.ordersDeleted.length = 0;
  const r = await req('/api/corporate-orders/order-gig', { method: 'DELETE', user: 'uuid-gig' });
  assert.equal(r.status, 204);
  assert.deepEqual(calls.ordersDeleted, ['order-gig']);
});

test('orders: POST в чужую сеть — 403', async () => {
  const r = await req('/api/corporate-orders', {
    method: 'POST',
    user: 'uuid-gig',
    body: { corporateClientId: 'c1', networkId: NET_OTHER, stationCode: '207', fuelCode: 92 },
  });
  assert.equal(r.status, 403);
});

// ─── Корпклиенты: corporate-clients ────────────────────

test('clients: scoped-список передаёт allowedNetworkIds', async () => {
  calls.clientsList.length = 0;
  const r = await req('/api/corporate-clients', { user: 'uuid-gig' });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.clientsList[0].allowedNetworkIds, [NET_GIG]);
});

test('clients: чужой клиент по id — 404 (не раскрываем наличие)', async () => {
  const r = await req('/api/corporate-clients/client-other', { user: 'uuid-gig' });
  assert.equal(r.status, 404);
});

// ─── Инвентаризация: inventory-adjustments ─────────────

test('inventory: без права inventory.read — 403', async () => {
  const r = await req('/api/inventory-adjustments', { user: 'uuid-noperm' });
  assert.equal(r.status, 403);
});

test('inventory: чужая сеть в query — 403, scoped-список с фильтром', async () => {
  const foreign = await req(`/api/inventory-adjustments?networkId=${NET_OTHER}`, { user: 'uuid-gig' });
  assert.equal(foreign.status, 403);

  calls.invList.length = 0;
  const own = await req('/api/inventory-adjustments', { user: 'uuid-gig' });
  assert.equal(own.status, 200);
  assert.deepEqual(calls.invList[0].allowedNetworkIds, [NET_GIG]);
});

test('inventory: чужой документ — 404, свой — 200', async () => {
  const foreign = await req('/api/inventory-adjustments/adj-other', { user: 'uuid-gig' });
  assert.equal(foreign.status, 404);
  const own = await req('/api/inventory-adjustments/adj-gig', { user: 'uuid-gig' });
  assert.equal(own.status, 200);
});

test('inventory: email-recipients чужой сети — 403, запись НЕ вызывается', async () => {
  calls.invUpsert.length = 0;
  const r = await req(`/api/inventory-adjustments/email-recipients/${NET_OTHER}`, {
    method: 'PUT',
    user: 'uuid-gig',
    body: { recipients: ['a@b.ru'] },
  });
  assert.equal(r.status, 403);
  assert.equal(calls.invUpsert.length, 0);
});

test('inventory: email-recipients своей сети — 200', async () => {
  calls.invUpsert.length = 0;
  const r = await req(`/api/inventory-adjustments/email-recipients/${NET_GIG}`, {
    method: 'PUT',
    user: 'uuid-gig',
    body: { recipients: ['a@b.ru'] },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(calls.invUpsert, [NET_GIG]);
});
