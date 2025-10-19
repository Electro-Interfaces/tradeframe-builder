/**
 * Детальный тест проверки порогов купюроприемника
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const STS_API_URL = process.env.STS_API_URL;
const STS_API_USERNAME = process.env.STS_API_USERNAME;
const STS_API_PASSWORD = process.env.STS_API_PASSWORD;

async function getStsToken() {
  const response = await axios.post(`${STS_API_URL}/v1/login`, {
    username: STS_API_USERNAME,
    password: STS_API_PASSWORD
  });
  const rawToken = response.data;
  return typeof rawToken === 'string' ? rawToken.replace(/"/g, '') : rawToken;
}

async function getTerminalInfo(networkId, stationNumber, token) {
  const response = await axios.get(`${STS_API_URL}/v2/info`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    params: {
      system: networkId,
      station: stationNumber
    }
  });
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

async function testDetailedCheck() {
  console.log('🔍 Детальная проверка порогов купюроприемника\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Получаем тенанты
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .eq('type', 'network')
    .eq('is_active', true);

  console.log(`📋 Найдено тенантов: ${tenants.length}\n`);

  // 2. Получаем STS токен
  const token = await getStsToken();
  console.log('✅ STS токен получен\n');

  // 3. Проверяем каждую станцию
  for (const tenant of tenants) {
    const networkId = tenant.settings?.external_id;
    const stations = tenant.settings?.stations || [];

    console.log(`🏢 Тенант: ${tenant.name}`);
    console.log(`   Network ID: ${networkId}`);
    console.log(`   Станций: ${stations.length}\n`);

    for (const stationConfig of stations) {
      console.log(`   📍 Станция: ${stationConfig.name} (код: ${stationConfig.code})`);

      // Получаем данные с терминала
      const terminalData = await getTerminalInfo(networkId, stationConfig.code, token);

      if (!terminalData) {
        console.log(`      ❌ Нет данных с терминала\n`);
        continue;
      }

      let billCount = 0;
      let billAmount = 0;

      if (terminalData.pos && terminalData.pos[0]) {
        const devices = terminalData.pos[0].devices || [];
        const billAcceptor = devices.find(d => d.name === 'Купюроприемник');

        if (billAcceptor && billAcceptor.params) {
          const billCountParam = billAcceptor.params.find(p => p.name === 'Количество купюр');
          const billAmountParam = billAcceptor.params.find(p => p.name === 'Сумма купюр');

          billCount = billCountParam ? parseInt(billCountParam.value) : 0;
          billAmount = billAmountParam ? parseFloat(billAmountParam.value) : 0;

          console.log(`      💵 Купюр: ${billCount}`);
          console.log(`      💰 Сумма: ${billAmount} ₽`);
        } else {
          console.log(`      ⚠️ Купюроприемник не найден в устройствах`);
        }
      } else {
        console.log(`      ⚠️ Нет данных POS`);
      }

      // Пороги
      const thresholds = stationConfig.billAcceptorThresholds || {};
      console.log(`      📊 Пороги:`);
      console.log(`         Warning: ${thresholds.billCountWarning}`);
      console.log(`         Critical: ${thresholds.billCountCritical}`);

      // Проверка превышения
      if (billCount >= thresholds.billCountCritical) {
        console.log(`      🔴 КРИТИЧЕСКИЙ ПОРОГ ПРЕВЫШЕН!`);
      } else if (billCount >= thresholds.billCountWarning) {
        console.log(`      🟡 Предупреждающий порог превышен`);
      } else {
        console.log(`      ✅ В норме`);
      }

      console.log('');
    }
  }

  // 4. Проверяем правила
  const { data: rules } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('is_active', true)
    .eq('type', 'bill_acceptor_threshold');

  console.log(`\n📋 Активных правил: ${rules.length}`);
  for (const rule of rules) {
    console.log(`   - ${rule.name}: warningLevel=${rule.rule_config.warningLevel}, channels=${rule.notification_config.channels.join(',')}`);
  }
}

testDetailedCheck().catch(console.error);
