// Скрипт для отладки структуры данных торгового API
import { tradingNetworkAPI } from './src/services/tradingNetworkAPI.js';

async function debugApiStructure() {
  console.log('🔍 Начинаем отладку структуры данных торгового API...');
  
  try {
    // Тест 1: Получение транзакций для станции 4
    console.log('\n🏪 Тест 1: Получение транзакций для станции 4...');
    const transactions = await tradingNetworkAPI.getTransactions(15, 4, '2025-09-02', '2025-09-06');
    
    console.log(`📊 Получено транзакций: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('\n🔍 ПЕРВАЯ ТРАНЗАКЦИЯ (полная структура):');
      console.log(JSON.stringify(transactions[0], null, 2));
      
      console.log('\n🔍 КЛЮЧИ первой транзакции:');
      console.log(Object.keys(transactions[0]));
      
      console.log('\n🔍 ТИПЫ ДАННЫХ полей:');
      Object.entries(transactions[0]).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} = ${value}`);
      });
      
      // Проверим несколько транзакций на консистентность
      if (transactions.length > 1) {
        console.log('\n🔍 СРАВНЕНИЕ КЛЮЧЕЙ (первые 3 транзакции):');
        for (let i = 0; i < Math.min(3, transactions.length); i++) {
          console.log(`Транзакция ${i}: ${Object.keys(transactions[i]).join(', ')}`);
        }
      }
    } else {
      console.log('⚠️ Нет транзакций для анализа');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при отладке API:', error);
  }
}

// Запускаем отладку
debugApiStructure();