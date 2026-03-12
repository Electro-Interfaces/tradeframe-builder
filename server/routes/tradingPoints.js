const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { filterTradingPointsByScope } = require('../middleware/scopeFilter');
const orgDataSource = require('../services/org/orgDataSource');

const router = express.Router();

router.use(requireAuth);

router.get('/', filterTradingPointsByScope, async (req, res) => {
  try {
    const points = await orgDataSource.getTradingPoints(req.query.networkId || null);
    res.json(points);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки торговых точек' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const point = await orgDataSource.getTradingPointById(req.params.id);
    if (!point) {
      return res.status(404).json({ error: 'Торговая точка не найдена' });
    }

    return res.json(point);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки торговой точки' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body?.networkId || !req.body?.name) {
      return res.status(400).json({ error: 'networkId и name обязательны' });
    }

    const point = await orgDataSource.createTradingPoint(req.body);
    return res.status(201).json(point);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания торговой точки' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const point = await orgDataSource.updateTradingPoint(req.params.id, req.body || {});
    if (!point) {
      return res.status(404).json({ error: 'Торговая точка не найдена' });
    }

    return res.json(point);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления торговой точки' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await orgDataSource.deleteTradingPoint(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления торговой точки' });
  }
});

router.put('/:id/bill-acceptor-thresholds', async (req, res) => {
  try {
    await orgDataSource.updateBillAcceptorThresholds(req.params.id, req.body || {});
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления порогов купюроприемника' });
  }
});

router.put('/:id/fuel-level-thresholds', async (req, res) => {
  try {
    await orgDataSource.updateFuelLevelThresholds(req.params.id, req.body || {});
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления порогов топлива' });
  }
});

router.post('/:id/external-codes', async (req, res) => {
  try {
    const externalCode = await orgDataSource.addExternalCode(req.params.id, req.body || {});
    return res.status(201).json(externalCode);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка добавления внешнего кода' });
  }
});

router.put('/:id/external-codes/:codeId', async (req, res) => {
  try {
    const externalCode = await orgDataSource.updateExternalCode(
      req.params.id,
      req.params.codeId,
      req.body || {}
    );

    if (!externalCode) {
      return res.status(404).json({ error: 'Внешний код не найден' });
    }

    return res.json(externalCode);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления внешнего кода' });
  }
});

router.delete('/:id/external-codes/:codeId', async (req, res) => {
  try {
    await orgDataSource.removeExternalCode(req.params.id, req.params.codeId);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления внешнего кода' });
  }
});

module.exports = router;
