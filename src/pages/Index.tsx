import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Network, 
  DollarSign, 
  Gauge, 
  AlertTriangle, 
  Settings,
  Activity,
  MapPin,
  Clock,
  BarChart3
} from "lucide-react";

const Index = () => {
  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-3 md:px-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Главная панель</h1>
          <p className="text-muted-foreground text-lg">
            Обзор состояния всех систем и ключевых показателей
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="panel h-28 flex flex-col justify-between">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <Network className="h-4 w-4" />
              Активные сети
            </div>
            <div className="text-3xl font-bold">24</div>
            <div className="text-xs text-emerald-400">+2 за неделю</div>
          </div>

          <div className="panel h-28 flex flex-col justify-between">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Торговые точки
            </div>
            <div className="text-3xl font-bold">156</div>
            <div className="text-xs text-emerald-400">+5 за месяц</div>
          </div>

          <div className="panel h-28 flex flex-col justify-between">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Выручка за день
            </div>
            <div className="text-3xl font-bold">2.4М ₽</div>
            <div className="text-xs text-emerald-400">+12% к вчера</div>
          </div>

          <div className="panel h-28 flex flex-col justify-between">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Активные оповещения
            </div>
            <div className="text-3xl font-bold text-amber-400">3</div>
            <div className="text-xs text-slate-400">Требуют внимания</div>
          </div>
        </div>

        {/* Main Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Быстрые действия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-accent/50"
              >
                <Network className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Сети и ТТ</div>
                  <div className="text-xs text-muted-foreground">Управление инфраструктурой</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-accent/50"
              >
                <BarChart3 className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Аналитика</div>
                  <div className="text-xs text-muted-foreground">Отчеты и статистика</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-accent/50"
              >
                <DollarSign className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Цены</div>
                  <div className="text-xs text-muted-foreground">Управление ценообразованием</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Terminal Status */}
          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Статус терминалов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Gauge className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Все системы работают</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    156 терминалов онлайн
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Последняя активность
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Нет последних событий</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Система работает штатно
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
