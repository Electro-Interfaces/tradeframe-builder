# Предложения по замене графика "Активность операций"

## Дата: 2025-10-09

---

## 📊 Текущее состояние

### График "Суточная активность по часам" (HourlyActivityChart)

**Что показывает:**
- Количество операций по часам за выбранный период
- Выручка по часам

**Проблемы:**
1. **Низкая аналитическая ценность** - показывает только распределение операций по времени суток
2. **Не дает actionable insights** - информация не помогает принимать бизнес-решения
3. **Дублирование** - похожую информацию показывает график "Дневные продажи"
4. **Статичность** - не учитывает специфику АЗС бизнеса

---

## 💡 Топ-5 альтернативных графиков

### 1. 🎯 MARGIN ANALYSIS CHART - Анализ маржинальности

**Приоритет: ⭐⭐⭐⭐⭐ ВЫСОЧАЙШИЙ**

#### Что показывает:
- Маржа (прибыль) по видам топлива в рублях и процентах
- Сравнение текущей маржи с маржой за предыдущий период
- Динамика изменения маржинальности

#### Почему это важно для бизнеса:
✅ **Прямое влияние на прибыль** - владелец видит, какое топливо приносит больше денег
✅ **Оптимизация ассортимента** - можно принимать решения о закупках
✅ **Ценовая политика** - помогает корректировать цены для максимизации прибыли
✅ **Конкурентный анализ** - видно, где можно выиграть у конкурентов

#### Доступные данные:
```typescript
// Из транзакций
transaction.price        // Цена продажи
transaction.fuelType    // Вид топлива
transaction.volume      // Объем
transaction.total       // Итоговая сумма

// Нужно добавить (из справочника цен)
costPrice              // Закупочная цена
margin = price - costPrice
marginPercent = (margin / price) * 100
```

#### Пример визуализации:
```
АИ-95: ████████████████░░░░ 80%  (+5% к прошлому периоду)
       Марж: 3.2₽/л | Прибыль: 6,850₽

АИ-92: ███████████░░░░░░░░░ 55%  (-2% к прошлому периоду)
       Марж: 2.1₽/л | Прибыль: 2,460₽

ДТ:    ██████████████████░░ 90%  (+12% к прошлому периоду)
       Марж: 4.5₽/л | Прибыль: 4,200₽
```

#### Технический план реализации:
1. Добавить справочник закупочных цен в базу данных (новая таблица `fuel_cost_prices`)
2. Создать компонент `MarginAnalysisChart.tsx`
3. Вычислять маржу для каждой транзакции: `margin = selling_price - cost_price`
4. Агрегировать по видам топлива
5. Визуализация: комбинированный график (Bar + Line)

---

### 2. 📊 FUEL TYPE PERFORMANCE CHART - Производительность по видам топлива

**Приоритет: ⭐⭐⭐⭐ ВЫСОКИЙ**

#### Что показывает:
- Объем продаж по видам топлива (литры)
- Выручка по видам топлива (рубли)
- Средний чек по видам топлива
- Доля каждого вида в общих продажах (%)

#### Почему это полезнее:
✅ **Сравнение эффективности** - видно, какое топливо продается лучше
✅ **Планирование закупок** - понятно, чего заказывать больше/меньше
✅ **Анализ трендов** - видно сдвиги потребительских предпочтений
✅ **Оптимизация запасов** - помогает избежать дефицита/избытка

#### Доступные данные:
```typescript
// Агрегация из transactions
fuelTypeStats = transactions.reduce((acc, tx) => {
  const fuel = tx.fuelType;
  acc[fuel] = {
    volume: sum(tx.volume),           // Литры
    revenue: sum(tx.total),           // Рубли
    operations: count(tx),            // Количество операций
    avgCheck: revenue / operations,   // Средний чек
    share: (revenue / totalRevenue) * 100  // Доля в процентах
  };
  return acc;
}, {});
```

#### Пример визуализации:

```
┌─────────────────────────────────────────────┐
│  АИ-95    ████████████ 45% │ 2074л │ 128,953₽│
│  АИ-92    ██████ 28%        │ 1172л │ 66,338₽ │
│  ДТ       ████ 27%          │ 933л  │ 63,663₽ │
└─────────────────────────────────────────────┘

Insights:
• АИ-95 - лидер продаж (45% выручки)
• Средний чек на ДТ выше на 12%
• Рост продаж АИ-92: +8% к прошлой неделе
```

#### Технический план реализации:
1. Использовать существующие `fuelTypeStats` из NetworkOverview
2. Создать компонент `FuelPerformanceChart.tsx`
3. Визуализация: Grouped Bar Chart или Stacked Area Chart
4. Добавить тренды (сравнение с предыдущим периодом)

---

### 3. 💰 PAYMENT METHOD DISTRIBUTION - Распределение способов оплаты

**Приоритет: ⭐⭐⭐⭐ ВЫСОКИЙ**

#### Что показывает:
- Распределение способов оплаты (наличные, карты, онлайн)
- Динамика роста/падения каждого способа
- Средний чек по способу оплаты

#### Почему это важно:
✅ **Финансовое планирование** - понимание cash flow
✅ **Комиссии** - анализ затрат на эквайринг
✅ **Тренды digitalization** - рост безналичных платежей
✅ **Оптимизация оборудования** - нужны ли новые терминалы

#### Доступные данные:
```typescript
// Из транзакций
transaction.paymentMethod  // 'cash' | 'bank_card' | 'online_order'

// Агрегация
paymentStats = transactions.reduce((acc, tx) => {
  const method = tx.paymentMethod;
  acc[method] = {
    count: count(tx),
    revenue: sum(tx.total),
    avgCheck: revenue / count,
    trend: compareWithPreviousPeriod()
  };
  return acc;
}, {});
```

#### Пример визуализации:

```
         Наличные          Карты          Онлайн
         ████  22%        ████████ 75%   █ 3%

         919 л            3,114 л         141 л
         57,763₽          192,506₽        8,362₽

Trends:  ↓ -5%            ↑ +8%          ↑ +15%
         за месяц         за месяц       за месяц

Insights:
• Карты доминируют (75% операций)
• Онлайн-платежи растут быстрее всего (+15%)
• Комиссия эквайринга: ~3,850₽ за период
```

#### Технический план реализации:
1. Использовать `paymentTypeStats` из NetworkOverview
2. Создать `PaymentDistributionChart.tsx`
3. Визуализация: Donut Chart + Trend lines
4. Добавить калькулятор комиссий эквайринга

---

### 4. 🏆 TOP PERFORMING HOURS - Пиковые часы продаж

**Приоритет: ⭐⭐⭐ СРЕДНИЙ**

#### Что показывает:
- Топ-3 самых прибыльных часа дня
- Сравнение выручки по часам с средним значением
- Рекомендации по оптимизации работы

#### Почему это улучшение над текущим графиком:
✅ **Фокус на важном** - только пиковые часы, а не все 24
✅ **Actionable insights** - конкретные рекомендации
✅ **Оптимизация персонала** - знаем, когда нужно больше кассиров
✅ **Маркетинг** - когда запускать акции

#### Доступные данные:
```typescript
// Агрегация по часам
hourlyStats = transactions.map(tx => {
  const hour = new Date(tx.startTime).getHours();
  return {
    hour,
    operations: count,
    revenue: sum(tx.total),
    avgCheck: revenue / operations,
    isAboveAverage: revenue > avgRevenue
  };
});

topHours = hourlyStats
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 3);
```

#### Пример визуализации:

```
┌─────────────────────────────────────────┐
│ 🥇 08:00-09:00  ████████████████ 100%  │
│    Выручка: 28,500₽ | Операции: 45    │
│    +85% к среднему | Средний чек: 633₽│
│                                         │
│ 🥈 17:00-18:00  ████████████░░░░ 75%   │
│    Выручка: 21,300₽ | Операции: 38    │
│    +39% к среднему | Средний чек: 560₽│
│                                         │
│ 🥉 12:00-13:00  ██████████░░░░░░ 62%   │
│    Выручка: 17,800₽ | Операции: 32    │
│    +16% к среднему | Средний чек: 556₽│
└─────────────────────────────────────────┘

💡 Рекомендации:
• Пик утром (8:00-9:00) - добавить кассира
• Обеденный час стабилен - норма персонала
• Вечерний пик (17:00-18:00) - акции для роста
```

#### Технический план реализации:
1. Модифицировать `dailyActivityData` из NetworkOverview
2. Создать `TopPerformingHoursChart.tsx`
3. Визуализация: Horizontal Bar Chart + Cards
4. Добавить AI-генерируемые рекомендации

---

### 5. 🔄 COMPARATIVE PERIOD CHART - Сравнение периодов

**Приоритет: ⭐⭐⭐ СРЕДНИЙ**

#### Что показывает:
- Сравнение текущего периода с предыдущим
- Визуальное представление роста/падения метрик
- Процент изменения по ключевым показателям

#### Почему это полезно:
✅ **Динамика бизнеса** - растет или падает
✅ **Сезонность** - видны сезонные паттерны
✅ **Эффективность действий** - результаты акций/изменений
✅ **Прогнозирование** - тренды для планирования

#### Доступные данные:
```typescript
// Текущий период
currentPeriod = {
  dateFrom: '2025-10-08',
  dateTo: '2025-10-09',
  revenue: 258,954,
  volume: 4,248,
  operations: 161,
  avgCheck: 1,608
};

// Предыдущий период (те же дни, но неделю назад)
previousPeriod = {
  dateFrom: '2025-10-01',
  dateTo: '2025-10-02',
  revenue: 240,500,
  volume: 4,100,
  operations: 155,
  avgCheck: 1,551
};

// Вычисляем изменения
changes = {
  revenueChange: +7.7%,
  volumeChange: +3.6%,
  operationsChange: +3.9%,
  avgCheckChange: +3.7%
};
```

#### Пример визуализации:

```
┌──────────────────────────────────────────────┐
│  Выручка      Текущий │████████████ 258,954₽│
│               Пред.   │███████████░ 240,500₽│
│               Рост: +7.7% ↑                  │
│                                              │
│  Объем        Текущий │████████████ 4,248 л │
│               Пред.   │███████████░ 4,100 л │
│               Рост: +3.6% ↑                  │
│                                              │
│  Операции     Текущий │████████████ 161 шт  │
│               Пред.   │███████████░ 155 шт  │
│               Рост: +3.9% ↑                  │
│                                              │
│  Средний чек  Текущий │████████████ 1,608₽  │
│               Пред.   │███████████░ 1,551₽  │
│               Рост: +3.7% ↑                  │
└──────────────────────────────────────────────┘

💡 Вывод: Все показатели растут - бизнес здоров!
```

#### Технический план реализации:
1. Добавить логику выбора сравниваемого периода
2. Загружать данные для обоих периодов
3. Создать `ComparativePeriodChart.tsx`
4. Визуализация: Bullet Chart или Paired Bar Chart
5. Добавить цветовую индикацию (зеленый рост/красный падение)

---

## 🎯 Итоговая рекомендация

### Лучший вариант: **Margin Analysis Chart** 🏆

**Обоснование:**
1. **Максимальная бизнес-ценность** - прямо влияет на прибыль
2. **Уникальность** - нет дублирования с другими графиками
3. **Actionable** - дает конкретные инсайты для решений
4. **Масштабируемость** - можно добавить детализацию по станциям

### Альтернативный вариант: **Fuel Type Performance Chart**

Если нет возможности быстро добавить закупочные цены, то второй лучший вариант.

---

## 📋 План внедрения (Margin Analysis Chart)

### Этап 1: База данных (1-2 часа)
```sql
-- Создать таблицу закупочных цен
CREATE TABLE fuel_cost_prices (
  id UUID PRIMARY KEY,
  fuel_type VARCHAR(50) NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP,
  network_id UUID REFERENCES networks(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Добавить исторические данные
INSERT INTO fuel_cost_prices (fuel_type, cost_price, effective_from, network_id)
VALUES
  ('АИ-92', 48.50, '2025-09-01', '<network_id>'),
  ('АИ-95', 52.30, '2025-09-01', '<network_id>'),
  ('АИ-98', 58.00, '2025-09-01', '<network_id>'),
  ('ДТ', 54.20, '2025-09-01', '<network_id>');
```

### Этап 2: Backend сервис (2-3 часа)
```typescript
// src/services/marginAnalysisService.ts

interface MarginData {
  fuelType: string;
  sellingPrice: number;
  costPrice: number;
  margin: number;
  marginPercent: number;
  volume: number;
  totalProfit: number;
  operations: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number; // Процент изменения к предыдущему периоду
}

export async function getMarginAnalysis(
  networkId: string,
  dateFrom: string,
  dateTo: string
): Promise<MarginData[]> {
  // 1. Получить транзакции за период
  const transactions = await stsApiService.getTransactions(dateFrom, dateTo);

  // 2. Получить закупочные цены для каждого вида топлива
  const costPrices = await getCostPrices(networkId, dateFrom, dateTo);

  // 3. Рассчитать маржу для каждого вида топлива
  const marginByFuel = transactions.reduce((acc, tx) => {
    const costPrice = costPrices[tx.fuelType];
    const margin = tx.price - costPrice;
    const marginPercent = (margin / tx.price) * 100;

    if (!acc[tx.fuelType]) {
      acc[tx.fuelType] = {
        fuelType: tx.fuelType,
        sellingPrice: tx.price,
        costPrice,
        margin,
        marginPercent,
        volume: 0,
        totalProfit: 0,
        operations: 0
      };
    }

    acc[tx.fuelType].volume += tx.volume;
    acc[tx.fuelType].totalProfit += margin * tx.volume;
    acc[tx.fuelType].operations += 1;

    return acc;
  }, {});

  // 4. Получить данные за предыдущий период для тренда
  const previousPeriodData = await getMarginAnalysis(
    networkId,
    getPreviousPeriodStart(dateFrom),
    getPreviousPeriodEnd(dateTo)
  );

  // 5. Рассчитать тренды
  return Object.values(marginByFuel).map(fuel => ({
    ...fuel,
    trend: calculateTrend(fuel, previousPeriodData),
    trendValue: calculateTrendValue(fuel, previousPeriodData)
  }));
}
```

### Этап 3: Frontend компонент (3-4 часа)
```typescript
// src/components/charts/MarginAnalysisChart.tsx

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

export function MarginAnalysisChart({ data }: { data: MarginData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Анализ маржинальности по видам топлива</CardTitle>
      </CardHeader>
      <CardContent>
        {data.map((fuel) => (
          <div key={fuel.fuelType} className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{fuel.fuelType}</span>
              <div className="flex items-center gap-2">
                <Badge variant={fuel.trend === 'up' ? 'success' : 'destructive'}>
                  {fuel.trend === 'up' ? '↑' : '↓'} {fuel.trendValue}%
                </Badge>
                <span>{fuel.marginPercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-6 relative">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-6 rounded-full flex items-center justify-end pr-2"
                style={{ width: `${fuel.marginPercent}%` }}
              >
                <span className="text-white text-xs font-medium">
                  {fuel.margin.toFixed(2)}₽/л
                </span>
              </div>
            </div>

            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>Прибыль: {fuel.totalProfit.toLocaleString('ru-RU')}₽</span>
              <span>Объем: {fuel.volume.toFixed(0)} л</span>
            </div>
          </div>
        ))}

        {/* Итоговая статистика */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Общая прибыль</p>
              <p className="text-2xl font-bold text-green-500">
                {calculateTotalProfit(data).toLocaleString('ru-RU')}₽
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Средняя маржа</p>
              <p className="text-2xl font-bold text-blue-500">
                {calculateAvgMargin(data).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Этап 4: Интеграция в NetworkOverview (1 час)
```typescript
// src/pages/NetworkOverview.tsx

// Заменить HourlyActivityChart на MarginAnalysisChart
import { MarginAnalysisChart } from "@/components/charts/MarginAnalysisChart";

// В компоненте
const [marginData, setMarginData] = useState<MarginData[]>([]);

// Загрузка данных
useEffect(() => {
  if (transactions.length > 0) {
    marginAnalysisService.getMarginAnalysis(
      selectedNetwork.id,
      dateFrom,
      dateTo
    ).then(setMarginData);
  }
}, [transactions, dateFrom, dateTo]);

// Рендеринг
<div className="w-full">
  <MarginAnalysisChart data={marginData} />
</div>
```

---

## 🚀 Альтернативный быстрый план (если нет времени на БД)

### Вариант: Использовать **Fuel Type Performance Chart**

**Преимущества:**
- Не требует изменений в БД
- Использует уже существующие данные
- Можно реализовать за 2-3 часа

**План:**
1. Создать `FuelPerformanceChart.tsx` (1 час)
2. Использовать `fuelTypeStats` из NetworkOverview (уже готово)
3. Добавить сравнение с предыдущим периодом (1 час)
4. Интегрировать вместо HourlyActivityChart (30 минут)

---

## 📊 Сравнительная таблица всех вариантов

| График | Бизнес-ценность | Сложность реализации | Требует БД | Время внедрения | Рекомендация |
|--------|-----------------|---------------------|------------|-----------------|--------------|
| **Margin Analysis** | ⭐⭐⭐⭐⭐ | 🔧🔧🔧 Средняя | ✅ Да | 6-9 часов | 🏆 Лучший |
| **Fuel Performance** | ⭐⭐⭐⭐ | 🔧 Легкая | ❌ Нет | 2-3 часа | ⚡ Быстрый |
| **Payment Distribution** | ⭐⭐⭐⭐ | 🔧 Легкая | ❌ Нет | 2-3 часа | ✅ Хороший |
| **Top Performing Hours** | ⭐⭐⭐ | 🔧🔧 Средняя | ❌ Нет | 3-4 часа | ✔️ Норма |
| **Comparative Period** | ⭐⭐⭐ | 🔧🔧🔧 Средняя | ❌ Нет | 4-5 часов | ✔️ Норма |

---

## 💬 Финальная рекомендация

**Для максимальной бизнес-ценности:**
→ Реализовать **Margin Analysis Chart** + добавить таблицу закупочных цен в БД

**Для быстрого результата (2-3 часа):**
→ Реализовать **Fuel Performance Chart** без изменений БД

**Компромиссный вариант:**
→ Сначала **Fuel Performance**, затем постепенно добавить **Margin Analysis**

---

## 👤 Автор
Claude Code Assistant

## 📅 Дата создания
2025-10-09
