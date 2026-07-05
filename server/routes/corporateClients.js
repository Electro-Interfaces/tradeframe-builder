const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/requireAdmin');
const { getAllowedNetworkIds } = require('../middleware/scopeFilter');
const dataSource = require('../services/corporateClients/corporateClientsDataSource');

const router = express.Router();

router.use(requireAuth);

function validateBody(body) {
  if (!body?.networkId) return 'Сеть обязательна';
  if (!body?.name || !String(body.name).trim()) return 'Наименование клиента обязательно';
  return null;
}

// Загружает клиента и сверяет его сеть со scope пользователя.
// Чужой или несуществующий клиент — одинаковый 404, чтобы не раскрывать наличие.
async function loadClientInScope(req, res) {
  const item = await dataSource.getCorporateClientById(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return null;
  }
  const allowed = await getAllowedNetworkIds(req.user);
  if (allowed && !allowed.has(String(item.networkId))) {
    res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return null;
  }
  return item;
}

// Сеть из тела запроса должна входить в scope пользователя.
async function assertBodyNetworkInScope(req, res) {
  const allowed = await getAllowedNetworkIds(req.user);
  if (allowed && req.body?.networkId && !allowed.has(String(req.body.networkId))) {
    res.status(403).json({ error: 'Нет доступа к данным этой сети' });
    return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  try {
    const allowed = await getAllowedNetworkIds(req.user);
    if (allowed && req.query.networkId && !allowed.has(String(req.query.networkId))) {
      return res.status(403).json({ error: 'Нет доступа к данным этой сети' });
    }
    const items = await dataSource.getCorporateClients({
      networkId: req.query.networkId,
      status: req.query.status,
      searchTerm: req.query.searchTerm,
      allowedNetworkIds: allowed ? Array.from(allowed) : null,
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки корпоративных клиентов' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await loadClientInScope(req, res);
    if (!item) return undefined;
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки клиента' });
  }
});

router.post('/', requireAdminAccess, async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    if (!(await assertBodyNetworkInScope(req, res))) return undefined;
    const item = await dataSource.createCorporateClient(req.body, req.user?.id);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания клиента' });
  }
});

router.put('/:id', requireAdminAccess, async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const existing = await loadClientInScope(req, res);
    if (!existing) return undefined;
    if (!(await assertBodyNetworkInScope(req, res))) return undefined;
    const item = await dataSource.updateCorporateClient(req.params.id, req.body, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления клиента' });
  }
});

router.delete('/:id', requireAdminAccess, async (req, res) => {
  try {
    const existing = await loadClientInScope(req, res);
    if (!existing) return undefined;
    await dataSource.deleteCorporateClient(req.params.id, req.user?.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления клиента' });
  }
});

router.post('/:id/activate', requireAdminAccess, async (req, res) => {
  try {
    const existing = await loadClientInScope(req, res);
    if (!existing) return undefined;
    const item = await dataSource.setActive(req.params.id, true, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка активации клиента' });
  }
});

router.post('/:id/deactivate', requireAdminAccess, async (req, res) => {
  try {
    const existing = await loadClientInScope(req, res);
    if (!existing) return undefined;
    const item = await dataSource.setActive(req.params.id, false, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка деактивации клиента' });
  }
});

module.exports = router;
