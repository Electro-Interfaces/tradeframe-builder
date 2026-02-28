import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { DollarSign } from "lucide-react";

interface DailySalesChartProps {
  data: any[];
  fuelTypes: string[];
  isMobile: boolean;
}

// Мемоизированный компонент графика для предотвращения лишних перерисовок
export const DailySalesChart = memo(function DailySalesChart({
  data,
  fuelTypes,
  isMobile
}: DailySalesChartProps) {

  if (!data || data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            Реализация по дням
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            <p>Нет данных за выбранный период</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            Реализация по дням ({data.length} дней)
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
        {/* Резервируем фиксированную высоту для предотвращения CLS */}
        <div
          className={`w-full ${isMobile ? 'h-64' : 'h-80'}`}
          style={{ minHeight: isMobile ? '256px' : '320px' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={isMobile ? { top: 10, right: 10, left: 30, bottom: 40 } : { top: 10, right: 30, left: 60, bottom: 20 }}
            >
              <XAxis
                dataKey="displayDate"
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                angle={isMobile ? -90 : -45}
                textAnchor="end"
                height={isMobile ? 40 : 60}
                interval={isMobile ? "preserveStartEnd" : 0}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => isMobile ? `${Math.round(value / 1000)}к` : `${Math.round(value / 1000)}к ₽`}
                width={isMobile ? 25 : 60}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) {
                    return <div style={{ display: 'none' }} />;
                  }

                  const data = payload[0].payload;
                  return (
                    <div className="bg-background/95 border border-border rounded-lg p-3 shadow-xl backdrop-blur-sm">
                      <p className="text-foreground font-medium mb-2">{label}</p>
                      <div className="space-y-1">
                        <p className="text-foreground/80 flex justify-between">
                          <span>Общая выручка:</span>
                          <span className="font-medium">{Math.round(data.revenue).toLocaleString('ru-RU')} ₽</span>
                        </p>
                        {fuelTypes
                          .map((fuelType, index) => ({ fuelType, index, revenue: data[fuelType] || 0 }))
                          .filter(item => item.revenue > 0)
                          .map(({ fuelType, index, revenue }) => {
                            const colors = ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a', '#312e81'];
                            return (
                              <p key={fuelType} className="flex justify-between" style={{ color: colors[index % colors.length] }}>
                                <span>{fuelType}:</span>
                                <span className="font-medium">{Math.round(revenue).toLocaleString('ru-RU')} ₽</span>
                              </p>
                            );
                          })}
                        <p className="text-blue-600 dark:text-blue-400 flex justify-between">
                          <span>Операции:</span>
                          <span className="font-medium">{data.operations}</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Стековые бары для каждого вида топлива */}
              {fuelTypes.map((fuelType, index) => {
                const colors = ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a', '#312e81'];
                return (
                  <Bar
                    key={fuelType}
                    dataKey={fuelType}
                    stackId="fuel"
                    fill={colors[index % colors.length]}
                    radius={index === fuelTypes.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации ре-рендеров
  return (
    prevProps.data === nextProps.data &&
    prevProps.fuelTypes === nextProps.fuelTypes &&
    prevProps.isMobile === nextProps.isMobile
  );
});
