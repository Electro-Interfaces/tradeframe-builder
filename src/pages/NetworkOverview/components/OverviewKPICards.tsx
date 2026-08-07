import { Card, CardContent } from "@/components/ui/card";

interface OverviewKPICardsProps {
  isMobile: boolean;
  averageCheck: number;
  totalVolume: number;
  filteredTransactionsCount: number;
  dateFrom: string;
  dateTo: string;
  fuelTypeStats: Array<{
    type: string;
    operations: number;
    revenue: number;
    volume: number;
    priority: number;
  }>;
}

export function OverviewKPICards({
  isMobile,
  averageCheck,
  totalVolume,
  filteredTransactionsCount,
  dateFrom,
  dateTo,
  fuelTypeStats,
}: OverviewKPICardsProps) {
  return (
    <div className="w-full space-y-6">
      {/* Первая строка - основные средние значения */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-2">
          <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Средние значения</h3>
        </div>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-6'}`}>
          {/* Средний чек */}
          <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-sm mb-2">Средний чек</p>
              <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                {Math.round(averageCheck).toLocaleString('ru-RU')} ₽
              </p>
            </CardContent>
          </Card>

          {/* Средний объем общий */}
          <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-sm mb-2">Средний объем</p>
              <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                {filteredTransactionsCount > 0 ? Math.round(totalVolume / filteredTransactionsCount) : 0} л
              </p>
            </CardContent>
          </Card>

          {/* Операций в день */}
          <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground text-sm mb-2">Операций/день</p>
              <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                {(() => {
                  const startDate = new Date(dateFrom);
                  const endDate = new Date(dateTo);
                  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  return Math.round(filteredTransactionsCount / daysDiff);
                })()}
              </p>
            </CardContent>
          </Card>

          {/* Средний объем АИ-92 */}
          {fuelTypeStats.find(f => f.type.includes('АИ-92')) ? (
            <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground text-sm mb-2">АИ-92 сред.</p>
                <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                  {(() => {
                    const fuel92 = fuelTypeStats.find(f => f.type.includes('АИ-92'));
                    return fuel92 && fuel92.operations > 0 ? Math.round(fuel92.volume / fuel92.operations) : 0;
                  })()} л
                </p>
              </CardContent>
            </Card>
          ) : (
            <div></div>
          )}

          {/* Средний объем АИ-95 */}
          {fuelTypeStats.find(f => f.type.includes('АИ-95')) ? (
            <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground text-sm mb-2">АИ-95 сред.</p>
                <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                  {(() => {
                    const fuel95 = fuelTypeStats.find(f => f.type.includes('АИ-95'));
                    return fuel95 && fuel95.operations > 0 ? Math.round(fuel95.volume / fuel95.operations) : 0;
                  })()} л
                </p>
              </CardContent>
            </Card>
          ) : (
            <div></div>
          )}

          {/* Средний объем ДТ */}
          {fuelTypeStats.find(f => f.type.includes('ДТ') || f.type.includes('Дизель')) ? (
            <Card className="bg-card border-border transition-all duration-300 hover:shadow-lg hover:bg-secondary">
              <CardContent className="p-4 text-center">
                <p className="text-muted-foreground text-sm mb-2">ДТ средний</p>
                <p className="font-bold text-foreground text-2xl min-h-[2.5rem] flex items-center justify-center">
                  {(() => {
                    const fuelDT = fuelTypeStats.find(f => f.type.includes('ДТ') || f.type.includes('Дизель'));
                    return fuelDT && fuelDT.operations > 0 ? Math.round(fuelDT.volume / fuelDT.operations) : 0;
                  })()} л
                </p>
              </CardContent>
            </Card>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}
