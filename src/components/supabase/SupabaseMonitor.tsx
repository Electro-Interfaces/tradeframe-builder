/**
 * Компонент для мониторинга состояния Supabase соединения
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabaseClient } from '@/lib/supabase/client';
import { queryClient } from '@/lib/supabase/queryClient';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Database,
  RefreshCw,
  TrendingUp,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

interface ConnectionStats {
  isConnected: boolean;
  latency: number | null;
  lastCheck: Date;
  errorCount: number;
  successCount: number;
  uptime: number;
}

interface QueryStats {
  cacheSize: number;
  activeQueries: number;
  mutations: number;
  errorRate: number;
}

export function SupabaseMonitor() {
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    isConnected: false,
    latency: null,
    lastCheck: new Date(),
    errorCount: 0,
    successCount: 0,
    uptime: 0
  });

  const [queryStats, setQueryStats] = useState<QueryStats>({
    cacheSize: 0,
    activeQueries: 0,
    mutations: 0,
    errorRate: 0
  });

  const [isChecking, setIsChecking] = useState(false);
  const [logs, setLogs] = useState<Array<{
    timestamp: Date;
    type: 'success' | 'error' | 'warning';
    message: string;
  }>>([]);

  // Проверка соединения
  const checkConnection = async () => {
    setIsChecking(true);
    const startTime = Date.now();

    try {
      const result = await supabaseClient.testConnection();
      const latency = Date.now() - startTime;

      setConnectionStats(prev => ({
        ...prev,
        isConnected: result.success,
        latency,
        lastCheck: new Date(),
        errorCount: result.success ? prev.errorCount : prev.errorCount + 1,
        successCount: result.success ? prev.successCount + 1 : prev.successCount
      }));

      addLog(
        result.success ? 'success' : 'error',
        result.success 
          ? `Соединение установлено (${latency}ms)` 
          : `Ошибка соединения: ${result.error}`
      );

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      setConnectionStats(prev => ({
        ...prev,
        isConnected: false,
        latency,
        lastCheck: new Date(),
        errorCount: prev.errorCount + 1
      }));

      addLog('error', `Критическая ошибка: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  // Обновление статистики Query Client
  const updateQueryStats = () => {
    const cache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    const queries = cache.getAll();
    const mutations = mutationCache.getAll();

    const errorCount = queries.filter(q => q.state.error).length;
    const errorRate = queries.length > 0 ? (errorCount / queries.length) * 100 : 0;

    setQueryStats({
      cacheSize: queries.length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      mutations: mutations.length,
      errorRate
    });
  };

  // Добавление лога
  const addLog = (type: 'success' | 'error' | 'warning', message: string) => {
    setLogs(prev => [
      { timestamp: new Date(), type, message },
      ...prev.slice(0, 49) // Храним последние 50 записей
    ]);
  };

  // Очистка кэша
  const clearCache = () => {
    queryClient.clear();
    addLog('warning', 'Кэш очищен');
    updateQueryStats();
  };

  // Автоматические проверки
  useEffect(() => {
    checkConnection();
    updateQueryStats();

    const interval = setInterval(() => {
      checkConnection();
      updateQueryStats();
    }, 30000); // Каждые 30 секунд

    return () => clearInterval(interval);
  }, []);

  // Расчет uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStats(prev => ({
        ...prev,
        uptime: prev.uptime + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!connectionStats.isConnected) return 'destructive';
    if (connectionStats.latency && connectionStats.latency > 2000) return 'warning';
    return 'success';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Основной статус */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Состояние Supabase</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {connectionStats.isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <Badge variant={getStatusColor() as any}>
              {connectionStats.isConnected ? 'Подключено' : 'Отключено'}
            </Badge>
            {connectionStats.latency && (
              <span className="text-sm text-muted-foreground">
                {connectionStats.latency}ms
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-500">
                {connectionStats.successCount}
              </div>
              <p className="text-xs text-muted-foreground">Успешных соединений</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">
                {connectionStats.errorCount}
              </div>
              <p className="text-xs text-muted-foreground">Ошибок</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Статистика запросов */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">React Query Cache</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
          >
            Очистить кэш
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="text-sm">Кэшированных запросов: {queryStats.cacheSize}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm">Активных запросов: {queryStats.activeQueries}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Мутаций: {queryStats.mutations}</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Ошибок: {queryStats.errorRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {queryStats.errorRate > 0 && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Процент ошибок</div>
              <Progress value={queryStats.errorRate} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uptime */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Время работы сессии</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="text-2xl font-mono">{formatUptime(connectionStats.uptime)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Последняя проверка: {connectionStats.lastCheck.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      {/* Логи */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Логи соединения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <span className="text-xs text-muted-foreground font-mono">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                {log.type === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
                {log.type === 'error' && <XCircle className="h-3 w-3 text-red-500" />}
                {log.type === 'warning' && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                <span className={
                  log.type === 'success' ? 'text-green-700' :
                  log.type === 'error' ? 'text-red-700' :
                  'text-yellow-700'
                }>
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-sm text-muted-foreground">Логи пока отсутствуют</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}