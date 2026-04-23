import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayData {
  date: string;
  value: number;
  transactions: number;
  revenue: number;
  hour?: number;
  dayOfWeek?: number;
  dayName?: string;
  displayTime?: string;
}

interface ActivityHeatmapProps {
  title?: string;
  data?: DayData[];
  className?: string;
}

// Генерируем mock данные для последних 12 недель (84 дня)
const generateMockData = (): DayData[] => {
  const data: DayData[] = [];
  const today = new Date();
  
  for (let i = 83; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Генерируем случайные данные с весовыми коэффициентами для разных дней недели
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    let baseValue = 0;
    let transactions = 0;
    let revenue = 0;
    
    if (isWeekday) {
      // Рабочие дни - более высокая активность
      baseValue = Math.random() * 0.8 + 0.2; // 0.2 - 1.0
      transactions = Math.floor(baseValue * 150) + 20; // 20-170 транзакций
      revenue = Math.floor(transactions * (2000 + Math.random() * 3000)); // 2k-5k за транзакцию
    } else {
      // Выходные - меньше активности
      baseValue = Math.random() * 0.5 + 0.1; // 0.1 - 0.6
      transactions = Math.floor(baseValue * 80) + 5; // 5-85 транзакций
      revenue = Math.floor(transactions * (1500 + Math.random() * 2000)); // 1.5k-3.5k за транзакцию
    }
    
    // Добавляем некоторую случайность для праздников/особых дней
    if (Math.random() < 0.05) {
      baseValue *= 0.3; // Очень низкая активность (праздники)
      transactions = Math.floor(transactions * 0.3);
      revenue = Math.floor(revenue * 0.3);
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: baseValue,
      transactions,
      revenue
    });
  }
  
  return data;
};

const getIntensityColor = (value: number): string => {
  if (value === 0) return "bg-secondary";
  if (value < 0.2) return "bg-emerald-100 dark:bg-emerald-900/40";
  if (value < 0.4) return "bg-emerald-700/60";
  if (value < 0.6) return "bg-emerald-600/70";
  if (value < 0.8) return "bg-emerald-500/80";
  return "bg-emerald-400";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit' 
  });
};

const getMonthLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { 
    month: 'short' 
  });
};

export function ActivityHeatmap({ title = "Активность торговых операций", data, className }: ActivityHeatmapProps) {
  const heatmapData = data || generateMockData();
  
  // Если у нас есть часовые данные (7×24 = 168 записей), создаем почасовую сетку
  if (data && data.length === 168 && data[0].hour !== undefined) {
    // Создаем сетку по дням недели и часам
    const hourlyGrid: DayData[][] = [];
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    // Группируем данные по дням недели (7 дней × 24 часа)
    for (let day = 0; day < 7; day++) {
      const dayData: DayData[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourData = data.find(item => item.dayOfWeek === day && item.hour === hour);
        dayData.push(hourData || {
          date: '',
          hour,
          dayOfWeek: day,
          value: 0,
          transactions: 0,
          revenue: 0,
          displayTime: `${hour.toString().padStart(2, '0')}:00`
        });
      }
      hourlyGrid.push(dayData);
    }

    // Получаем период для заголовка
    const firstDate = data.find(d => d.date)?.date;
    const lastDate = [...data].reverse().find(d => d.date)?.date;
    const periodLabel = firstDate && lastDate ? 
      `${new Date(firstDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${new Date(lastDate).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}` : 
      'Последние 7 дней';

    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🕒</span>
              {title}
            </div>
            <div className="text-sm text-muted-foreground font-normal">
              {periodLabel}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Заголовок часов (0-23) */}
          <div className="flex items-center text-xs text-muted-foreground font-medium">
            <div className="w-12 shrink-0"></div> {/* Пространство для дней недели */}
            <div className="flex-1 flex justify-between">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="text-center flex-1">
                  {hour % 4 === 0 ? hour : ''}
                </div>
              ))}
            </div>
          </div>
          
          {/* Главная сетка тепловой карты 7×24 */}
          <div className="space-y-1">
            {hourlyGrid.map((dayHours, dayIndex) => (
              <div key={dayIndex} className="flex items-center">
                {/* День недели */}
                <div className="w-12 text-xs text-foreground/80 font-medium text-center shrink-0">
                  {dayNames[dayIndex]}
                </div>
                
                {/* Часы для этого дня - растягиваем на всю ширину */}
                <div className="flex-1 flex justify-between gap-px">
                  {dayHours.map((hourData, hourIndex) => (
                    <div
                      key={hourIndex}
                      className={`flex-1 h-4 rounded-sm border border-border/50 group relative cursor-pointer transition-all hover:border-border ${
                        getIntensityColor(hourData.value)
                      }`}
                      title={`${dayNames[dayIndex]} ${hourData.displayTime}: ${hourData.transactions} транзакций, ${hourData.revenue.toLocaleString()} ₽`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background text-foreground text-xs rounded px-2 py-1 whitespace-nowrap border border-border pointer-events-none">
                        <div className="font-medium">{dayNames[dayIndex]} {hourData.displayTime}</div>
                        <div className="text-foreground/80">{hourData.transactions} транзакций</div>
                        <div className="text-green-600 dark:text-green-400">{hourData.revenue.toLocaleString()} ₽</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Легенда */}
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted-foreground">Меньше</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-secondary rounded-sm border border-border"></div>
              <div className="w-3 h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-sm border border-border"></div>
              <div className="w-3 h-3 bg-emerald-700/60 rounded-sm border border-border"></div>
              <div className="w-3 h-3 bg-emerald-600/70 rounded-sm border border-border"></div>
              <div className="w-3 h-3 bg-emerald-500/80 rounded-sm border border-border"></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-sm border border-border"></div>
            </div>
            <span className="text-muted-foreground">Больше</span>
          </div>
          
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {data.reduce((sum, hour) => sum + hour.transactions, 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Всего транзакций</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {(data.reduce((sum, hour) => sum + hour.revenue, 0) / 1000).toFixed(0)}К ₽
              </div>
              <div className="text-xs text-muted-foreground">Общая выручка</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-primary dark:text-primary/70">
                {data.filter(hour => hour.transactions > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">Активных часов</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fallback для обычных данных (месячных/недельных)
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];
  
  heatmapData.forEach((day, index) => {
    const dayOfWeek = new Date(day.date).getDay();
    
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentWeek.push(day);
    
    if (index === heatmapData.length - 1) {
      weeks.push(currentWeek);
    }
  });

  const periodLabel = heatmapData.length > 0 ? 
    `${new Date(heatmapData[0].date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} - ${new Date(heatmapData[heatmapData.length - 1].date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}` : 
    '';

  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📊</span>
            {title}
          </div>
          <div className="text-sm text-muted-foreground font-normal">
            {periodLabel}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Заголовок дней недели */}
        <div className="flex justify-center">
          <div className="text-xs text-muted-foreground font-medium">
            Последние {data?.length || 84} дней
          </div>
        </div>
        
        {/* Главная сетка тепловой карты */}
        <div className="w-full">
          <div className="flex justify-between gap-2 overflow-x-auto min-h-[8rem]">
            {/* Метки дней недели */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground min-w-[24px] shrink-0">
              <div className="h-3"></div> {/* Отступ для заголовков */}
              {dayLabels.map((dayLabel, index) => (
                <div key={index} className="h-3 flex items-center">
                  {index % 2 === 1 ? dayLabel : ''}
                </div>
              ))}
            </div>
            
            {/* Недели - растягиваем на всю доступную ширину */}
            <div className="flex-1 flex justify-between gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1 flex-1 max-w-[18px] min-w-[12px]">
                  {week.map((day, dayIndex) => {
                    return (
                      <div
                        key={dayIndex}
                        className={`w-full aspect-square rounded-sm border border-border group relative cursor-pointer transition-all hover:border-border ${
                          day ? getIntensityColor(day.value) : 'bg-secondary/30'
                        }`}
                        title={day ? 
                          `${formatDate(day.date)}: ${day.transactions} транзакций, ${day.revenue.toLocaleString()} ₽` : 
                          'Нет данных'
                        }
                      >
                        {/* Показываем день месяца для активных дней */}
                        {day && day.transactions > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-foreground font-medium opacity-70">
                            {new Date(day.date).getDate()}
                          </div>
                        )}
                        {/* Tooltip */}
                        {day && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background text-foreground text-xs rounded px-2 py-1 whitespace-nowrap border border-border pointer-events-none">
                            <div className="font-medium">{formatDate(day.date)}</div>
                            <div className="text-foreground/80">{day.transactions} транзакций</div>
                            <div className="text-green-600 dark:text-green-400">{day.revenue.toLocaleString()} ₽</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Легенда */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Меньше</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-secondary rounded-sm border border-border"></div>
            <div className="w-3 h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-sm border border-border"></div>
            <div className="w-3 h-3 bg-emerald-700/60 rounded-sm border border-border"></div>
            <div className="w-3 h-3 bg-emerald-600/70 rounded-sm border border-border"></div>
            <div className="w-3 h-3 bg-emerald-500/80 rounded-sm border border-border"></div>
            <div className="w-3 h-3 bg-emerald-400 rounded-sm border border-border"></div>
          </div>
          <span className="text-muted-foreground">Больше</span>
        </div>
        
        {/* Статистика */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-semibold text-foreground">
              {heatmapData.reduce((sum, day) => sum + day.transactions, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Всего транзакций</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {(heatmapData.reduce((sum, day) => sum + day.revenue, 0) / 1000000).toFixed(1)}М ₽
            </div>
            <div className="text-xs text-muted-foreground">Общая выручка</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary dark:text-primary/70">
              {Math.round(heatmapData.reduce((sum, day) => sum + day.transactions, 0) / heatmapData.length)}
            </div>
            <div className="text-xs text-muted-foreground">Среднее в день</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}