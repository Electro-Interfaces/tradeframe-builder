import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  TestTube,
  CheckCircle,
  XCircle,
  Globe,
  Key,
  ChevronDown,
  ChevronRight,
  Code,
  Tag,
  Loader2,
  RefreshCw,
  Edit3,
  Send,
  Database,
  Zap,
  Trash2,
} from 'lucide-react';
import { getBackendOrigin } from '@/utils/backendUrl';

// ============================================================================
// Реальные API эндпоинты TradeFrame backend → STS proxy
// Источник: server/routes/sts.js
// ============================================================================

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  group: string;
  params: { name: string; required: boolean; description: string; defaultValue?: string }[];
  bodySchema?: Record<string, string>;
  cacheTTL: number;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Оборудование
  {
    id: 'get-v1-info', method: 'GET', path: '/v1/info',
    summary: 'Статусы оборудования (краткий)', group: 'Оборудование',
    params: [
      { name: 'system', required: true, description: 'ID системы (сети)', defaultValue: '15' },
    ],
    cacheTTL: 60,
  },
  {
    id: 'get-v2-info', method: 'GET', path: '/v2/info',
    summary: 'Статусы оборудования (расширенный, с params)', group: 'Оборудование',
    params: [
      { name: 'system', required: true, description: 'ID системы (сети)', defaultValue: '15' },
      { name: 'station', required: false, description: 'Номер станции' },
    ],
    cacheTTL: 60,
  },
  // Резервуары
  {
    id: 'get-v1-tanks', method: 'GET', path: '/v1/tanks',
    summary: 'Остатки резервуаров', group: 'Резервуары',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: false, description: 'Номер станции' },
    ],
    cacheTTL: 120,
  },
  // Транзакции
  {
    id: 'get-v1-transactions', method: 'GET', path: '/v1/transactions',
    summary: 'Транзакции (v1)', group: 'Транзакции',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
      { name: 'dt_beg', required: true, description: 'Начало периода (YYYY-MM-DD)', defaultValue: '' },
      { name: 'dt_end', required: true, description: 'Конец периода (YYYY-MM-DD)', defaultValue: '' },
    ],
    cacheTTL: 180,
  },
  {
    id: 'get-v2-transactions', method: 'GET', path: '/v2/transactions',
    summary: 'Транзакции (v2, расширенный)', group: 'Транзакции',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
      { name: 'dt_beg', required: true, description: 'Начало периода', defaultValue: '' },
      { name: 'dt_end', required: true, description: 'Конец периода', defaultValue: '' },
    ],
    cacheTTL: 300,
  },
  // Цены
  {
    id: 'get-v1-prices', method: 'GET', path: '/v1/prices',
    summary: 'Текущие цены', group: 'Цены',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
    ],
    cacheTTL: 300,
  },
  {
    id: 'get-v1-pos-prices', method: 'GET', path: '/v1/pos/prices/{station}',
    summary: 'Цены по станции', group: 'Цены',
    params: [
      { name: 'station', required: true, description: 'Номер станции (в URL)', defaultValue: '1' },
    ],
    cacheTTL: 300,
  },
  {
    id: 'get-v1-schedule-prices', method: 'GET', path: '/v1/schedule/prices/{station}',
    summary: 'Расписание цен', group: 'Цены',
    params: [
      { name: 'station', required: true, description: 'Номер станции (в URL)', defaultValue: '1' },
    ],
    cacheTTL: 300,
  },
  // Смены
  {
    id: 'get-v1-shifts', method: 'GET', path: '/v1/shifts',
    summary: 'Список смен', group: 'Смены',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
    ],
    cacheTTL: 300,
  },
  // Отчёты
  {
    id: 'get-v1-report-shift', method: 'GET', path: '/v1/report/shift_report',
    summary: 'Сменный отчёт', group: 'Отчёты',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
      { name: 'shift', required: true, description: 'Номер смены', defaultValue: '1' },
    ],
    cacheTTL: 7200,
  },
  {
    id: 'get-v1-report-receipts', method: 'GET', path: '/v1/report/receipts',
    summary: 'Поступления (receipts)', group: 'Отчёты',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
    ],
    cacheTTL: 300,
  },
  // Купоны
  {
    id: 'get-v1-coupons', method: 'GET', path: '/v1/coupons',
    summary: 'Список купонов', group: 'Купоны',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
    ],
    cacheTTL: 0,
  },
  {
    id: 'get-v1-coupons-manual', method: 'GET', path: '/v1/coupons_manual',
    summary: 'Ручные купоны', group: 'Купоны',
    params: [
      { name: 'system', required: true, description: 'ID системы', defaultValue: '15' },
      { name: 'station', required: true, description: 'Номер станции', defaultValue: '1' },
    ],
    cacheTTL: 0,
  },
  // Кэш (внутренние)
  {
    id: 'get-cache-stats', method: 'GET', path: '/_cache/stats',
    summary: 'Статистика кэша STS proxy', group: 'Кэш',
    params: [],
    cacheTTL: 0,
  },
  {
    id: 'post-cache-clear', method: 'POST', path: '/_cache/clear',
    summary: 'Очистить кэш STS proxy', group: 'Кэш',
    params: [],
    cacheTTL: 0,
  },
];

// Группировка эндпоинтов
const GROUPS = ['Оборудование', 'Резервуары', 'Транзакции', 'Цены', 'Смены', 'Отчёты', 'Купоны', 'Кэш'];

interface TestResult {
  status: number;
  statusText: string;
  url: string;
  params: Record<string, string>;
  data: any;
  timestamp: string;
  success: boolean;
  responseTime: number;
}

interface CacheStats {
  cache: {
    keys: number;
    hits: number;
    misses: number;
    hitRate: string;
    uptime: string;
  };
  ttl: Record<string, number>;
}

function formatTTL(seconds: number): string {
  if (seconds === 0) return 'Без кэша';
  if (seconds < 60) return `${seconds}с`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  return `${Math.round(seconds / 3600)} ч`;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function STSApiSettings() {
  const { toast } = useToast();
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{ ok: boolean; message: string; responseTime?: number } | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Параметры для тестирования (system/station по умолчанию)
  const [defaultSystem, setDefaultSystem] = useState(() => localStorage.getItem('sts-test-system') || '15');
  const [defaultStation, setDefaultStation] = useState(() => localStorage.getItem('sts-test-station') || '1');

  // Диалог параметров
  const [isParamsDialogOpen, setIsParamsDialogOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [editableParams, setEditableParams] = useState<Record<string, string>>({});
  const [editableBody, setEditableBody] = useState('');

  const apiOrigin = getBackendOrigin();

  // Сохраняем дефолтные параметры
  useEffect(() => {
    localStorage.setItem('sts-test-system', defaultSystem);
    localStorage.setItem('sts-test-station', defaultStation);
  }, [defaultSystem, defaultStation]);

  // Загрузка статистики кэша при монтировании
  const loadCacheStats = useCallback(async () => {
    try {
      const resp = await fetch(`${apiOrigin}/api/sts/_cache/stats`);
      if (resp.ok) {
        const data = await resp.json();
        setCacheStats(data);
      }
    } catch { /* ignore */ }
  }, [apiOrigin]);

  useEffect(() => { loadCacheStats(); }, [loadCacheStats]);

  // Проверка подключения (через бэкенд прокси)
  const checkHealth = async () => {
    setIsCheckingHealth(true);
    setHealthResult(null);
    const startTime = Date.now();

    try {
      const resp = await fetch(`${apiOrigin}/api/sts/v1/info?system=${defaultSystem}`, {
        signal: AbortSignal.timeout(15000),
      });
      const responseTime = Date.now() - startTime;

      if (resp.ok) {
        const data = await resp.json();
        const stationCount = Array.isArray(data) ? data.length : 0;
        setHealthResult({
          ok: true,
          message: `${stationCount} станций, ${responseTime}мс`,
          responseTime,
        });
        toast({ title: 'STS API доступен', description: `${stationCount} станций, ${responseTime}мс` });
      } else {
        throw new Error(`HTTP ${resp.status}`);
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      setHealthResult({
        ok: false,
        message: error.message || 'Нет ответа',
        responseTime,
      });
      toast({ title: 'STS API недоступен', description: error.message, variant: 'destructive' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Открыть диалог параметров
  const openParamsDialog = (endpoint: ApiEndpoint) => {
    const params: Record<string, string> = {};
    endpoint.params.forEach(p => {
      let val = p.defaultValue || '';
      if (p.name === 'system') val = defaultSystem;
      if (p.name === 'station') val = defaultStation;
      if (p.name === 'dt_beg') val = yesterdayStr();
      if (p.name === 'dt_end') val = todayStr();
      params[p.name] = val;
    });

    setEditableParams(params);
    setEditableBody(endpoint.bodySchema ? JSON.stringify(endpoint.bodySchema, null, 2) : '');
    setSelectedEndpoint(endpoint);
    setIsParamsDialogOpen(true);
  };

  // Выполнить запрос
  const executeRequest = async (endpoint: ApiEndpoint, params: Record<string, string>, body?: string) => {
    setTestingEndpoint(endpoint.id);
    const startTime = Date.now();

    try {
      // Подставляем path-параметры
      let urlPath = endpoint.path;
      Object.entries(params).forEach(([key, value]) => {
        if (urlPath.includes(`{${key}}`)) {
          urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(value));
        }
      });

      // Собираем query-параметры (те, что не в URL)
      const url = new URL(`${apiOrigin}/api/sts${urlPath}`);
      Object.entries(params).forEach(([key, value]) => {
        if (!endpoint.path.includes(`{${key}}`) && value) {
          url.searchParams.set(key, value);
        }
      });

      const fetchOptions: RequestInit = {
        method: endpoint.method,
        signal: AbortSignal.timeout(30000),
      };

      if (endpoint.method === 'POST' && body) {
        fetchOptions.headers = { 'Content-Type': 'application/json' };
        fetchOptions.body = body;
      }

      const resp = await fetch(url.toString(), fetchOptions);
      const responseTime = Date.now() - startTime;

      let data: any;
      const contentType = resp.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await resp.json();
      } else {
        data = await resp.text();
      }

      const result: TestResult = {
        status: resp.status,
        statusText: resp.statusText,
        url: url.toString().replace(apiOrigin, ''),
        params,
        data,
        timestamp: new Date().toISOString(),
        success: resp.ok,
        responseTime,
      };

      setTestResults(prev => ({ ...prev, [endpoint.id]: result }));

      // Разворачиваем карточку чтобы показать результат
      setExpandedEndpoints(prev => new Set(prev).add(endpoint.id));

      const dataInfo = Array.isArray(data)
        ? `${data.length} элементов`
        : typeof data === 'object' && data
          ? `${Object.keys(data).length} полей`
          : '';

      toast({
        title: `${endpoint.method} ${urlPath}`,
        description: `${resp.status} ${resp.statusText} | ${responseTime}мс${dataInfo ? ` | ${dataInfo}` : ''}`,
        variant: resp.ok ? 'default' : 'destructive',
      });

      // Обновляем статистику кэша после запроса
      loadCacheStats();
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const result: TestResult = {
        status: 0,
        statusText: 'Error',
        url: `${apiOrigin}/api/sts${endpoint.path}`,
        params,
        data: { error: error.message },
        timestamp: new Date().toISOString(),
        success: false,
        responseTime,
      };

      setTestResults(prev => ({ ...prev, [endpoint.id]: result }));
      setExpandedEndpoints(prev => new Set(prev).add(endpoint.id));

      toast({
        title: `Ошибка: ${endpoint.method} ${endpoint.path}`,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const executeFromDialog = async () => {
    if (!selectedEndpoint) return;
    setIsParamsDialogOpen(false);
    await executeRequest(selectedEndpoint, editableParams, editableBody || undefined);
  };

  const toggleExpand = (id: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500/10 text-green-600 border-green-500/20 dark:text-green-400';
      case 'POST': return 'bg-primary/10 text-primary border-primary/20 dark:text-primary/70';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const groupIcon = (group: string) => {
    switch (group) {
      case 'Кэш': return <Database className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок */}
        <div className="mb-6 pt-4 px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-foreground">API СТС</h1>
          <p className="text-muted-foreground">
            Тестирование API торговой сети через серверный прокси (/api/sts/*)
          </p>
        </div>

        {/* Статус-карточки */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">STS API</CardTitle>
              {isCheckingHealth ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : healthResult?.ok ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : healthResult?.ok === false ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthResult?.ok === true ? 'ДОСТУПЕН' :
                 healthResult?.ok === false ? 'НЕДОСТУПЕН' : 'НЕ ПРОВЕРЕН'}
              </div>
              <p className="text-xs text-muted-foreground">
                {healthResult?.message || 'Нажмите "Проверить"'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Прокси-сервер</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">/api/sts/*</div>
              <p className="text-xs text-muted-foreground">
                JWT-авторизация автоматическая (бэкенд)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Кэш</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <>
                  <div className="text-2xl font-bold">{cacheStats.cache.keys}</div>
                  <p className="text-xs text-muted-foreground">
                    ключей | hit rate: {cacheStats.cache.hitRate} | uptime: {cacheStats.cache.uptime}
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Загрузка...</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Эндпоинтов</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{API_ENDPOINTS.length}</div>
              <p className="text-xs text-muted-foreground">
                {Object.keys(testResults).length} протестировано
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Параметры по умолчанию + действия */}
        <Card className="mx-4 md:mx-6 lg:mx-8 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Параметры тестирования
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Система (network)</Label>
                <Input
                  value={defaultSystem}
                  onChange={e => setDefaultSystem(e.target.value)}
                  placeholder="15"
                  className="h-8 w-24"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Станция (station)</Label>
                <Input
                  value={defaultStation}
                  onChange={e => setDefaultStation(e.target.value)}
                  placeholder="1"
                  className="h-8 w-24"
                />
              </div>
              <Button variant="outline" size="sm" onClick={checkHealth} disabled={isCheckingHealth}>
                <TestTube className="h-4 w-4 mr-2" />
                {isCheckingHealth ? 'Проверяю...' : 'Проверить STS'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadCacheStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить кэш
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setTestResults({}); toast({ title: 'Результаты очищены' }); }}
                disabled={Object.keys(testResults).length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Очистить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Эндпоинты по группам */}
        <div className="mx-4 md:mx-6 lg:mx-8 space-y-4 pb-8">
          {GROUPS.map(group => {
            const endpoints = API_ENDPOINTS.filter(e => e.group === group);
            if (endpoints.length === 0) return null;

            return (
              <Card key={group}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {groupIcon(group)}
                    {group}
                    <Badge variant="secondary" className="text-xs ml-1">{endpoints.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {endpoints.map(endpoint => (
                    <div key={endpoint.id} className="border rounded-lg">
                      {/* Строка эндпоинта */}
                      <div
                        className="p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between gap-2"
                        onClick={() => toggleExpand(endpoint.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className={`${getMethodColor(endpoint.method)} text-xs font-mono shrink-0`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono truncate">{endpoint.path}</code>
                          <span className="text-sm text-muted-foreground hidden md:inline truncate">{endpoint.summary}</span>
                          {endpoint.cacheTTL > 0 && (
                            <Badge variant="secondary" className="text-xs shrink-0">{formatTTL(endpoint.cacheTTL)}</Badge>
                          )}
                          {testResults[endpoint.id] && (
                            <Badge
                              variant={testResults[endpoint.id].success ? 'default' : 'destructive'}
                              className="text-xs shrink-0"
                            >
                              {testResults[endpoint.id].status} | {testResults[endpoint.id].responseTime}мс
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm" variant="outline"
                            onClick={e => { e.stopPropagation(); openParamsDialog(endpoint); }}
                            disabled={testingEndpoint === endpoint.id}
                            title="Настроить и выполнить"
                          >
                            {testingEndpoint === endpoint.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Edit3 className="h-3 w-3" />
                            )}
                          </Button>
                          {expandedEndpoints.has(endpoint.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Развёрнутые детали */}
                      {expandedEndpoints.has(endpoint.id) && (
                        <div className="border-t bg-muted/30 p-3 space-y-3">
                          <p className="text-sm text-muted-foreground">{endpoint.summary}</p>

                          {/* Параметры */}
                          {endpoint.params.length > 0 && (
                            <div>
                              <strong className="text-xs">Параметры:</strong>
                              <div className="mt-1 space-y-1">
                                {endpoint.params.map(p => (
                                  <div key={p.name} className="text-xs font-mono bg-background p-2 rounded border flex items-center gap-2">
                                    <span className="font-semibold">{p.name}</span>
                                    {p.required && <Badge variant="destructive" className="text-[10px] px-1 py-0">required</Badge>}
                                    <span className="text-muted-foreground">{p.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Кэш: {formatTTL(endpoint.cacheTTL)}
                          </div>

                          {/* Результат теста */}
                          {testResults[endpoint.id] && (
                            <div className="p-3 border rounded bg-background/50 space-y-2">
                              <div className="flex items-center gap-2">
                                <strong className="text-sm">Результат:</strong>
                                <Badge variant={testResults[endpoint.id].success ? 'default' : 'destructive'} className="text-xs">
                                  {testResults[endpoint.id].status} {testResults[endpoint.id].statusText}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {testResults[endpoint.id].responseTime}мс | {new Date(testResults[endpoint.id].timestamp).toLocaleTimeString('ru-RU')}
                                </span>
                              </div>

                              {Object.keys(testResults[endpoint.id].params).length > 0 && (
                                <div>
                                  <strong className="text-xs">Параметры:</strong>
                                  <div className="text-xs bg-muted/50 p-2 rounded mt-1 font-mono">
                                    {Object.entries(testResults[endpoint.id].params).map(([k, v]) => (
                                      <div key={k}><span className="text-primary">{k}</span>: {v}</div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                URL: {testResults[endpoint.id].url}
                              </div>

                              <div>
                                <strong className="text-xs">Ответ:</strong>
                                <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-48 overflow-y-auto">
                                  {typeof testResults[endpoint.id].data === 'string'
                                    ? testResults[endpoint.id].data
                                    : JSON.stringify(testResults[endpoint.id].data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Диалог параметров */}
        <Dialog open={isParamsDialogOpen} onOpenChange={setIsParamsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Параметры запроса
              </DialogTitle>
              {selectedEndpoint && (
                <DialogDescription className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`${getMethodColor(selectedEndpoint.method)} text-xs font-mono`}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-sm">/api/sts{selectedEndpoint.path}</code>
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-4">
              {Object.keys(editableParams).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Параметры</Label>
                  {Object.entries(editableParams).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={`p-${key}`} className="text-xs font-mono text-primary">{key}</Label>
                      <Input
                        id={`p-${key}`}
                        value={value}
                        onChange={e => setEditableParams(prev => ({ ...prev, [key]: e.target.value }))}
                        autoComplete="off"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedEndpoint?.method === 'POST' && editableBody && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Тело запроса (JSON)</Label>
                  <Textarea
                    className="font-mono text-xs min-h-[150px]"
                    value={editableBody}
                    onChange={e => setEditableBody(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsParamsDialogOpen(false)}>Отмена</Button>
              <Button onClick={executeFromDialog} disabled={testingEndpoint !== null}>
                <Send className="h-4 w-4 mr-2" />
                Выполнить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
