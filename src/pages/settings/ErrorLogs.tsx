/**
 * СТРАНИЦА ЖУРНАЛА ОШИБОК СИСТЕМЫ
 * 
 * Отображает все критические ошибки физической торговой системы
 * Позволяет администраторам отслеживать и решать проблемы
 */

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  RefreshCw,
  Calendar,
  Filter,
  Eye,
  Check,
  X
} from "lucide-react";

import { errorLogService, ErrorLogEntry, ErrorLogFilters } from "@/services/errorLogService";
import { HelpButton } from "@/components/help/HelpButton";
import { useAuth } from "@/contexts/AuthContext";

export default function ErrorLogs() {
  const { user } = useAuth();
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    errors: 0,
    warnings: 0,
    unresolved: 0,
    today: 0,
  });

  // Фильтры
  const [filters, setFilters] = useState<ErrorLogFilters>({});
  const [selectedError, setSelectedError] = useState<ErrorLogEntry | null>(null);

  useEffect(() => {
    loadErrorLogs();
    loadStats();
  }, []);

  const loadErrorLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const logs = await errorLogService.getErrorLogs(filters, 500);
      setErrorLogs(logs);
    } catch (err) {
      setError(`Не удалось загрузить журнал ошибок: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await errorLogService.getErrorStats();
      setStats(statistics);
    } catch (err) {
      console.error('Не удалось загрузить статистику ошибок:', err);
    }
  };

  const handleResolveError = async (errorId: string) => {
    if (!user?.id) return;

    try {
      await errorLogService.resolveError(errorId, user.id);
      await loadErrorLogs();
      await loadStats();
      setSelectedError(null);
    } catch (err) {
      setError(`Не удалось отметить ошибку как решенную: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`);
    }
  };

  const handleApplyFilters = () => {
    loadErrorLogs();
  };

  const handleClearFilters = () => {
    setFilters({});
    setTimeout(loadErrorLogs, 100);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'warning':
        return <Info className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      'critical': 'destructive',
      'error': 'secondary',
      'warning': 'outline'
    } as const;

    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Заголовок */}
          <div className="mb-6 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Журнал ошибок системы</h1>
                <p className="text-slate-400 mt-2">
                  Мониторинг критических ошибок торговой системы
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadErrorLogs} disabled={loading} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
                <HelpButton route="/settings/error-logs" variant="text" className="flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-slate-400 text-sm">Всего записей</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                  <p className="text-slate-400 text-sm">Критические</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{stats.errors}</p>
                  <p className="text-slate-400 text-sm">Ошибки</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{stats.warnings}</p>
                  <p className="text-slate-400 text-sm">Предупреждения</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{stats.unresolved}</p>
                  <p className="text-slate-400 text-sm">Не решены</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats.today}</p>
                  <p className="text-slate-400 text-sm">Сегодня</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Фильтры */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="level-filter" className="text-slate-300">Уровень</Label>
                  <Select value={filters.level || ""} onValueChange={(value) => setFilters({...filters, level: value as any})}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Все уровни" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все уровни</SelectItem>
                      <SelectItem value="critical">Критические</SelectItem>
                      <SelectItem value="error">Ошибки</SelectItem>
                      <SelectItem value="warning">Предупреждения</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service-filter" className="text-slate-300">Сервис</Label>
                  <Input
                    id="service-filter"
                    placeholder="Название сервиса"
                    value={filters.service || ""}
                    onChange={(e) => setFilters({...filters, service: e.target.value})}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>

                <div>
                  <Label htmlFor="resolved-filter" className="text-slate-300">Статус</Label>
                  <Select value={filters.resolved?.toString() || ""} onValueChange={(value) => setFilters({...filters, resolved: value ? value === 'true' : undefined})}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все статусы</SelectItem>
                      <SelectItem value="false">Не решены</SelectItem>
                      <SelectItem value="true">Решены</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleApplyFilters} size="sm" className="flex-1">
                    Применить
                  </Button>
                  <Button onClick={handleClearFilters} variant="outline" size="sm">
                    Сбросить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ошибки загрузки */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Таблица ошибок */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                История ошибок ({errorLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <RefreshCw className="h-6 w-6 animate-spin mr-3 text-blue-400" />
                  <span className="text-white">Загрузка журнала ошибок...</span>
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="text-center p-6">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">Ошибки не найдены</p>
                  <p className="text-slate-400">Система работает стабильно</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">Время</TableHead>
                        <TableHead className="text-slate-300">Уровень</TableHead>
                        <TableHead className="text-slate-300">Сервис</TableHead>
                        <TableHead className="text-slate-300">Операция</TableHead>
                        <TableHead className="text-slate-300">Сообщение</TableHead>
                        <TableHead className="text-slate-300">Статус</TableHead>
                        <TableHead className="text-slate-300">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map((log) => (
                        <TableRow key={log.id} className="border-slate-600">
                          <TableCell className="text-slate-300 text-xs">
                            {formatTimestamp(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getLevelIcon(log.level)}
                              {getLevelBadge(log.level)}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {log.service}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {log.operation}
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-md truncate">
                            {log.error_message}
                          </TableCell>
                          <TableCell>
                            {log.resolved ? (
                              <Badge variant="outline" className="text-green-400 border-green-400">
                                Решено
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-400 border-red-400">
                                Открыто
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedError(log)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Детали ошибки</DialogTitle>
                                  </DialogHeader>
                                  {selectedError && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-slate-300">Время</Label>
                                          <p className="text-white">{formatTimestamp(selectedError.timestamp)}</p>
                                        </div>
                                        <div>
                                          <Label className="text-slate-300">Уровень</Label>
                                          <div className="flex items-center gap-2 mt-1">
                                            {getLevelIcon(selectedError.level)}
                                            {getLevelBadge(selectedError.level)}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <Label className="text-slate-300">Сообщение об ошибке</Label>
                                        <p className="text-white bg-slate-700 p-3 rounded mt-2">
                                          {selectedError.error_message}
                                        </p>
                                      </div>

                                      {selectedError.error_stack && (
                                        <div>
                                          <Label className="text-slate-300">Stack Trace</Label>
                                          <Textarea
                                            value={selectedError.error_stack}
                                            readOnly
                                            className="bg-slate-700 text-slate-300 font-mono text-xs mt-2"
                                            rows={10}
                                          />
                                        </div>
                                      )}

                                      {selectedError.metadata && (
                                        <div>
                                          <Label className="text-slate-300">Метаданные</Label>
                                          <pre className="text-slate-300 bg-slate-700 p-3 rounded text-xs mt-2">
                                            {JSON.stringify(selectedError.metadata, null, 2)}
                                          </pre>
                                        </div>
                                      )}

                                      <div className="flex justify-between items-center pt-4">
                                        {!selectedError.resolved && (
                                          <Button
                                            onClick={() => handleResolveError(selectedError.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Check className="h-4 w-4 mr-2" />
                                            Отметить как решено
                                          </Button>
                                        )}
                                        
                                        {selectedError.resolved && (
                                          <div className="text-green-400 text-sm">
                                            Решено {selectedError.resolved_at ? formatTimestamp(selectedError.resolved_at) : ''}
                                            {selectedError.resolved_by && ` пользователем ${selectedError.resolved_by}`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {!log.resolved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResolveError(log.id)}
                                  className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}