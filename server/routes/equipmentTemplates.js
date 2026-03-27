const express = require('express');
const { requireAuth } = require('../middleware/auth');
const pgSource = require('../services/equipmentTemplatesPgSource');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const templates = await pgSource.listTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await pgSource.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const template = await pgSource.createTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const template = await pgSource.updateTemplate(req.params.id, req.body);
    if (!template) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await pgSource.deleteTemplate(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Шаблон не найден' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
