import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  RefreshCw,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Workflow, WorkflowExecution } from '@/types/workflows';
import workflowsService from '@/services/workflowsSupabaseService';

interface MonitoringStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  avg_execution_time: number;
  executions_last_24h: number;
  success_rate: number;
}

interface ExecutionTrend {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface WorkflowMonitoringProps {
  workflows: Workflow[];
  onRefresh: () => void;
}

export function WorkflowMonitoring({ workflows, onRefresh }: WorkflowMonitoringProps) {
  const [stats, setStats] = useState<MonitoringStats>({
    total_workflows: 0,
    active_workflows: 0,
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    avg_execution_time: 0,
    executions_last_24h: 0,
    success_rate: 0
  });
  
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([]);
  const [trends, setTrends] = useState<ExecutionTrend[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const [statsData, executionsData, trendsData] = await Promise.all([
        workflowsService.getStatistics(),
        workflowsService.getRecentExecutions(20),
        workflowsService.getExecutionTrends(timeRange)
      ]);
      
      setStats(statsData);
      setRecentExecutions(executionsData);
      setTrends(trendsData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Ошибка загрузки данных мониторинга:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadMonitoringData();
    onRefresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSuccessRate = () => {
    return stats.total_executions > 0 
      ? Math.round((stats.successful_executions / stats.total_executions) * 100)
      : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Мониторинг регламентов</h2>
          <p className="text-slate-400 text-sm">
            Последнее обновление: {lastRefresh.toLocaleTimeString('ru-RU')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 часа</SelectItem>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Всего регламентов</p>
                <p className="text-2xl font-bold text-white">{stats.total_workflows}</p>
                <p className="text-xs text-slate-500">
                  Активных: {stats.active_workflows}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Выполнений за {timeRange}</p>
                <p className="text-2xl font-bold text-white">{stats.executions_last_24h}</p>
                <div className="flex items-center gap-1 text-xs">
                  {stats.executions_last_24h > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span className="text-slate-500">от предыдущего периода</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Успешность</p>
                <p className="text-2xl font-bold text-white">{getSuccessRate()}%</p>
                <p className="text-xs text-slate-500">
                  {stats.successful_executions} из {stats.total_executions}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Среднее время</p>
                <p className="text-2xl font-bold text-white">
                  {Math.round(stats.avg_execution_time / 1000)}с
                </p>
                <p className="text-xs text-slate-500">выполнения</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="executions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executions">Последние выполнения</TabsTrigger>
          <TabsTrigger value="workflows">Состояние регламентов</TabsTrigger>
          <TabsTrigger value="alerts">Предупреждения</TabsTrigger>
        </TabsList>

        {/* Recent Executions */}
        <TabsContent value="executions" className="mt-6">
          <Card className="border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Последние выполнения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentExecutions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Нет данных о выполнениях</p>
                  </div>
                ) : (
                  recentExecutions.map((execution) => {
                    const workflow = workflows.find(w => w.id === execution.workflow_id);
                    return (
                      <div key={execution.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <p className="font-medium text-white">
                              {workflow?.name || 'Неизвестный регламент'}
                            </p>
                            <p className="text-sm text-slate-400">
                              {new Date(execution.started_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={execution.status === 'completed' ? 'default' : execution.status === 'failed' ? 'destructive' : 'secondary'}>
                            {execution.status === 'completed' ? 'Завершен' :
                             execution.status === 'failed' ? 'Ошибка' :
                             execution.status === 'running' ? 'Выполняется' : 'Отменен'}
                          </Badge>
                          {execution.duration_ms && (
                            <p className="text-sm text-slate-400 mt-1">
                              {Math.round(execution.duration_ms / 1000)}с
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Status */}
        <TabsContent value="workflows" className="mt-6">
          <Card className="border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Состояние регламентов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflows.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Регламенты не найдены</p>
                  </div>
                ) : (
                  workflows.map((workflow) => {
                    const lastExecution = recentExecutions.find(e => e.workflow_id === workflow.id);
                    return (
                      <div key={workflow.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${workflow.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium text-white">{workflow.name}</p>
                            <p className="text-sm text-slate-400">
                              {workflow.type} • {workflow.schedule.frequency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {lastExecution && (
                            <div className="text-right">
                              <p className="text-sm text-slate-400">Последнее выполнение:</p>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(lastExecution.status)}
                                <span className="text-sm text-white">
                                  {new Date(lastExecution.started_at).toLocaleString('ru-RU')}
                                </span>
                              </div>
                            </div>
                          )}
                          <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                            {workflow.status === 'active' ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-6">
          <Card className="border-slate-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Предупреждения и рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Generate alerts based on statistics */}
                {getSuccessRate() < 80 && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-400">Низкая успешность выполнений</p>
                      <p className="text-sm text-slate-400">
                        Успешность составляет {getSuccessRate()}%. Рекомендуется проверить конфигурацию регламентов.
                      </p>
                    </div>
                  </div>
                )}
                
                {workflows.filter(w => w.status === 'inactive').length > workflows.length * 0.3 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-400">Много неактивных регламентов</p>
                      <p className="text-sm text-slate-400">
                        {workflows.filter(w => w.status === 'inactive').length} из {workflows.length} регламентов неактивны.
                      </p>
                    </div>
                  </div>
                )}

                {stats.avg_execution_time > 60000 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-400">Медленное выполнение</p>
                      <p className="text-sm text-slate-400">
                        Среднее время выполнения превышает 1 минуту. Возможна оптимизация.
                      </p>
                    </div>
                  </div>
                )}

                {stats.executions_last_24h === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-400">Нет выполнений</p>
                      <p className="text-sm text-slate-400">
                        За последние 24 часа не было выполнений регламентов.
                      </p>
                    </div>
                  </div>
                )}

                {/* If no alerts */}
                {getSuccessRate() >= 80 && 
                 workflows.filter(w => w.status === 'inactive').length <= workflows.length * 0.3 &&
                 stats.avg_execution_time <= 60000 && 
                 stats.executions_last_24h > 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-medium">Все в порядке!</p>
                    <p className="text-slate-400 text-sm">Система работает стабильно, критических проблем не обнаружено.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}