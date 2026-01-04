const express = require('express');
const axios = require('axios');

const router = express.Router();

// TradeCorp API использует JSON-RPC 2.0
// Двухэтапная авторизация:
// 1. login на processing API с credentials из .env
// 2. Все запросы с Bearer токеном

let tradecorpClient = null;
let processingToken = null;
let tokenExpiry = null;

// Конфигурация из .env
const TRADECORP_API_URL = process.env.TRADECORP_API_URL;
const TRADECORP_LOGIN = process.env.TRADECORP_LOGIN;
const TRADECORP_PASSWORD = process.env.TRADECORP_PASSWORD;
const TRADECORP_EMITENT_ID = parseInt(process.env.TRADECORP_EMITENT_ID || '15', 10);

async function getTradecorpClient() {
  if (!tradecorpClient) {
    if (!TRADECORP_API_URL || !TRADECORP_LOGIN || !TRADECORP_PASSWORD) {
      throw new Error('Missing required TradeCorp API environment variables');
    }

    tradecorpClient = axios.create({
      baseURL: TRADECORP_API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('[TradeCorp Proxy] Client initialized with URL:', TRADECORP_API_URL);
  }

  // Проверяем токен
  if (!processingToken || (tokenExpiry && Date.now() >= tokenExpiry)) {
    await refreshProcessingToken();
  }

  return tradecorpClient;
}

async function refreshProcessingToken() {
  console.log('[TradeCorp Proxy] Refreshing processing token...');

  try {
    // Авторизация на processing API
    const response = await tradecorpClient.post('/v2', {
      jsonrpc: '2.0',
      id: 0,
      method: 'login',
      params: {
        login: TRADECORP_LOGIN,
        password: TRADECORP_PASSWORD
      }
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || 'Login failed');
    }

    processingToken = response.data.result;
    // Токен действителен ~1 час, обновляем за 5 минут до истечения
    tokenExpiry = Date.now() + (55 * 60 * 1000);

    tradecorpClient.defaults.headers['Authorization'] = `Bearer ${processingToken}`;

    console.log('[TradeCorp Proxy] Processing token refreshed successfully');
  } catch (error) {
    console.error('[TradeCorp Proxy] Failed to refresh token:', error.message);
    throw new Error('Failed to authenticate with TradeCorp API');
  }
}

// Middleware для логирования
router.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[TradeCorp Proxy] ${req.method} ${req.path}`);
  next();
});

// Получение транзакций
router.post('/transactions', async (req, res) => {
  try {
    const { dateFrom, dateTo, stationIds } = req.body;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dateFrom and dateTo are required'
      });
    }

    const client = await getTradecorpClient();

    // Форматируем даты с временем (TradeCorp требует формат YYYY-MM-DD HH:MM:SS)
    const dateFromFormatted = `${dateFrom} 00:00:00`;
    const dateToFormatted = `${dateTo} 23:59:59`;

    console.log('[TradeCorp Proxy] Date range:', { dateFromFormatted, dateToFormatted });

    // Формируем фильтр для JSON-RPC запроса
    // Operation IDs: 603=заправка, 614=возврат, 504=пополнение, 505=списание, 508=перевод, 511=корректировка
    const filter = {
      operation: [{ equal: [603, 614, 504, 505, 508, 511] }],
      date: [{
        more: [dateFromFormatted],
        less: [dateToFormatted]
      }],
      card: {
        id: [{ unequal: [null] }] // Только транзакции с картами
      }
    };

    // Добавляем фильтр по станциям если указаны
    if (stationIds && stationIds.length > 0) {
      filter.station = {
        number: [{ equal: stationIds }]
      };
    }

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'transactions_get',
      params: {
        emitent: TRADECORP_EMITENT_ID,
        filter: filter,
        calc: 1
      }
    };

    console.log('[TradeCorp Proxy] Requesting transactions:', JSON.stringify(body, null, 2));

    const response = await client.post('/v1', body);

    console.log('[TradeCorp Proxy] Raw API response:', {
      hasError: !!response.data.error,
      error: response.data.error || null,
      resultLength: response.data.result?.length,
      resultSample: response.data.result?.[0] || null
    });

    if (response.data.error) {
      throw new Error(response.data.error.message || 'TradeCorp API Error');
    }

    const duration = Date.now() - req.startTime;
    const transactions = response.data.result || [];
    console.log(`[TradeCorp Proxy] Got ${transactions.length} transactions in ${duration}ms`);

    if (transactions.length > 0) {
      console.log('[TradeCorp Proxy] First transaction sample:', JSON.stringify(transactions[0], null, 2));
    }

    // Преобразуем данные: TradeCorp возвращает cost в КОПЕЙКАХ, quantity в СОТЫХ ДОЛЯХ литра
    const normalizedTransactions = transactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      cardNumber: tx.card?.number || tx.identifier?.number,
      cardId: tx.card?.id,
      stationId: tx.station?.id,
      stationNumber: tx.station?.number,
      stationName: tx.station?.name,
      operationName: tx.operation_name,
      quantity: tx.quantity / 100, // Конвертация сотые доли → литры
      cost: tx.cost / 100, // Конвертация копейки → рубли
      price: tx.price / 100,
      cheque: tx.cheque?.map(c => ({
        productName: c.product_name,
        quantity: c.quantity / 100, // Конвертация сотые доли → литры
        cost: c.cost / 100,
        price: c.price / 100
      })) || []
    }));

    res.json({
      success: true,
      count: normalizedTransactions.length,
      transactions: normalizedTransactions
    });

  } catch (error) {
    console.error('[TradeCorp Proxy Error]', error.message);

    if (error.response) {
      res.status(error.response.status).json({
        error: 'TradeCorp API Error',
        message: error.response.data?.error?.message || error.message
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
});

// Получение итогов по транзакциям (агрегация)
router.post('/transactions/summary', async (req, res) => {
  try {
    const { dateFrom, dateTo, stationIds } = req.body;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'dateFrom and dateTo are required'
      });
    }

    const client = await getTradecorpClient();

    // Форматируем даты с временем
    const dateFromFormatted = `${dateFrom} 00:00:00`;
    const dateToFormatted = `${dateTo} 23:59:59`;

    const filter = {
      operation: [{ equal: [603, 614, 504, 505, 508, 511] }],
      date: [{
        more: [dateFromFormatted],
        less: [dateToFormatted]
      }],
      card: {
        id: [{ unequal: [null] }]
      }
    };

    if (stationIds && stationIds.length > 0) {
      filter.station = {
        number: [{ equal: stationIds }]
      };
    }

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'transactions_get',
      params: {
        emitent: TRADECORP_EMITENT_ID,
        filter: filter,
        calc: 1
      }
    };

    const response = await client.post('/v1', body);

    if (response.data.error) {
      throw new Error(response.data.error.message || 'TradeCorp API Error');
    }

    const transactions = response.data.result || [];

    // Агрегация по станциям
    const summary = {
      totalCount: transactions.length,
      totalCost: 0,
      totalQuantity: 0,
      byStation: {}
    };

    transactions.forEach(tx => {
      const stationNum = tx.station?.number || 'unknown';
      const cost = tx.cost / 100; // копейки → рубли

      summary.totalCost += cost;
      summary.totalQuantity += tx.quantity || 0;

      if (!summary.byStation[stationNum]) {
        summary.byStation[stationNum] = {
          stationNumber: stationNum,
          stationName: tx.station?.name,
          count: 0,
          cost: 0,
          quantity: 0
        };
      }

      summary.byStation[stationNum].count++;
      summary.byStation[stationNum].cost += cost;
      summary.byStation[stationNum].quantity += tx.quantity || 0;
    });

    // Округляем суммы
    summary.totalCost = Math.round(summary.totalCost * 100) / 100;
    Object.values(summary.byStation).forEach(s => {
      s.cost = Math.round(s.cost * 100) / 100;
    });

    const duration = Date.now() - req.startTime;
    console.log(`[TradeCorp Proxy] Summary calculated in ${duration}ms`);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('[TradeCorp Proxy Error]', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Health check для TradeCorp
router.get('/health', async (req, res) => {
  try {
    await getTradecorpClient();
    res.json({
      status: 'ok',
      emitentId: TRADECORP_EMITENT_ID,
      tokenValid: !!processingToken && Date.now() < tokenExpiry
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
