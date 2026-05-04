const repo = require('../../repositories/inventoryAdjustmentsRepository');
const pdfRenderer = require('./pdfRenderer');
const mailer = require('./mailer');
const auditPgSource = require('../audit/auditPgSource');

async function writeAudit(actor, entry) {
  try {
    await auditPgSource.createAuditLog({
      user_id: actor?.id || null,
      user_email: actor?.email || '',
      user_name: actor?.name || null,
      ip_address: actor?.ipAddress || null,
      user_agent: actor?.userAgent || null,
      object_type: 'inventory_adjustment',
      ...entry,
    });
  } catch (error) {
    // Аудит не должен блокировать основное действие — логируем и идём дальше.
    console.error('[inventory-adjustments] audit write failed:', error.message);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
    this.name = 'ConflictError';
  }
}

function assertUuid(value, fieldName) {
  if (!value || !UUID_RE.test(String(value))) {
    throw new ValidationError(`Поле ${fieldName} должно быть UUID`);
  }
}

function assertNonEmpty(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new ValidationError(`Поле ${fieldName} обязательно`);
  }
}

function assertDate(value, fieldName) {
  if (!value) throw new ValidationError(`Поле ${fieldName} обязательно`);
  if (Number.isNaN(Date.parse(value))) {
    throw new ValidationError(`Поле ${fieldName} должно быть валидной датой ISO`);
  }
}

function validateHeader(data) {
  assertUuid(data.networkId, 'networkId');
  assertNonEmpty(data.tradingPointId, 'tradingPointId');
  assertNonEmpty(data.orderNumber, 'orderNumber');
  assertDate(data.orderDate, 'orderDate');
  assertDate(data.inventoryDate, 'inventoryDate');
  assertDate(data.effectiveAt, 'effectiveAt');
}

function validateItems(items) {
  if (!Array.isArray(items)) {
    throw new ValidationError('items должен быть массивом');
  }

  const seen = new Set();
  for (const item of items) {
    if (item.tankNumber === undefined || item.tankNumber === null) {
      throw new ValidationError('tankNumber обязателен для строки таблицы');
    }
    const key = String(item.tankNumber);
    if (seen.has(key)) {
      throw new ValidationError(`Резервуар №${key} указан дважды`);
    }
    seen.add(key);

    if (!item.fuelName || String(item.fuelName).trim() === '') {
      throw new ValidationError(`Резервуар №${key}: укажите тип топлива`);
    }
    if (item.bookVolumeL === undefined || item.bookVolumeL === null || Number.isNaN(Number(item.bookVolumeL))) {
      throw new ValidationError(`Резервуар №${key}: книжный остаток должен быть числом`);
    }
    if (item.factVolumeL !== null && item.factVolumeL !== undefined && Number.isNaN(Number(item.factVolumeL))) {
      throw new ValidationError(`Резервуар №${key}: фактический остаток должен быть числом`);
    }
  }
}

function normalizeItemsForRepo(items) {
  return (items || []).map((item) => ({
    tankNumber: Number(item.tankNumber),
    fuelName: String(item.fuelName).trim(),
    bookVolumeL: Number(item.bookVolumeL),
    bookMassKg:
      item.bookMassKg === null || item.bookMassKg === undefined || item.bookMassKg === ''
        ? null
        : Number(item.bookMassKg),
    factVolumeL:
      item.factVolumeL === null || item.factVolumeL === undefined || item.factVolumeL === ''
        ? null
        : Number(item.factVolumeL),
    factMassKg:
      item.factMassKg === null || item.factMassKg === undefined || item.factMassKg === ''
        ? null
        : Number(item.factMassKg),
  }));
}

async function createDraft(data, actor) {
  validateHeader(data);
  if (data.items !== undefined) {
    validateItems(data.items);
  }

  const id = await repo.createAdjustment(
    {
      networkId: data.networkId,
      tradingPointId: data.tradingPointId,
      orderNumber: String(data.orderNumber).trim(),
      orderDate: data.orderDate,
      inventoryDate: data.inventoryDate,
      effectiveAt: data.effectiveAt,
      comment: data.comment ?? null,
      items: normalizeItemsForRepo(data.items || []),
    },
    actor?.id
  );

  await writeAudit(actor, {
    action: `Создан черновик корректировки № ${data.orderNumber}`,
    action_type: 'create',
    object_id: id,
    metadata: {
      network_id: data.networkId,
      trading_point_id: data.tradingPointId,
      status_to: 'draft',
    },
  });

  return getById(id);
}

async function updateDraft(id, data, actor) {
  assertUuid(id, 'id');

  const existing = await repo.getAdjustmentById(id);
  if (!existing) throw new NotFoundError('Документ корректировки не найден');
  if (existing.status !== 'draft') {
    throw new ConflictError('Редактировать можно только документ в статусе draft');
  }

  if (data.items !== undefined) {
    validateItems(data.items);
  }
  if (data.orderDate !== undefined && data.orderDate !== null) assertDate(data.orderDate, 'orderDate');
  if (data.inventoryDate !== undefined && data.inventoryDate !== null) assertDate(data.inventoryDate, 'inventoryDate');
  if (data.effectiveAt !== undefined && data.effectiveAt !== null) assertDate(data.effectiveAt, 'effectiveAt');

  const ok = await repo.updateDraft(id, {
    orderNumber: data.orderNumber !== undefined ? String(data.orderNumber).trim() : null,
    orderDate: data.orderDate ?? null,
    inventoryDate: data.inventoryDate ?? null,
    effectiveAt: data.effectiveAt ?? null,
    comment: data.comment !== undefined ? data.comment : existing.comment,
    items: data.items !== undefined ? normalizeItemsForRepo(data.items) : undefined,
  });

  if (!ok) {
    throw new ConflictError('Не удалось обновить документ (возможно, статус изменился)');
  }

  await writeAudit(actor, {
    action: `Обновлён черновик корректировки № ${existing.orderNumber}`,
    action_type: 'update',
    object_id: id,
    metadata: {
      network_id: existing.networkId,
      trading_point_id: existing.tradingPointId,
    },
  });

  return getById(id);
}

async function getById(id) {
  assertUuid(id, 'id');
  const head = await repo.getAdjustmentById(id);
  if (!head) return null;
  const items = await repo.getItemsForAdjustment(id);
  return { ...head, items };
}

async function list(filters) {
  return repo.listAdjustments(filters);
}

async function cancelDraft(id, actor, reason) {
  assertUuid(id, 'id');

  const existing = await repo.getAdjustmentById(id);
  if (!existing) throw new NotFoundError('Документ корректировки не найден');
  if (existing.status !== 'draft') {
    throw new ConflictError('Отменять можно только документ в статусе draft');
  }

  const ok = await repo.markCancelled(id, actor?.id, reason);
  if (!ok) {
    throw new ConflictError('Не удалось отменить документ');
  }

  await writeAudit(actor, {
    action: `Отменён документ корректировки № ${existing.orderNumber}`,
    action_type: 'cancel',
    object_id: id,
    details: reason ? { reason } : null,
    metadata: {
      network_id: existing.networkId,
      trading_point_id: existing.tradingPointId,
      status_from: 'draft',
      status_to: 'cancelled',
    },
  });

  return getById(id);
}

async function deleteDraft(id, actor) {
  assertUuid(id, 'id');

  const existing = await repo.getAdjustmentById(id);
  if (!existing) throw new NotFoundError('Документ корректировки не найден');
  if (existing.status !== 'draft') {
    throw new ConflictError('Удалять можно только документ в статусе draft');
  }

  const ok = await repo.deleteDraft(id);
  if (!ok) {
    throw new ConflictError('Не удалось удалить документ');
  }

  await writeAudit(actor, {
    action: `Удалён черновик корректировки № ${existing.orderNumber}`,
    action_type: 'delete',
    object_id: id,
    metadata: {
      network_id: existing.networkId,
      trading_point_id: existing.tradingPointId,
    },
  });
}

async function sendAdjustment(id, actor) {
  assertUuid(id, 'id');

  const existing = await repo.getAdjustmentById(id);
  if (!existing) throw new NotFoundError('Документ корректировки не найден');
  if (existing.status !== 'draft') {
    throw new ConflictError('Отправить можно только документ в статусе draft');
  }

  const items = await repo.getItemsForAdjustment(id);
  const filled = items.filter((it) => it.factVolumeL !== null && it.factVolumeL !== undefined);
  if (filled.length === 0) {
    throw new ValidationError('Заполните фактический остаток хотя бы по одному резервуару перед отправкой');
  }

  const recipientsConfig = await repo.getEmailRecipients(existing.networkId);
  if (!recipientsConfig || !recipientsConfig.recipients.length) {
    throw new ValidationError(
      'Для сети не настроен список получателей рассылки. Обратитесь к администратору.'
    );
  }

  let pdfPath;
  try {
    pdfPath = await pdfRenderer.generatePdf(existing, items);
  } catch (error) {
    await repo.markSendFailure(id, `Не удалось сгенерировать PDF: ${error.message}`);
    await writeAudit(actor, {
      action: `Ошибка генерации PDF для корректировки № ${existing.orderNumber}`,
      action_type: 'send_failed',
      object_id: id,
      details: { error: error.message, stage: 'pdf' },
    });
    throw new Error(`Не удалось сгенерировать PDF: ${error.message}`);
  }

  try {
    await mailer.sendAdjustmentEmail({
      adjustment: existing,
      items,
      recipients: recipientsConfig.recipients,
      cc: recipientsConfig.cc,
      fromAddress: recipientsConfig.fromAddress,
      pdfPath,
    });
  } catch (error) {
    await repo.markSendFailure(id, `Ошибка отправки email: ${error.message}`);
    await writeAudit(actor, {
      action: `Ошибка отправки email для корректировки № ${existing.orderNumber}`,
      action_type: 'send_failed',
      object_id: id,
      details: { error: error.message, stage: 'email', recipients: recipientsConfig.recipients },
    });
    throw new Error(`Ошибка отправки email: ${error.message}`);
  }

  const ok = await repo.markSentSuccess(id, actor?.id, {
    pdfPath,
    emailTo: recipientsConfig.recipients,
  });
  if (!ok) {
    throw new ConflictError('Не удалось зафиксировать отправку документа');
  }

  await writeAudit(actor, {
    action: `Документ корректировки № ${existing.orderNumber} отправлен на ${recipientsConfig.recipients.length} адр.`,
    action_type: 'send',
    object_id: id,
    details: { recipients: recipientsConfig.recipients, cc: recipientsConfig.cc },
    metadata: {
      network_id: existing.networkId,
      trading_point_id: existing.tradingPointId,
      status_from: 'draft',
      status_to: 'sent',
    },
  });

  return getById(id);
}

module.exports = {
  ValidationError,
  NotFoundError,
  ConflictError,
  createDraft,
  updateDraft,
  getById,
  list,
  cancelDraft,
  deleteDraft,
  sendAdjustment,
};
