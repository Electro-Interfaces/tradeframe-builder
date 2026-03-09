const express = require('express');

const { tryAuth } = require('../middleware/auth');
const legalDataSource = require('../services/legal/legalDataSource');
const { isLegalDocumentType } = require('../services/legal/legalTransforms');

const router = express.Router();

router.use(tryAuth);

function resolveUserContext(req, body = {}) {
  return {
    userId: req.user?.id || body.userId || body.user_id,
    userEmail: req.user?.email || body.userEmail || body.user_email || '',
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || '',
  };
}

router.get('/document-types', async (req, res) => {
  try {
    const items = await legalDataSource.getDocumentTypes();
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки типов документов' });
  }
});

router.get('/document-types/:docType', async (req, res) => {
  if (!isLegalDocumentType(req.params.docType)) {
    return res.status(400).json({ error: 'Неизвестный тип документа' });
  }

  try {
    const item = await legalDataSource.getDocumentTypeInfo(req.params.docType);
    if (!item) {
      return res.status(404).json({ error: 'Тип документа не найден' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки типа документа' });
  }
});

router.get('/document-versions', async (req, res) => {
  try {
    const items = await legalDataSource.getDocumentVersions(req.query.docTypeCode);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки версий документов' });
  }
});

router.get('/document-versions/:versionId', async (req, res) => {
  try {
    const item = await legalDataSource.getDocumentVersion(req.params.versionId);
    if (!item) {
      return res.status(404).json({ error: 'Версия документа не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки версии документа' });
  }
});

router.patch('/document-versions/:versionId', async (req, res) => {
  try {
    const item = await legalDataSource.updateDocumentVersion(req.params.versionId, {
      version: req.body?.version,
      contentMd: req.body?.content_md,
      changelog: req.body?.changelog,
      locale: req.body?.locale,
    });

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления версии документа' });
  }
});

router.post('/document-versions/:versionId/publish', async (req, res) => {
  try {
    const item = await legalDataSource.publishDocumentVersion(req.params.versionId);
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка публикации версии документа' });
  }
});

router.get('/current-version/:docType', async (req, res) => {
  if (!isLegalDocumentType(req.params.docType)) {
    return res.status(400).json({ error: 'Неизвестный тип документа' });
  }

  try {
    const item = await legalDataSource.getCurrentDocumentVersion(req.params.docType);
    if (!item) {
      return res.status(404).json({ error: 'Текущая версия документа не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки текущей версии документа' });
  }
});

router.post('/acceptances', async (req, res) => {
  const docType = req.body?.docType;
  const versionId = req.body?.versionId;

  if (!versionId && !isLegalDocumentType(docType)) {
    return res.status(400).json({ error: 'Не указана версия документа или тип документа' });
  }

  const userContext = resolveUserContext(req, req.body);
  if (!userContext.userId) {
    return res.status(400).json({ error: 'Не указан пользователь' });
  }

  try {
    const item = await legalDataSource.acceptDocument({
      versionId,
      docType,
      userId: userContext.userId,
      userEmail: userContext.userEmail,
      source: req.body?.source || 'web',
      userAgent: userContext.userAgent,
      ipAddress: userContext.ipAddress,
    });

    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка записи согласия' });
  }
});

router.get('/users/:userId/acceptances', async (req, res) => {
  try {
    const items = await legalDataSource.getUserAcceptances(req.params.userId);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки согласий пользователя' });
  }
});

router.get('/users/:userId/consent-requirement', async (req, res) => {
  try {
    const item = await legalDataSource.getUserConsentRequirement(req.params.userId);
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки требований согласий' });
  }
});

router.put('/users/:userId/status', async (req, res) => {
  if (!isLegalDocumentType(req.body?.docType) || !req.body?.versionId) {
    return res.status(400).json({ error: 'Тип документа и версия обязательны' });
  }

  try {
    const item = await legalDataSource.updateUserLegalStatus(
      req.params.userId,
      req.body.docType,
      req.body.versionId,
      req.body.acceptedAt
    );

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления статуса согласий' });
  }
});

router.get('/acceptance-journal', async (req, res) => {
  try {
    const items = await legalDataSource.getAcceptanceJournal({
      doc_type: req.query.docType,
      version_id: req.query.versionId,
      user_id: req.query.userId,
      user_email: req.query.userEmail,
      date_from: req.query.dateFrom,
      date_to: req.query.dateTo,
      source: req.query.source,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки журнала согласий' });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const items = await legalDataSource.getDocumentStatistics();
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки статистики документов' });
  }
});

router.post('/document-drafts', async (req, res) => {
  if (!isLegalDocumentType(req.body?.doc_type_code) || !req.body?.version) {
    return res.status(400).json({ error: 'Тип документа и версия обязательны' });
  }

  const userContext = resolveUserContext(req, req.body);

  try {
    const item = await legalDataSource.createDocumentDraft({
      docTypeCode: req.body.doc_type_code,
      version: req.body.version,
      contentMd: req.body.content_md || '',
      changelog: req.body.changelog || '',
      locale: req.body.locale || 'ru',
      editorId: userContext.userId || req.body.editor_id || null,
      editorName: req.user?.name || req.body.editor_name || '',
    });

    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания черновика' });
  }
});

router.get('/audit-log', async (req, res) => {
  try {
    const items = await legalDataSource.getAuditLog({
      actor_id: req.query.actorId,
      action: req.query.action,
      resource_type: req.query.resourceType,
      date_from: req.query.dateFrom,
      date_to: req.query.dateTo,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки журнала действий' });
  }
});

module.exports = router;
