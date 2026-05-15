import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertCircle,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { auditLogService } from "@/services/auditLogService";
import type { AuditLogEntry } from "@/types/audit";
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from "@/components/common/filterPanel";

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

function formatDateTime(value: string, withSeconds = false): string {
  return format(new Date(value), withSeconds ? "dd.MM.yyyy HH:mm:ss" : "dd.MM.yyyy HH:mm", { locale: ru });
}

function formatInteger(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function hasDeviation(event: AuditLogEntry): boolean {
  return event.details?.success === false
    || Boolean(event.details?.error)
    || event.action.toLowerCase().includes("неудач");
}

function getActionTypeLabel(actionType: string): string {
  return actionTypes.find((type) => type.value === actionType)?.label || actionType;
}

function getStatusBadgeClass(event: AuditLogEntry): string {
  return hasDeviation(event)
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    : "bg-secondary text-foreground border-border";
}

function getStatusLabel(event: AuditLogEntry): string {
  return hasDeviation(event) ? "Отклонение" : "Норма";
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
                <p className="text-muted-foreground mt-2">Полный лог всех действий пользователей в системе</p>
              </div>
              <HelpButton route="/admin/audit" variant="text" size="sm" className="flex-shrink-0" />
            </div>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-6 md:p-8">
              <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">
                  Таблица журнала аудита не создана
                </h2>
                <p className="mb-6 text-lg text-muted-foreground">
                  Для начала работы журнала аудита необходимо применить миграции PostgreSQL.
                </p>

                <div className="mb-6 w-full rounded-xl border border-border bg-muted/30 p-6 text-left">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Инструкция по применению миграции</h3>
                  <div className="space-y-3 text-foreground/80">
                    <div>1. Откройте backend-окружение проекта</div>
                    <div>2. Убедитесь, что задан <code className="rounded bg-secondary px-2 py-1 text-sm">DATABASE_URL</code></div>
                    <div>3. Выполните <code className="rounded bg-secondary px-2 py-1 text-sm">npm --prefix server run db:migrate</code></div>
                    <div>4. После применения миграций обновите эту страницу</div>
                  </div>
                </div>

                <Button onClick={loadAuditLogs} variant="outline">
                  Проверить снова
                </Button>
              </div>
            </CardContent>
          </Card>
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
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Загружаем журнал аудита...</p>
            </div>
            </CardContent>
          </Card>
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
          <Card className="border-border bg-card">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="mb-3 text-2xl font-semibold text-foreground">Ошибка загрузки данных</h2>
                <p className="mb-6 text-muted-foreground">{error}</p>
                <Button onClick={loadAuditLogs} variant="outline">
                  Попробовать снова
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Журнал аудита</h1>
              <p className="text-muted-foreground mt-2">Полный лог всех действий пользователей в системе</p>
            </div>
            <HelpButton route="/admin/audit" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель фильтров */}
        <div className={`${FILTER_PANEL_CLASS} mb-6`}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
              <span className="text-sm text-muted-foreground">
                Найдено: {formatInteger(filteredEvents.length)}
              </span>
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label className="text-xs text-muted-foreground">Период</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      `${FILTER_PANEL_CONTROL_CLASS} w-full justify-start text-left font-normal hover:bg-secondary`,
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd.MM.yyyy", { locale: ru })} - {" "}
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
                <PopoverContent className="w-auto border-border bg-card p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={isMobile ? 1 : 2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[240px]`}>
              <Label htmlFor="audit-search" className="text-xs text-muted-foreground">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-search"
                  placeholder="Действие, пользователь, объект"
                  className={`${FILTER_PANEL_CONTROL_CLASS} pl-10`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="audit-action-type" className="text-xs text-muted-foreground">Тип действия</Label>
              <Select value={selectedActionType} onValueChange={setSelectedActionType}>
                <SelectTrigger id="audit-action-type" className={FILTER_PANEL_CONTROL_CLASS}>
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

            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:flex-none sm:min-w-[220px] sm:self-end`}>
              <div className="flex gap-2">
                <Button onClick={resetFilters} variant="outline" className="flex-1 sm:flex-none">
                  Сбросить
                </Button>
                <Button onClick={loadAuditLogs} variant="outline" className="flex-1 sm:flex-none">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Обновить
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Таблица событий */}
        {filteredEvents.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <EmptyState
                className="py-16"
                title="События не найдены"
                description={events.length === 0
                  ? "Журнал аудита пуст. События будут появляться после входа в систему, изменения цен и других действий."
                  : "Нет событий, соответствующих выбранным фильтрам"}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Дата и время</TableHead>
                      <TableHead className="w-[220px]">Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead className="w-[220px]">Объект</TableHead>
                      <TableHead className="w-[140px]">IP-адрес</TableHead>
                      <TableHead className="w-[80px] text-right">Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const IconComponent = getActionTypeIcon(event.action_type);

                      return (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer"
                          onClick={() => handleViewDetails(event)}
                        >
                          <TableCell className="whitespace-nowrap font-mono text-foreground/80">
                            {formatDateTime(event.timestamp)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{event.user_name || 'Неизвестно'}</div>
                              <div className="text-sm text-muted-foreground">{event.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <IconComponent className={cn("mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground", hasDeviation(event) && "text-red-600 dark:text-red-400")} />
                              <div className="min-w-0 space-y-1">
                                <div className="font-medium text-foreground">{event.action}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge variant="outline" className="border-border bg-secondary text-foreground">
                                    {getActionTypeLabel(event.action_type)}
                                  </Badge>
                                  <Badge className={getStatusBadgeClass(event)}>
                                    {getStatusLabel(event)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-foreground">{event.object || '—'}</div>
                              <div className="text-sm text-muted-foreground">{event.object_type || '—'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-foreground/80">
                            {event.ip_address || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(event);
                              }}
                              title="Подробности события"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Событие</TableHead>
                      <TableHead className="w-[88px] text-right">Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => {
                      const IconComponent = getActionTypeIcon(event.action_type);

                      return (
                        <TableRow
                          key={event.id}
                          className="cursor-pointer align-top"
                          onClick={() => handleViewDetails(event)}
                        >
                          <TableCell className="align-top">
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <IconComponent className={cn("mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground", hasDeviation(event) && "text-red-600 dark:text-red-400")} />
                                <div className="min-w-0 space-y-1">
                                  <div className="font-medium text-foreground">{event.action}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {event.user_name || 'Неизвестно'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="border-border bg-secondary text-foreground">
                                  {getActionTypeLabel(event.action_type)}
                                </Badge>
                                <Badge className={getStatusBadgeClass(event)}>
                                  {getStatusLabel(event)}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="font-mono">{formatDateTime(event.timestamp)}</div>
                                <div>{event.user_email}</div>
                                <div>Объект: {event.object || '—'}</div>
                                <div className="font-mono">IP: {event.ip_address || '—'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(event);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Диалог с деталями события */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className={`${isMobile ? "h-[90vh] w-[95vw]" : "max-h-[80vh] max-w-4xl"} overflow-hidden border-border bg-card`}>
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
                      {formatDateTime(selectedEvent.timestamp, true)}
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
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="border-border bg-secondary text-foreground">
                        {getActionTypeLabel(selectedEvent.action_type)}
                      </Badge>
                      <Badge className={getStatusBadgeClass(selectedEvent)}>
                        {getStatusLabel(selectedEvent)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedEvent.details && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Детали</h3>
                    <Card className="border-border bg-card">
                      <CardContent className="pt-4">
                        <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs text-foreground/90">
                          {JSON.stringify(selectedEvent.details, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedEvent.metadata && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Метаданные</h3>
                    <Card className="border-border bg-card">
                      <CardContent className="pt-4">
                        <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs text-foreground/90">
                          {JSON.stringify(selectedEvent.metadata, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-4">
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
