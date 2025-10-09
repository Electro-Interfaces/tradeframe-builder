import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface HourlyActivityChartProps {
  data: any[];
  isMobile: boolean;
}

// Мемоизированный компонент для предотвращения лишних перерисовок
export const HourlyActivityChart = memo(function HourlyActivityChart({
  data,
  isMobile
}: HourlyActivityChartProps) {

  if (!data || data.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            Суточная активность по часам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Нет данных</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-slate-800 border-slate-600 ${isMobile ? '' : 'lg:h-full lg:flex lg:flex-col'}`}>
      <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
        <CardTitle className={`text-white ${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
          <Activity className="h-5 w-5 text-blue-400" />
          Суточная активность по часам
        </CardTitle>
      </CardHeader>
      <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'} ${isMobile ? '' : 'lg:flex-1'}`}>
        {/* Резервируем фиксированную высоту для предотвращения CLS */}
        <div
          className={`w-full ${isMobile ? 'h-64' : 'h-80'}`}
          style={{ minHeight: isMobile ? '256px' : '320px' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={isMobile ? { top: 10, right: 5, left: 20, bottom: 20 } : { top: 10, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                fontSize={isMobile ? 9 : 11}
                tick={{ fill: '#94a3b8' }}
                interval={isMobile ? 2 : 1}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={isMobile ? 9 : 11}
                tick={{ fill: '#94a3b8' }}
                tickFormatter={(value) => Math.round(value).toString()}
                width={isMobile ? 25 : 40}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) {
                    return <div style={{ display: 'none' }} />;
                  }

                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
                      <p className="text-white font-medium mb-2">{data.hour}</p>
                      <div className="space-y-1">
                        <p className="text-slate-300 flex justify-between">
                          <span>Операций:</span>
                          <span className="font-medium">{data.operations || data.count}</span>
                        </p>
                        <p className="text-blue-400 flex justify-between">
                          <span>Выручка:</span>
                          <span className="font-medium">{Math.round(data.revenue).toLocaleString('ru-RU')} ₽</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="operations"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  return (
    prevProps.data === nextProps.data &&
    prevProps.isMobile === nextProps.isMobile
  );
});
