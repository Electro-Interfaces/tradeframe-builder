const express = require('express');
const { requireAuth } = require('../middleware/auth');
const receiptCostSource = require('../services/costs/receiptCostPgSource');

const router = express.Router();

router.use(requireAuth);

// GET /api/receipt-costs?systemId=1&stationNumber=3&dtBeg=...&dtEnd=...
router.get('/', async (req, res) => {
  try {
    const items = await receiptCostSource.getReceiptCosts({
      systemId: req.query.systemId ? parseInt(req.query.systemId) : undefined,
      stationNumber: req.query.stationNumber ? parseInt(req.query.stationNumber) : undefined,
      tankNumber: req.query.tankNumber ? parseInt(req.query.tankNumber) : undefined,
      fuelCode: req.query.fuelCode ? parseInt(req.query.fuelCode) : undefined,
      ttn: req.query.ttn,
      dtBeg: req.query.dtBeg,
      dtEnd: req.query.dtEnd,
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки себестоимости' });
  }
});

// GET /api/receipt-costs/avg?systemId=1&stationNumber=3&dtBeg=...&dtEnd=...
router.get('/avg', async (req, res) => {
  try {
    if (!req.query.systemId) {
      return res.status(400).json({ error: 'systemId обязателен' });
    }

    const items = await receiptCostSource.getAvgCostByFuel(
      parseInt(req.query.systemId),
      req.query.stationNumber ? parseInt(req.query.stationNumber) : undefined,
      req.query.dtBeg,
      req.query.dtEnd,
    );

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка расчёта средней себестоимости' });
  }
});

// POST /api/receipt-costs — upsert одной записи
router.post('/', async (req, res) => {
  try {
    const { body } = req;

    if (!body.systemId || !body.ttn || !body.receiptDt) {
      return res.status(400).json({ error: 'systemId, ttn и receiptDt обязательны' });
    }

    if (typeof body.costPerLiter !== 'number' || body.costPerLiter < 0) {
      return res.status(400).json({ error: 'costPerLiter должен быть числом >= 0' });
    }

    const item = await receiptCostSource.upsertReceiptCost(body, req.user?.id);
    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка сохранения себестоимости' });
  }
});

// POST /api/receipt-costs/bulk — массовый upsert
router.post('/bulk', async (req, res) => {
  try {
    const { entries, mode } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries должен быть непустым массивом' });
    }

    if (entries.length > 500) {
      return res.status(400).json({ error: 'Максимум 500 записей за раз' });
    }

    const result = await receiptCostSource.bulkUpsertReceiptCosts(
      entries,
      req.user?.id,
      mode || 'fill_empty'
    );

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка массового сохранения' });
  }
});

// DELETE /api/receipt-costs/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await receiptCostSource.deleteReceiptCost(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка удаления' });
  }
});

module.exports = router;
