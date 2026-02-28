import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Search,
  Eye,
  Calendar as CalendarIcon,
  Activity,
  DollarSign,
  Users,
  Settings,
  Lock,
  Globe,
  FileText,
  Wrench,
  AlertCircle
} from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { auditLogService } from "@/services/auditLogService";
import type { AuditLogEntry } from "@/types/audit";

// Типы действий для фильтра
const actionTypes = [
  { value: "all", label: "Все действия" },
  { value: "price_change", label: "Изменение цен" },
  { value: "user_management", label: "Управление пользователями" },
  { value: "equipment_management", label: "Работа с оборудованием" },
  { value: "authentication", label: "Аутентификация" },
  { value: "network_settings", label: "Настройки сети" },
  { value: "reports", label: "Отчеты" },
  { value: "system_maintenance", label: "Обслуживание системы" },
  { value: "legal_documents", label: "Правовые документы" },
  { value: "api_config", label: "Настройка API" }
];

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
}

export default function AuditLog() {
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const isMobile = useIsMobile();

  // Загрузка данных при монтировании
  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем записи аудита
      const logs = await auditLogService.getAuditLogs({
        limit: 1000
      });

      if (logs && logs.length >= 0) {
        setEvents(logs);
        setTableExists(true);
      } else {
        setTableExists(false);
      }
    } catch (err: any) {
      console.error('Ошибка загрузки журнала аудита:', err);

      // Проверяем, является ли это ошибкой отсутствия таблицы
      if (err.message && (err.message.includes('404') || err.message.includes('does not exist'))) {
        setTableExists(false);
        setError('Таблица audit_log не создана');
      } else {
        setError(err.message || 'Ошибка загрузки данных');
        setTableExists(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация событий
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      const matchesDateRange = (!dateRange.from || eventDate >= dateRange.from) &&
                               (!dateRange.to || eventDate <= dateRange.to);

      const matchesActionType = selectedActionType === "all" || event.action_type === selectedActionType;

      const matchesSearch = searchTerm === "" ||
        event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.object?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDateRange && matchesActionType && matchesSearch;
    });
  }, [events, dateRange, selectedActionType, searchTerm]);

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "price_change": return DollarSign;
      case "user_management": return Users;
      case "equipment_management": return Settings;
      case "authentication": return Lock;
      case "network_settings": return Globe;
      case "reports": return FileText;
      case "system_maintenance": return Wrench;
      case "legal_documents": return FileText;
      case "api_config": return Settings;
      default: return Activity;
    }
  };

  const handleViewDetails = (event: AuditLogEntry) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  const applyFilters = () => {
    // Фильтры применяются автоматически через useMemo
  };

  const resetFilters = () => {
    setDateRange({
      from: subDays(new Date(), 7),
      to: new Date()
    });
    setSelectedActionType("all");
    setSearchTerm("");
  };

  // Если таблица не создана, показываем инструкцию
  if (tableExists === false) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
                <p className="text-muted-foreground mt-2">Полный лог всех действий пользователей в системе</p>
              </div>
              <HelpButton route="/admin/audit" variant="text" size="sm" className="flex-shrink-0" />
            </div>
          </div>

          <div className="bg-card rounded-lg p-8">
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-foreground" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Таблица журнала аудита не создана
              </h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Для начала работы журнала аудита необходимо применить SQL миграцию в Supabase.
              </p>

              <div className="bg-secondary rounded-lg p-6 text-left w-full mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">📋 Инструкция по применению миграции:</h3>
                <ol className="space-y-3 text-foreground/80">
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">1.</span>
                    <span>
                      Откройте{" "}
                      <a
                        href={`https://supabase.com/dashboard/project/${(import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').split('.')[0]}/sql/new`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Supabase SQL Editor
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">2.</span>
                    <span>Откройте файл <code className="bg-secondary px-2 py-1 rounded text-sm">migrations/create-audit-log-table.sql</code> в редакторе кода</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">3.</span>
                    <span>Скопируйте весь SQL код из файла</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">4.</span>
                    <span>Вставьте в Supabase SQL Editor</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">5.</span>
                    <span>Нажмите <strong>Run</strong> или <kbd className="bg-secondary px-2 py-1 rounded text-sm">Ctrl+Enter</kbd></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold mr-2">6.</span>
                    <span>Обновите эту страницу</span>
                  </li>
                </ol>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => window.open(`https://supabase.com/dashboard/project/${(import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').split('.')[0]}/sql/new`, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Открыть SQL Editor
                </Button>
                <Button
                  onClick={loadAuditLogs}
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                >
                  Проверить снова
                </Button>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Состояние загрузки
  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
            <p className="text-muted-foreground mt-2">Загрузка данных...</p>
          </div>
          <div className="bg-card rounded-lg p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загружаем журнал аудита...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Состояние ошибки
  if (error && tableExists !== false) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
          </div>
          <div className="bg-card rounded-lg p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-foreground" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Ошибка загрузки данных</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={loadAuditLogs} className="bg-blue-600 hover:bg-blue-700">
                Попробовать снова
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
              <p className="text-muted-foreground mt-2">Полный лог всех действий пользователей в системе</p>
            </div>
            <HelpButton route="/admin/audit" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель фильтров */}
        <div className="bg-card mb-6 w-full">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-foreground text-sm">🔍</span>
                </div>
                <h2 className="text-lg font-semibold text-foreground">События аудита</h2>
                <div className="text-sm text-muted-foreground">
                  Всего событий: {filteredEvents.length}
                </div>
              </div>
              <Button
                onClick={loadAuditLogs}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-secondary"
              >
                Обновить
              </Button>
            </div>

            {/* Фильтры */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-foreground/80 text-sm mb-2 block">Период</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-secondary border-border text-foreground hover:bg-secondary",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd.MM.yyyy", { locale: ru })} -{" "}
                              {format(dateRange.to, "dd.MM.yyyy", { locale: ru })}
                            </>
                          ) : (
                            format(dateRange.from, "dd.MM.yyyy", { locale: ru })
                          )
                        ) : (
                          <span>Выберите период</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по действиям..."
                    className="pl-10 bg-secondary border-border text-foreground placeholder-muted-foreground"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                    <SelectTrigger className="bg-secondary border-border text-foreground">
                      <SelectValue placeholder="Все действия" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 md:col-span-2">
                  <Button
                    onClick={applyFilters}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                  >
                    Применить
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="border-border text-foreground hover:bg-secondary"
                  >
                    Сброс
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Таблица событий */}
        {filteredEvents.length === 0 ? (
          <div className="bg-card w-full">
            <div className="px-4 md:px-6 pb-6">
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-foreground text-2xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  События не найдены
                </h3>
                <p className="text-muted-foreground">
                  {events.length === 0
                    ? "Журнал аудита пуст. События будут появляться после входа в систему, изменения цен и других действий."
                    : "Нет событий, соответствующих выбранным фильтрам"
                  }
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card w-full">
            <div className="hidden md:block w-full">
              <div className="overflow-x-auto w-full rounded-lg border border-border">
                <table className="w-full text-sm min-w-full table-fixed">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-4 text-left text-foreground font-medium" style={{width: '15%'}}>ДАТА И ВРЕМЯ</th>
                      <th className="px-6 py-4 text-left text-foreground font-medium" style={{width: '20%'}}>ПОЛЬЗОВАТЕЛЬ</th>
                      <th className="px-6 py-4 text-left text-foreground font-medium" style={{width: '25%'}}>ДЕЙСТВИЕ</th>
                      <th className="px-6 py-4 text-left text-foreground font-medium" style={{width: '20%'}}>ОБЪЕКТ</th>
                      <th className="px-6 py-4 text-left text-foreground font-medium" style={{width: '12%'}}>IP-АДРЕС</th>
                      <th className="px-6 py-4 text-right text-foreground font-medium" style={{width: '8%'}}>ДЕТАЛИ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {filteredEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b border-border cursor-pointer hover:bg-secondary transition-colors"
                      >
                        <td className="px-4 md:px-6 py-4">
                          <div className="text-foreground font-mono text-sm">
                            {format(new Date(event.timestamp), "dd.MM.yyyy HH:mm", { locale: ru })}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div>
                            <div className="font-medium text-foreground text-base">{event.user_name || 'Неизвестно'}</div>
                            <div className="text-sm text-muted-foreground">{event.user_email}</div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const IconComponent = getActionTypeIcon(event.action_type);
                              return <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
                            })()}
                            <div>
                              <div className="font-medium text-foreground text-base">{event.action}</div>
                              <Badge variant="outline" className="text-xs bg-secondary text-foreground border-border mt-1">
                                {actionTypes.find(t => t.value === event.action_type)?.label || event.action_type}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div>
                            <div className="font-medium text-foreground text-base">{event.object || '-'}</div>
                            <div className="text-sm text-muted-foreground">{event.object_type || '-'}</div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <code className="bg-secondary text-foreground px-2 py-1 rounded text-xs font-mono">
                            {event.ip_address || '-'}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleViewDetails(event)}
                              title="Подробности события"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Мобильная версия */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-secondary rounded-lg p-4 hover:bg-secondary transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(event)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {(() => {
                          const IconComponent = getActionTypeIcon(event.action_type);
                          return <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />;
                        })()}
                        <div className="font-medium text-foreground text-base truncate">{event.action}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <div>{event.user_name || 'Неизвестно'} • {event.user_email}</div>
                        <div className="font-mono">{format(new Date(event.timestamp), "dd.MM.yyyy HH:mm", { locale: ru })}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <div>Объект: {event.object || '-'}</div>
                        <div>IP: <code className="bg-secondary px-1 rounded text-xs">{event.ip_address || '-'}</code></div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-secondary text-foreground border-border">
                        {actionTypes.find(t => t.value === event.action_type)?.label || event.action_type}
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(event);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Диалог с деталями события */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className={`${isMobile ? "w-[95vw] h-[90vh]" : "max-w-4xl max-h-[80vh]"} overflow-hidden`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {(() => {
                  const IconComponent = selectedEvent ? getActionTypeIcon(selectedEvent.action_type) : Activity;
                  return <IconComponent className="h-5 w-5 text-muted-foreground" />;
                })()}
                Детали события
              </DialogTitle>
            </DialogHeader>

            {selectedEvent && (
              <div className="flex-1 overflow-auto space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ДЕЙСТВИЕ</Label>
                    <p className="font-medium">{selectedEvent.action}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ВРЕМЯ</Label>
                    <p className="font-medium">
                      {format(new Date(selectedEvent.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ПОЛЬЗОВАТЕЛЬ</Label>
                    <p className="font-medium">{selectedEvent.user_name || 'Неизвестно'}</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.user_email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IP-АДРЕС</Label>
                    <p className="font-mono font-medium">{selectedEvent.ip_address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ОБЪЕКТ</Label>
                    <p className="font-medium">{selectedEvent.object || '-'}</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.object_type || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ТИП ДЕЙСТВИЯ</Label>
                    <p className="font-medium">
                      {actionTypes.find(t => t.value === selectedEvent.action_type)?.label || selectedEvent.action_type}
                    </p>
                  </div>
                </div>

                {selectedEvent.details && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Детали</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                          {JSON.stringify(selectedEvent.details, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedEvent.metadata && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Метаданные</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                          {JSON.stringify(selectedEvent.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Закрыть
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
