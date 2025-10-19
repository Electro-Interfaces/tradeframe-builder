/**
 * Проверка времени последнего обновления данных от станции
 * Станция отправляет данные не реже раз в 10 минут
 */

require('dotenv').config({ path: './server/.env' });
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/sts/v2/info';
const STATION_NUMBER = '4';
const SYSTEM = '15';

async function checkStationUpdateTime() {
  try {
    console.log('🔍 Проверка времени последнего обновления данных станции...\n');

    const response = await axios.get(API_URL, {
      params: {
        station_number: STATION_NUMBER,
        system: SYSTEM
      }
    });

    const data = response.data;

    if (!data || data.length === 0) {
      console.log('❌ Данные о станции не получены');
      return;
    }

    const stationInfo = data[0];
    const pos = stationInfo.pos[0]; // Первый POS терминал

    console.log(`📍 Станция: ${stationInfo.station} (Система: ${stationInfo.system})`);
    console.log(`📌 POS терминал: ${pos.number}`);
    console.log(`📅 Смена: #${pos.shift.number} (${pos.shift.state})`);
    console.log(`   Открыта: ${new Date(pos.shift.dt_open).toLocaleString('ru-RU')}`);

    console.log('\n⏰ Время последнего обновления данных:');
    const lastUpdate = new Date(pos.dt_info);
    const now = new Date();
    const diffMs = now - lastUpdate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);

    console.log(`   📡 dt_info: ${lastUpdate.toLocaleString('ru-RU')}`);
    console.log(`   🕐 Текущее время: ${now.toLocaleString('ru-RU')}`);
    console.log(`   ⏱️  Прошло времени: ${diffMinutes} мин ${diffSeconds} сек`);

    if (diffMinutes > 10) {
      console.log('\n⚠️  ВНИМАНИЕ: Данные обновлялись более 10 минут назад!');
      console.log('   Возможны проблемы с подключением станции к облаку.');
    } else if (diffMinutes > 5) {
      console.log('\n⚠️  Данные обновлялись более 5 минут назад.');
    } else {
      console.log('\n✅ Данные актуальные (обновлялись менее 5 минут назад)');
    }

    console.log('\n🔄 Uptime POS терминала:');
    const uptime = new Date(pos.uptime);
    console.log(`   Запущен: ${uptime.toLocaleString('ru-RU')}`);
    const uptimeHours = Math.floor((now - uptime) / 3600000);
    const uptimeDays = Math.floor(uptimeHours / 24);
    console.log(`   Работает: ${uptimeDays} дней ${uptimeHours % 24} часов`);

    console.log('\n🖥️  Устройства:');
    pos.devices.forEach(device => {
      const statusParam = device.params.find(p => p.name === 'Состояние');
      const status = statusParam ? statusParam.value : 'N/A';
      const statusIcon = status === 'OK' ? '✅' : '❌';

      console.log(`   ${statusIcon} ${device.name}: ${status}`);

      // Дополнительная информация для купюроприемника
      if (device.name === 'Купюроприемник') {
        const countParam = device.params.find(p => p.name === 'Количество купюр');
        const amountParam = device.params.find(p => p.name === 'Сумма купюр');
        if (countParam && amountParam) {
          console.log(`      💵 Купюр: ${countParam.value} шт, Сумма: ${Number(amountParam.value).toLocaleString()} ₽`);
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка при получении данных:', error.message);
    if (error.response) {
      console.error('   Статус:', error.response.status);
      console.error('   Данные:', error.response.data);
    }
  }
}

checkStationUpdateTime()
  .then(() => {
    console.log('\n✅ Проверка завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
