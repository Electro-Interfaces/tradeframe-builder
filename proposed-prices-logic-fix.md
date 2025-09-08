# 🔧 Предложение по исправлению логики фильтрации топлива на странице цен

## 🎯 Проблема
В текущей реализации `Prices.tsx` (строки 268-292) виды топлива для установки цен берутся из всей номенклатуры сети, а не из фактических резервуаров торговой точки.

## ❌ Текущая логика:
```javascript
// Строки 268-292 в Prices.tsx
useEffect(() => {
  const loadFuelNomenclature = async () => {
    try {
      const filters = { 
        status: 'active' as const,
        ...(selectedTradingPoint?.network_id && { networkId: selectedTradingPoint.network_id })
      };
      const data = await nomenclatureService.getNomenclature(filters);
      // ... показывает ВСЕ виды топлива сети
    }
  };
}, [selectedTradingPoint?.network_id]);
```

## ✅ Правильная логика:
```javascript
// Предлагаемое исправление
useEffect(() => {
  const loadFuelNomenclatureFromTanks = async () => {
    if (!selectedTradingPoint?.id) {
      setFuelNomenclature([]);
      return;
    }

    try {
      // 1. Сначала получаем резервуары торговой точки
      const tanks = await tanksService.getTanks({ 
        tradingPointId: selectedTradingPoint.id 
      });
      
      // 2. Извлекаем уникальные виды топлива из резервуаров
      const tankFuelTypes = [...new Set(
        tanks
          .map(tank => tank.fuelType)
          .filter(Boolean)
      )];
      
      if (tankFuelTypes.length === 0) {
        console.warn('No fuel types found in tanks for trading point:', selectedTradingPoint.id);
        setFuelNomenclature([]);
        return;
      }
      
      // 3. Получаем номенклатуру только для видов топлива из резервуаров
      const allNomenclature = await nomenclatureService.getNomenclature({ 
        status: 'active' as const,
        ...(selectedTradingPoint.network_id && { networkId: selectedTradingPoint.network_id })
      });
      
      // 4. Фильтруем номенклатуру по видам топлива из резервуаров
      const filteredNomenclature = allNomenclature.filter(fuel => 
        tankFuelTypes.includes(fuel.name)
      );
      
      // 5. Удаляем дубликаты
      const uniqueFuelTypes = filteredNomenclature.reduce((acc, fuel) => {
        if (!acc.some(item => item.name === fuel.name)) {
          acc.push(fuel);
        }
        return acc;
      }, [] as FuelNomenclature[]);
      
      setFuelNomenclature(uniqueFuelTypes);
      
      console.log('🛢️ Tank fuel types:', tankFuelTypes);
      console.log('🏷️ Available nomenclature for prices:', uniqueFuelTypes);
      
    } catch (error) {
      console.error('Failed to load fuel nomenclature from tanks:', error);
      setFuelNomenclature([]);
    }
  };
  
  loadFuelNomenclatureFromTanks();
}, [selectedTradingPoint?.id, selectedTradingPoint?.network_id]); // Зависимость от ID торговой точки, а не только network_id
```

## 📋 Необходимые изменения:

### 1. Импорт tanksService
```javascript
// Добавить в импорты
import { tanksService } from '@/services/tanksServiceSupabase';
```

### 2. Обновить зависимости useEffect
```javascript
// Изменить зависимость с:
}, [selectedTradingPoint?.network_id]);

// На:
}, [selectedTradingPoint?.id, selectedTradingPoint?.network_id]);
```

### 3. Добавить индикаторы состояния
```javascript
// Добавить состояния для отслеживания загрузки резервуаров
const [isLoadingTanks, setIsLoadingTanks] = useState(false);
const [tanksError, setTanksError] = useState<string | null>(null);
```

### 4. Показать пользователю информацию о фильтрации
```jsx
{/* Показать количество доступных видов топлива */}
{fuelNomenclature.length > 0 && (
  <div className="text-sm text-muted-foreground mb-4">
    💡 Доступно видов топлива для установки цен: {fuelNomenclature.length} 
    (на основе резервуаров данной торговой точки)
  </div>
)}

{fuelNomenclature.length === 0 && selectedTradingPoint && (
  <div className="text-sm text-yellow-600 mb-4">
    ⚠️ Нет доступных видов топлива для установки цен. 
    Проверьте резервуары торговой точки.
  </div>
)}
```

## 🎯 Преимущества исправления:

1. **✅ Точность:** Показываются только виды топлива, которые фактически есть в резервуарах
2. **✅ Логичность:** Нельзя установить цену на топливо, которого нет на АЗС  
3. **✅ Гибкость:** Разные торговые точки могут торговать разными видами топлива
4. **✅ Безопасность:** Исключается установка цен на несуществующие виды топлива

## 🧪 Тестирование:

1. Выберите торговую точку с резервуарами
2. Убедитесь, что показываются только виды топлива из резервуаров
3. Попробуйте торговую точку без резервуаров - должно показать предупреждение
4. Проверьте, что цены устанавливаются корректно

## 📝 Альтернативный подход:

Если нужно показать ВСЕ виды топлива сети, но выделить те, которые есть в резервуарах:

```javascript
// Показать все виды топлива, но отметить доступные
const enrichedNomenclature = allNomenclature.map(fuel => ({
  ...fuel,
  isAvailableInTanks: tankFuelTypes.includes(fuel.name),
  isRecommended: tankFuelTypes.includes(fuel.name)
}));
```

## 🚨 Важное замечание:

Это изменение влияет на пользовательский опыт - после применения пользователи увидят меньше видов топлива для установки цен, что может потребовать пояснения или переходного периода.