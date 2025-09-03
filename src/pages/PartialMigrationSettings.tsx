import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Zap,
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  TestTube,
  GitBranch,
  Activity,
  Layers,
  FileText,
  Users,
  Settings,
  DollarSign
} from 'lucide-react';
import { 
  partialMigrationService, 
  ServiceModule, 
  ServiceMigrationConfig 
} from '@/services/partialMigrationService';
import { apiConfigService, DatabaseConnection } from '@/services/apiConfigService';

export default function PartialMigrationSettings() {
  const { toast } = useToast();
  const [serviceConfigs, setServiceConfigs] = useState<ServiceMigrationConfig[]>([]);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [migrationPlan, setMigrationPlan] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceModule[]>([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [revertServiceId, setRevertServiceId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const configs = partialMigrationService.getAllServiceConfigs();
    const conns = apiConfigService.getAllConnections().filter(c => c.type !== 'mock');
    setServiceConfigs(configs);
    setConnections(conns);
    setSelectedConnection(apiConfigService.getCurrentConfig().currentConnectionId);
  };

  const handleServiceToggle = async (moduleId: ServiceModule, enabled: boolean) => {
    setLoading(moduleId);
    
    try {
      let result;
      
      if (enabled) {
        result = await partialMigrationService.migrateServiceToDatabase(moduleId, selectedConnection);
      } else {
        result = partialMigrationService.revertServiceToMock(moduleId);
      }

      if (result.success) {
        loadData();
        toast({
          title: enabled ? "Сервис переведен на БД" : "Сервис возвращен к mock",
          description: serviceConfigs.find(s => s.moduleId === moduleId)?.moduleName,
        });
      } else {
        toast({
          title: "Ошибка переключения",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const handleBatchMigration = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Выберите сервисы",
        description: "Отметьте сервисы для миграции",
        variant: "destructive"
      });
      return;
    }

    setLoading('batch');
    
    try {
      const results = await partialMigrationService.migrateBatch(selectedServices, selectedConnection);
      const successful = Object.values(results).filter((r: any) => r.success).length;
      
      loadData();
      setShowPlanDialog(false);
      setSelectedServices([]);
      
      toast({
        title: "Миграция завершена",
        description: `${successful}/${selectedServices.length} сервисов успешно переведены`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка миграции",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const handleTestService = async (moduleId: ServiceModule) => {
    setTestResults(prev => ({ ...prev, [moduleId]: { testing: true } }));
    
    try {
      const result = await partialMigrationService.testServiceConnection(moduleId);
      setTestResults(prev => ({ ...prev, [moduleId]: result }));
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [moduleId]: { success: false, error: error.message } 
      }));
    }
  };

  const handlePlanMigration = () => {
    if (selectedServices.length === 0) return;
    
    const plan = partialMigrationService.getMigrationPlan(selectedServices);
    setMigrationPlan(plan);
    setShowPlanDialog(true);
  };

  const getServiceIcon = (moduleId: ServiceModule) => {
    const icons = {
      networks: GitBranch,
      nomenclature: FileText,
      users: Users,
      equipment: Settings,
      components: Layers,
      commandTemplates: Activity,
      connections: Zap,
      prices: DollarSign,
      messages: FileText,
      auditLog: FileText,
      workflows: Activity,
      tanks: Database,
      tradingPoints: GitBranch
    };
    
    const Icon = icons[moduleId] || Database;
    return <Icon className="h-5 w-5" />;
  };

  const getStatusIcon = (status: string, moduleId: string) => {
    const result = testResults[moduleId];
    
    if (result?.testing) {
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    if (status === 'database') {
      return result?.success !== false ? 
        <CheckCircle className="h-4 w-4 text-green-500" /> : 
        <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Database className="h-4 w-4 text-gray-400" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const stats = partialMigrationService.getMigrationStats();

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-3xl font-bold text-foreground">
            Частичная миграция на БД
          </h1>
          <p className="text-muted-foreground">
            Переводите отдельные разделы приложения на реальную БД постепенно
          </p>
        </div>

        {/* Статистика */}
        <div className="grid gap-4 md:grid-cols-4 mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Прогресс миграции</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.percentage}%</div>
              <Progress value={stats.percentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.migrated} из {stats.total} сервисов
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">На БД</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.migrated}</div>
              <p className="text-xs text-muted-foreground">
                Используют реальную БД
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mock данные</CardTitle>
              <Database className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.remaining}</div>
              <p className="text-xs text-muted-foreground">
                Используют локальные данные
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Подключение</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">
                {apiConfigService.getCurrentConnection()?.name || 'Не выбрано'}
              </div>
              <p className="text-xs text-muted-foreground">
                Текущая БД
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Настройки подключения */}
        <Card className="mx-4 md:mx-6 lg:mx-8">
          <CardHeader>
            <CardTitle>Настройки миграции</CardTitle>
            <CardDescription>
              Выберите подключение к БД для новых сервисов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Подключение для миграции</label>
                  <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите подключение" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name} ({conn.url})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Массовые операции</label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handlePlanMigration}
                      disabled={selectedServices.length === 0}
                    >
                      Планировать миграцию
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const mockServices = serviceConfigs
                          .filter(s => s.migrationStatus === 'mock')
                          .map(s => s.moduleId);
                        setSelectedServices(mockServices);
                      }}
                    >
                      Выбрать все mock
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Список сервисов */}
        <Card className="mx-4 md:mx-6 lg:mx-8">
          <CardHeader>
            <CardTitle>Сервисы приложения</CardTitle>
            <CardDescription>
              Переключайте отдельные сервисы между mock данными и реальной БД
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serviceConfigs.map((service) => (
                <div
                  key={service.moduleId}
                  className={`p-4 border rounded-lg transition-all ${
                    service.migrationStatus === 'database' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.moduleId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices(prev => [...prev, service.moduleId]);
                          } else {
                            setSelectedServices(prev => prev.filter(id => id !== service.moduleId));
                          }
                        }}
                        className="rounded"
                      />
                      
                      <div className="flex items-center gap-2">
                        {getServiceIcon(service.moduleId)}
                        {getStatusIcon(service.migrationStatus, service.moduleId)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{service.moduleName}</h3>
                          <Badge 
                            className={`text-xs ${getPriorityColor(service.priority)}`}
                          >
                            {service.priority.toUpperCase()}
                          </Badge>
                          {service.migrationStatus === 'database' && (
                            <Badge variant="default" className="text-xs">
                              БД
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {service.description}
                        </p>
                        {service.dependencies.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Зависимости: {service.dependencies.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestService(service.moduleId)}
                        disabled={testResults[service.moduleId]?.testing}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      
                      <Switch
                        checked={service.migrationStatus === 'database'}
                        onCheckedChange={(checked) => handleServiceToggle(service.moduleId, checked)}
                        disabled={loading === service.moduleId}
                      />
                      
                      {service.migrationStatus === 'database' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevertServiceId(service.moduleId)}
                        >
                          <RotateCcw className="h-4 w-4 text-yellow-500" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Результаты тестирования */}
                  {testResults[service.moduleId] && !testResults[service.moduleId].testing && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                      <div className={`flex items-center gap-2 ${testResults[service.moduleId].success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResults[service.moduleId].success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {testResults[service.moduleId].success ? 'Все endpoints доступны' : 'Некоторые endpoints недоступны'}
                      </div>
                      {Object.entries(testResults[service.moduleId].endpoints || {}).map(([endpoint, success]) => (
                        <div key={endpoint} className="flex justify-between mt-1">
                          <span>{endpoint}</span>
                          <span className={success ? 'text-green-600' : 'text-red-600'}>
                            {success ? '✓' : '✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Диалог планирования миграции */}
        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>План миграции</DialogTitle>
            </DialogHeader>
            {migrationPlan && (
              <div className="space-y-4">
                {/* Порядок миграции */}
                <div>
                  <h4 className="font-medium mb-2">Порядок выполнения:</h4>
                  <div className="space-y-2">
                    {migrationPlan.order.map((moduleId: ServiceModule, index: number) => (
                      <div key={moduleId} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span>{serviceConfigs.find(s => s.moduleId === moduleId)?.moduleName}</span>
                        {index < migrationPlan.order.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Конфликты */}
                {migrationPlan.conflicts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">⚠️ Конфликты:</h4>
                    <ul className="space-y-1">
                      {migrationPlan.conflicts.map((conflict: string, index: number) => (
                        <li key={index} className="text-sm text-red-600">• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Рекомендации */}
                {migrationPlan.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">💡 Рекомендации:</h4>
                    <ul className="space-y-1">
                      {migrationPlan.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-blue-600">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
                    Отмена
                  </Button>
                  <Button 
                    onClick={handleBatchMigration}
                    disabled={loading === 'batch' || migrationPlan.conflicts.length > 0}
                  >
                    {loading === 'batch' ? 'Выполняется...' : 'Выполнить миграцию'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Диалог подтверждения отката */}
        <AlertDialog open={!!revertServiceId} onOpenChange={() => setRevertServiceId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вернуть к mock данным?</AlertDialogTitle>
              <AlertDialogDescription>
                Сервис будет переключен обратно на локальные данные. 
                Убедитесь что нет зависимых сервисов.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (revertServiceId) {
                    handleServiceToggle(revertServiceId as ServiceModule, false);
                    setRevertServiceId(null);
                  }
                }}
              >
                Вернуть к mock
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}