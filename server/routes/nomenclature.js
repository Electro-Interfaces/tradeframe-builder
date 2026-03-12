const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/requireAdmin');
const nomenclatureDataSource = require('../services/nomenclature/nomenclatureDataSource');

const router = express.Router();

router.use(requireAuth);

function validateBody(body) {
  if (!body?.networkId) {
    return 'Сеть обязательна';
  }

  if (!body?.name) {
    return 'Название обязательно';
  }

  if (!body?.internalCode) {
    return 'Внутренний код обязателен';
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const items = await nomenclatureDataSource.getNomenclature({
      networkId: req.query.networkId,
      status: req.query.status,
      searchTerm: req.query.searchTerm,
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Ошибка загрузки номенклатуры' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await nomenclatureDataSource.getNomenclatureById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Номенклатура не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки номенклатуры' });
  }
});

router.post('/', requireAdminAccess, async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const item = await nomenclatureDataSource.createNomenclature(req.body, req.user?.id);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка создания номенклатуры' });
  }
});

router.put('/:id', requireAdminAccess, async (req, res) => {
  const validationError = validateBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const item = await nomenclatureDataSource.updateNomenclature(req.params.id, req.body, req.user?.id);
    if (!item) {
      return res.status(404).json({ error: 'Номенклатура не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка обновления номенклатуры' });
  }
});

router.delete('/:id', requireAdminAccess, async (req, res) => {
  try {
    await nomenclatureDataSource.deleteNomenclature(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления номенклатуры' });
  }
});

router.post('/:id/archive', requireAdminAccess, async (req, res) => {
  try {
    const item = await nomenclatureDataSource.archiveNomenclature(req.params.id, req.user?.id);
    if (!item) {
      return res.status(404).json({ error: 'Номенклатура не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка архивации номенклатуры' });
  }
});

router.post('/:id/activate', requireAdminAccess, async (req, res) => {
  try {
    const item = await nomenclatureDataSource.activateNomenclature(req.params.id, req.user?.id);
    if (!item) {
      return res.status(404).json({ error: 'Номенклатура не найдена' });
    }

    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка активации номенклатуры' });
  }
});

router.get('/:id/external-codes', async (req, res) => {
  try {
    const mappings = await nomenclatureDataSource.getExternalCodeMappings(req.params.id);
    return res.json(mappings);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Ошибка загрузки внешних кодов' });
  }
});

router.post('/:id/external-codes', requireAdminAccess, async (req, res) => {
  if (!req.body?.systemType || !req.body?.externalCode) {
    return res.status(400).json({ error: 'Тип системы и внешний код обязательны' });
  }

  try {
    const mapping = await nomenclatureDataSource.addExternalCode(req.params.id, req.body);
    return res.status(201).json(mapping);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка добавления внешнего кода' });
  }
});

router.delete('/:id/external-codes/:mappingId', requireAdminAccess, async (req, res) => {
  try {
    await nomenclatureDataSource.removeExternalCode(req.params.id, req.params.mappingId);
    return res.status(204).send();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Ошибка удаления внешнего кода' });
  }
});

module.exports = router;
