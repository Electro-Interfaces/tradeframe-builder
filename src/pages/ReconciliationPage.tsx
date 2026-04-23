import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileSearch, AlertCircle, CheckCircle2, Building2, CreditCard, Clock, ArrowRight } from 'lucide-react';
import { ReconciliationParamsModal } from '@/components/reconciliation/ReconciliationParamsModal';
import { ReconciliationResults } from '@/components/reconciliation/ReconciliationResults';
import { executeReconciliation } from '@/services/reconciliation';
import { checkTradecorpHealth } from '@/services/tradecorpProxyClient';
import type { ReconciliationParams, ReconciliationResult } from '@/types/reconciliation';
import { useToast } from '@/hooks/use-toast';

export default function ReconciliationPage() {
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  // Проверка доступности TradeCorp API
  const checkApiHealth = async () => {
    const health = await checkTradecorpHealth();
    setApiStatus(health.status);
    return health.status === 'ok';
  };

  // Открытие модального окна с параметрами
  const handleOpenModal = async () => {
    setError(null);

    // Проверяем доступность API
    const isHealthy = await checkApiHealth();
    if (!isHealthy) {
      toast({
        variant: 'destructive',
        title: 'API недоступен',
        description: 'Не удалось подключиться к TradeCorp API. Проверьте настройки сервера.'
      });
      return;
    }

    setIsModalOpen(true);
  };

  // Запуск сверки
  const handleRunReconciliation = async (params: ReconciliationParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const reconciliationResult = await executeReconciliation(params);
      setResult(reconciliationResult);
      setIsModalOpen(false);

      // Уведомление о результате
      if (!reconciliationResult.summary.hasErrors) {
        toast({
          title: 'Сверка завершена',
          description: 'Все данные сходятся!',
        });
      } else {
        const errors = reconciliationResult.summary.onlyCorp +
                       reconciliationResult.summary.onlyTf +
                       reconciliationResult.summary.mismatch;
        toast({
          variant: 'destructive',
          title: 'Обнаружены расхождения',
          description: `Найдено ${errors} расхождений`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Ошибка сверки',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Сброс результатов для новой сверки
  const handleNewReconciliation = () => {
    setResult(null);
    setError(null);
    handleOpenModal();
  };

  // Если есть результат - показываем его
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
        <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
          <ReconciliationResults
            result={result}
            onNewReconciliation={handleNewReconciliation}
          />
        </div>
      </div>
    );
  }

  // Начальный экран
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Заголовок страницы */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <FileSearch className="h-6 w-6 text-primary dark:text-primary/70" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Сверка корп. процессинга</h1>
            </div>
            <p className="text-muted-foreground">
              Трёхсторонняя сверка транзакций: Corp, TradePoint, Сменные отчёты
            </p>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <Alert variant="destructive" className="bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
          {/* Карточка запуска сверки */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileSearch className="h-5 w-5 text-primary dark:text-primary/70" />
                Запуск сверки
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Сверка данных по корпоративным картам между тремя источниками с 100% совпадением литров.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Источники данных */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-background/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-medium text-foreground text-xs">Corp</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>Процессинг</li>
                    <li>TradeCorp API</li>
                  </ul>
                </div>
                <div className="bg-background/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-primary dark:text-primary/70" />
                    <h4 className="font-medium text-foreground text-xs">TF</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>TradePoint</li>
                    <li>/v2/transactions</li>
                  </ul>
                </div>
                <div className="bg-background/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-foreground text-xs">Смена</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>Сменные отчёты</li>
                    <li>shift_report</li>
                  </ul>
                </div>
              </div>

              {/* Кнопка запуска */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleOpenModal}
                  size="lg"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/80 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <FileSearch className="mr-2 h-4 w-4" />
                      Начать сверку
                    </>
                  )}
                </Button>

                {apiStatus === 'ok' && (
                  <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    API доступен
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Алгоритм сверки */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Алгоритм сверки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background/50 rounded-lg p-4 space-y-2 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs font-bold">1</div>
                  <h4 className="font-medium text-foreground">Corp ↔ TF (построчно)</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  Сопоставление по станции, времени (±1 мин), топливу и литрам
                </p>
              </div>
              <div className="bg-background/50 rounded-lg p-4 space-y-2 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary dark:text-primary/70 text-xs font-bold">2</div>
                  <h4 className="font-medium text-foreground">Суммы ↔ Смена</h4>
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  Агрегация по сменам и сравнение с данными сменного отчёта
                </p>
              </div>

              {/* Подсказка */}
              <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" />
                <span>Любое расхождение по литрам = ошибка</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Модальное окно параметров */}
        <ReconciliationParamsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSubmit={handleRunReconciliation}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
