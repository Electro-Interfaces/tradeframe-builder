const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { filterNetworksByScope, getUserScope, hasNetworkAccess } = require('../middleware/scopeFilter');
const orgDataSource = require('../services/org/orgDataSource');

const router = express.Router();

router.use(requireAuth);

router.get('/', filterNetworksByScope, async (req, res) => {
  try {
    const networks = await orgDataSource.getNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки сетей' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const network = await orgDataSource.getNetworkById(req.params.id);
    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }

    // Проверяем доступ по scope
    const scope = getUserScope(req.user);
    if (scope.hasRestrictions && !hasNetworkAccess(network, scope)) {
      return res.status(403).json({ error: 'Нет доступа к этой сети' });
    }

    return res.json(network);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки сети' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body?.name) {
      return res.status(400).json({ error: 'Название сети обязательно' });
    }

    const network = await orgDataSource.createNetwork(req.body);
    return res.status(201).json(network);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания сети' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.body?.name) {
      return res.status(400).json({ error: 'Название сети обязательно' });
    }

    const network = await orgDataSource.updateNetwork(req.params.id, req.body);
    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }

    return res.json(network);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления сети' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await orgDataSource.deleteNetwork(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления сети' });
  }
});

module.exports = router;
