// Отладочный скрипт для проверки данных в localStorage
// Запустите в консоли браузера: copy(JSON.stringify(checkNetworkData(), null, 2))

function checkNetworkData() {
  console.log('🔍 Проверяем данные сетей и торговых точек...');
  
  // Загружаем данные из localStorage
  const networksKey = 'tradeframe_networks';
  const tradingPointsKey = 'tradeframe_tradingPoints';
  
  let networks = [];
  let tradingPoints = [];
  
  try {
    const networksData = localStorage.getItem(networksKey);
    const pointsData = localStorage.getItem(tradingPointsKey);
    
    if (networksData) {
      networks = JSON.parse(networksData).data || [];
    }
    
    if (pointsData) {
      tradingPoints = JSON.parse(pointsData).data || [];
    }
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  }
  
  console.log(`📊 Найдено сетей: ${networks.length}, точек: ${tradingPoints.length}`);
  
  const result = {
    summary: {
      networksCount: networks.length,
      tradingPointsCount: tradingPoints.length,
      timestamp: new Date().toISOString()
    },
    networks: networks.map(network => ({
      id: network.id,
      name: network.name,
      type: network.type,
      pointsCount: network.pointsCount,
      actualPointsCount: tradingPoints.filter(p => p.networkId === network.id).length,
      created_at: network.created_at,
      updated_at: network.updated_at
    })),
    tradingPoints: tradingPoints.map(point => ({
      id: point.id,
      networkId: point.networkId,
      name: point.name,
      networkName: networks.find(n => n.id === point.networkId)?.name || 'Неизвестная сеть',
      createdAt: point.createdAt,
      updatedAt: point.updatedAt
    })),
    validation: {
      errors: [],
      warnings: []
    }
  };
  
  // Проверяем корректность данных
  networks.forEach(network => {
    const actualCount = tradingPoints.filter(p => p.networkId === network.id).length;
    if (network.pointsCount !== actualCount) {
      result.validation.errors.push({
        type: 'COUNT_MISMATCH',
        networkId: network.id,
        networkName: network.name,
        expected: network.pointsCount,
        actual: actualCount
      });
    }
  });
  
  // Проверяем orphan точки
  tradingPoints.forEach(point => {
    const network = networks.find(n => n.id === point.networkId);
    if (!network) {
      result.validation.errors.push({
        type: 'ORPHAN_POINT',
        pointId: point.id,
        pointName: point.name,
        networkId: point.networkId
      });
    }
  });
  
  console.log('📋 Результат проверки:', result);
  
  if (result.validation.errors.length === 0) {
    console.log('✅ Все данные корректны!');
  } else {
    console.log('❌ Найдены ошибки:', result.validation.errors);
  }
  
  return result;
}

// Автоматически запускаем проверку
if (typeof window !== 'undefined') {
  window.checkNetworkData = checkNetworkData;
  console.log('🚀 Функция checkNetworkData() доступна в консоли');
}