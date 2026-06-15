const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/requireAdmin');
const dataSource = require('../services/corporateClients/corporateClientsDataSource');

const router = express.Router();

router.use(requireAuth);

function validateBody(body) {
  if (!body?.networkId) return 'Сеть обязательна';
  if (!body?.name || !String(body.name).trim()) return 'Наименование клиента обязательно';
  return null;
}

router.get('/', async (req, res) => {
  try {
    const items = await dataSource.getCorporateClients({
      networkId: req.query.networkId,
      status: req.query.status,
      searchTerm: req.query.searchTerm,
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки корпоративных клиентов' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await dataSource.getCorporateClientById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки клиента' });
  }
});

router.post('/', requireAdminAccess, async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
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
    const item = await dataSource.updateCorporateClient(req.params.id, req.body, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления клиента' });
  }
});

router.delete('/:id', requireAdminAccess, async (req, res) => {
  try {
    await dataSource.deleteCorporateClient(req.params.id, req.user?.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления клиента' });
  }
});

router.post('/:id/activate', requireAdminAccess, async (req, res) => {
  try {
    const item = await dataSource.setActive(req.params.id, true, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка активации клиента' });
  }
});

router.post('/:id/deactivate', requireAdminAccess, async (req, res) => {
  try {
    const item = await dataSource.setActive(req.params.id, false, req.user?.id);
    if (!item) return res.status(404).json({ error: 'Корпоративный клиент не найден' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка деактивации клиента' });
  }
});

module.exports = router;
