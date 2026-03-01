import React from "react";
import { Fuel, CreditCard, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FuelTypeStat {
  type: string;
  operations: number;
  revenue: number;
  volume: number;
  priority: number;
}

interface PaymentTypeStat {
  type: string;
  operations: number;
  revenue: number;
  volume: number;
}

interface OverviewTablesProps {
  isMobile: boolean;
  fuelTypeStats: FuelTypeStat[];
  paymentTypeStats: PaymentTypeStat[];
  totalRevenue: number;
  totalVolume: number;
  filteredTransactionsCount: number;
}

export function OverviewTables({
  isMobile,
  fuelTypeStats,
  paymentTypeStats,
  totalRevenue,
  totalVolume,
  filteredTransactionsCount,
}: OverviewTablesProps) {
  return (
    <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
      {/* Таблица по видам топлива */}
      <Card className="bg-card border border-border rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
        <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
          <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
            <Fuel className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-purple-600 dark:text-purple-400`} />
            Виды топлива
          </CardTitle>
        </CardHeader>
        <CardContent className={`${isMobile ? 'px-0 py-2' : 'px-0 py-2'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={`text-left py-3 text-foreground font-medium ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>Топливо</th>
                  <th className={`text-right py-3 text-foreground font-medium whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>Выручка</th>
                  <th className={`text-right py-3 text-foreground font-medium whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>Объем</th>
                  <th className={`text-right py-3 text-foreground font-medium ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}><Activity className="w-4 h-4 ml-auto" /></th>
                </tr>
              </thead>
              <tbody>
                {fuelTypeStats.map((fuel) => (
                  <tr key={fuel.type} className="border-b border-border hover:bg-secondary transition-colors duration-200">
                    <td className={`py-3 text-foreground font-medium ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>{fuel.type}</td>
                    <td className={`py-3 text-right text-foreground whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {isMobile ? Math.round(fuel.revenue).toLocaleString('ru-RU') : fuel.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}&nbsp;₽
                    </td>
                    <td className={`py-3 text-right text-foreground whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {isMobile ? Math.round(fuel.volume).toLocaleString('ru-RU') : fuel.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}&nbsp;л
                    </td>
                    <td className={`py-3 text-right text-foreground/80 ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}>
                      {fuel.operations}
                    </td>
                  </tr>
                ))}
                {/* Итоговая строка для топлива */}
                <tr className="border-t-2 border-primary/30 bg-primary/10">
                  <td className={`py-3 text-primary font-bold ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>Итого</td>
                  <td className={`py-3 text-right text-primary font-bold whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {Math.round(totalRevenue).toLocaleString('ru-RU')}&nbsp;₽
                  </td>
                  <td className={`py-3 text-right text-primary font-bold whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {Math.round(totalVolume).toLocaleString('ru-RU')}&nbsp;л
                  </td>
                  <td className={`py-3 text-right text-primary font-bold ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}>
                    {filteredTransactionsCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Таблица по способам оплаты */}
      {paymentTypeStats.length > 0 && (
        <Card className="bg-card border border-border rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
          <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
            <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
              <CreditCard className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-600 dark:text-green-400`} />
              Способы оплаты
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'px-0 py-2' : 'px-0 py-2'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`text-left py-3 text-foreground font-medium ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>Вид</th>
                    <th className={`text-right py-3 text-foreground font-medium whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>Выручка</th>
                    <th className={`text-right py-3 text-foreground font-medium whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>Объем</th>
                    <th className={`text-right py-3 text-foreground font-medium ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}><Activity className="w-4 h-4 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTypeStats.map((payment) => {
                    const shortName = payment.type
                      .replace('Банковская карта', 'Банковские')
                      .replace('Наличные', 'Наличные')
                      .replace('Топливная карта', 'Топливные')
                      .replace('Онлайн заказ', 'Онлайн');

                    return (
                    <tr key={payment.type} className="border-b border-border hover:bg-secondary transition-colors duration-200">
                      <td className={`py-3 text-foreground font-medium ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>{shortName}</td>
                      <td className={`py-3 text-right text-foreground whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {isMobile ? Math.round(payment.revenue).toLocaleString('ru-RU') : payment.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}&nbsp;₽
                      </td>
                      <td className={`py-3 text-right text-foreground whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {isMobile ? Math.round(payment.volume).toLocaleString('ru-RU') : payment.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}&nbsp;л
                      </td>
                      <td className={`py-3 text-right text-foreground/80 font-medium whitespace-nowrap ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}>
                        {payment.operations}
                      </td>
                    </tr>
                    );
                  })}
                  {/* Итоговая строка для способов оплаты */}
                  <tr className="border-t-2 border-primary/30 bg-primary/10">
                    <td className={`py-3 text-primary font-bold ${isMobile ? 'text-xs pl-3' : 'text-sm pl-6'}`}>Итого</td>
                    <td className={`py-3 text-right text-primary font-bold whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {Math.round(totalRevenue).toLocaleString('ru-RU')}&nbsp;₽
                    </td>
                    <td className={`py-3 text-right text-primary font-bold whitespace-nowrap ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {Math.round(totalVolume).toLocaleString('ru-RU')}&nbsp;л
                    </td>
                    <td className={`py-3 text-right text-primary font-bold ${isMobile ? 'text-xs pr-3' : 'text-sm pr-6'}`}>
                      {filteredTransactionsCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
