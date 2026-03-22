const express = require('express');
const { requireAuth } = require('../middleware/auth');
const confirmationSource = require('../services/receiptConfirmationPgSource');

const router = express.Router();

router.use(requireAuth);

// GET /api/receipt-confirmations?systemId=1&stationNumber=3&dtBeg=...&dtEnd=...
router.get('/', async (req, res) => {
  try {
    const items = await confirmationSource.getConfirmations({
      systemId: req.query.systemId ? parseInt(req.query.systemId) : undefined,
      stationNumber: req.query.stationNumber ? parseInt(req.query.stationNumber) : undefined,
      tankNumber: req.query.tankNumber ? parseInt(req.query.tankNumber) : undefined,
      ttn: req.query.ttn,
      status: req.query.status,
      dtBeg: req.query.dtBeg,
      dtEnd: req.query.dtEnd,
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки подтверждений' });
  }
});

// POST /api/receipt-confirmations — подтвердить / скорректировать
router.post('/', async (req, res) => {
  try {
    const { body } = req;

    if (!body.systemId || body.stationNumber == null || body.tankNumber == null || !body.ttn || !body.receiptDt) {
      return res.status(400).json({ error: 'systemId, stationNumber, tankNumber, ttn и receiptDt обязательны' });
    }

    if (!['confirmed', 'corrected', 'rejected'].includes(body.status)) {
      return res.status(400).json({ error: 'status должен быть confirmed, corrected или rejected' });
    }

    // Имя пользователя для отображения
    const confirmedByName = body.confirmedByName
      || req.user?.name
      || req.user?.email
      || '';

    const item = await confirmationSource.upsertConfirmation(
      { ...body, confirmedByName },
      req.user?.id
    );

    return res.status(200).json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка сохранения подтверждения' });
  }
});

// DELETE /api/receipt-confirmations/:id — отменить подтверждение
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.delete('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: 'Невалидный id' });
    }
    const deleted = await confirmationSource.deleteConfirmation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Подтверждение не найдено' });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка удаления подтверждения' });
  }
});

module.exports = router;
