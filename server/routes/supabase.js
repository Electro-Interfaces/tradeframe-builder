/**
 * Supabase Proxy Route
 * Проксирует запросы к Supabase REST API для обхода CORS и блокировок мобильных сетей
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Supabase конфигурация из переменных окружения
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

/**
 * Проксирование всех запросов к Supabase REST API
 * Поддерживает GET, POST, PATCH, DELETE
 */
router.all('/*', async (req, res) => {
  try {
    let endpoint = req.params[0]; // Всё после /api/supabase/

    // Если путь не начинается с rest/v1/, добавляем его
    if (!endpoint.startsWith('rest/v1/')) {
      endpoint = 'rest/v1/' + endpoint;
    }

    const url = `${SUPABASE_URL}/${endpoint}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;

    // Подготовка заголовков для Supabase
    const headers = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': req.headers['prefer'] || 'return=representation'
    };

    // Выполнение запроса к Supabase
    const response = await axios({
      method: req.method,
      url: url,
      headers: headers,
      data: req.body,
      validateStatus: () => true // Не выбрасывать ошибку на любой status code
    });

    // Пробрасываем заголовки ответа
    Object.keys(response.headers).forEach(key => {
      if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, response.headers[key]);
      }
    });

    // Возвращаем ответ от Supabase
    res.status(response.status).send(response.data);

  } catch (error) {
    console.error('[Supabase Proxy Error]', error.message);

    res.status(error.response?.status || 500).json({
      error: 'Supabase proxy error',
      message: error.message,
      details: error.response?.data
    });
  }
});

module.exports = router;
