const fs = require('fs');
const path = require('path');
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireInventoryPermission } = require('../middleware/inventoryPermission');
const service = require('../services/inventoryAdjustments/inventoryAdjustmentsService');
const pdfRenderer = require('../services/inventoryAdjustments/pdfRenderer');

const router = express.Router();

router.use(requireAuth);

function buildActor(req) {
  return {
    id: req.user?.id,
    email: req.user?.email,
    name: req.user?.name,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

function handleError(res, error) {
  const code = error.statusCode || 500;
  if (code >= 500) {
    console.error('[inventory-adjustments] error:', error);
  }
  res.status(code).json({ error: error.message || 'Внутренняя ошибка сервера' });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const repo = require('../repositories/inventoryAdjustmentsRepository');

// GET /api/inventory-adjustments/email-recipients/:networkId — настройки рассылки сети
router.get('/email-recipients/:networkId', requireInventoryPermission('read'), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.networkId)) {
      return res.status(400).json({ error: 'networkId должен быть UUID' });
    }
    const config = await repo.getEmailRecipients(req.params.networkId);
    res.json(config || { recipients: [], cc: [], fromAddress: null });
  } catch (error) {
    handleError(res, error);
  }
});

// PUT /api/inventory-adjustments/email-recipients/:networkId — обновить настройки рассылки
router.put('/email-recipients/:networkId', requireInventoryPermission('send'), async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.networkId)) {
      return res.status(400).json({ error: 'networkId должен быть UUID' });
    }
    const { recipients, cc, fromAddress } = req.body || {};
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients — непустой массив email-адресов' });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const addr of recipients) {
      if (!emailRe.test(String(addr).trim())) {
        return res.status(400).json({ error: `Невалидный email: ${addr}` });
      }
    }
    if (Array.isArray(cc)) {
      for (const addr of cc) {
        if (addr && !emailRe.test(String(addr).trim())) {
          return res.status(400).json({ error: `Невалидный email в cc: ${addr}` });
        }
      }
    }
    if (fromAddress && !emailRe.test(String(fromAddress).trim())) {
      return res.status(400).json({ error: `Невалидный from-адрес: ${fromAddress}` });
    }

    const updated = await repo.upsertEmailRecipients(req.params.networkId, {
      recipients: recipients.map((a) => String(a).trim()),
      cc: Array.isArray(cc) ? cc.map((a) => String(a).trim()).filter(Boolean) : [],
      fromAddress: fromAddress ? String(fromAddress).trim() : null,
    });
    res.json(updated);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/inventory-adjustments?networkId=&tradingPointId=&status=&limit=&offset=
router.get('/', requireInventoryPermission('read'), async (req, res) => {
  try {
    const items = await service.list({
      networkId: req.query.networkId || undefined,
      tradingPointId: req.query.tradingPointId || undefined,
      status: req.query.status || undefined,
      createdByUserId: req.query.createdByUserId || undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(items);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/inventory-adjustments/:id/pdf — скачать PDF приказа
// Если файл уже сгенерирован при отправке — отдаётся он. Иначе генерируем на лету.
router.get('/:id/pdf', requireInventoryPermission('read'), async (req, res) => {
  try {
    const adjustment = await service.getById(req.params.id);
    if (!adjustment) return res.status(404).json({ error: 'Документ корректировки не найден' });

    let filePath = adjustment.pdfPath;
    if (!filePath || !fs.existsSync(filePath)) {
      filePath = await pdfRenderer.generatePdf(adjustment, adjustment.items);
    }

    const filename = `inventory-adjustment-${adjustment.orderNumber || adjustment.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    handleError(res, error);
  }
});

// GET /api/inventory-adjustments/:id
router.get('/:id', requireInventoryPermission('read'), async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Документ корректировки не найден' });
    res.json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/inventory-adjustments — создать draft
router.post('/', requireInventoryPermission('write'), async (req, res) => {
  try {
    const item = await service.createDraft(req.body, buildActor(req));
    res.status(201).json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// PUT /api/inventory-adjustments/:id — обновить draft (шапка + items)
router.put('/:id', requireInventoryPermission('write'), async (req, res) => {
  try {
    const item = await service.updateDraft(req.params.id, req.body, buildActor(req));
    res.json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/inventory-adjustments/:id/send — сгенерировать PDF и отправить email
// Используется и для первичной отправки, и для повторной попытки после email_status='failed'.
router.post('/:id/send', requireInventoryPermission('send'), async (req, res) => {
  try {
    const item = await service.sendAdjustment(req.params.id, buildActor(req));
    res.json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// POST /api/inventory-adjustments/:id/cancel — отменить draft
router.post('/:id/cancel', requireInventoryPermission('write'), async (req, res) => {
  try {
    const item = await service.cancelDraft(req.params.id, buildActor(req), req.body?.reason);
    res.json(item);
  } catch (error) {
    handleError(res, error);
  }
});

// DELETE /api/inventory-adjustments/:id — удалить draft
router.delete('/:id', requireInventoryPermission('write'), async (req, res) => {
  try {
    await service.deleteDraft(req.params.id, buildActor(req));
    res.json({ ok: true });
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
