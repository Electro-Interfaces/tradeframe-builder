const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { getAllowedNetworkIds } = require('../middleware/scopeFilter');
const dataSource = require('../services/corporateOrders/corporateOrdersDataSource');

const router = express.Router();

router.use(requireAuth);

// Фиче-флаг реальной отправки заказа в MSTO (фаза 2).
// Включается только после регистрации агента «ГИГ» в MSTO.
const MSTO_GIG_ORDERS_ENABLED = process.env.MSTO_GIG_ORDERS_ENABLED === 'true';

// Загружает заказ и сверяет его сеть со scope пользователя.
// Чужой или несуществующий заказ — одинаковый 404, чтобы не раскрывать наличие.
async function loadOrderInScope(req, res) {
  const item = await dataSource.getCorporateOrderById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Заказ не найден' });
    return null;
  }
  const allowed = await getAllowedNetworkIds(req.user);
  if (allowed && !allowed.has(String(item.networkId))) {
    res.status(404).json({ error: 'Заказ не найден' });
    return null;
  }
  return item;
}

router.get('/', async (req, res) => {
  try {
    const allowed = await getAllowedNetworkIds(req.user);
    if (allowed && req.query.networkId && !allowed.has(String(req.query.networkId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этой сети' });
    }
    const items = await dataSource.getCorporateOrders({
      networkId: req.query.networkId,
      clientId: req.query.clientId,
      status: req.query.status,
      stationCode: req.query.stationCode,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      allowedNetworkIds: allowed ? Array.from(allowed) : null,
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки ведомости' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await loadOrderInScope(req, res);
    if (!item) return undefined;
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки заказа' });
  }
});

router.post('/', async (req, res) => {
  try {
    const allowed = await getAllowedNetworkIds(req.user);
    if (allowed && req.body?.networkId && !allowed.has(String(req.body.networkId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этой сети' });
    }
    const item = await dataSource.createCorporateOrder(req.body, req.user?.id);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания заказа' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await loadOrderInScope(req, res);
    if (!item) return undefined;
    await dataSource.deleteCorporateOrder(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления заказа' });
  }
});

// Фаза 2: реальная отправка заказа в MSTO как агент «ГИГ».
// Пока агент не зарегистрирован — заглушка за фиче-флагом.
router.post('/:id/send', async (req, res) => {
  if (!MSTO_GIG_ORDERS_ENABLED) {
    return res.status(501).json({
      error: 'Отправка заказов в MSTO ещё не подключена (агент «ГИГ» не настроен).',
    });
  }
  try {
    const item = await loadOrderInScope(req, res);
    if (!item) return undefined;
    // TODO (фаза 2): получить цену, собрать Tanker Order, POST /ptk/tanker/order?apikey=MSTO_GIG_AGENT_KEY,
    // сохранить msto_order_id/msto_session_id, status='sent'.
    return res.status(501).json({ error: 'Не реализовано' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка отправки заказа' });
  }
});

module.exports = router;
