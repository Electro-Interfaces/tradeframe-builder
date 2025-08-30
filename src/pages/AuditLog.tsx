import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Filter,
  Eye,
  Calendar as CalendarIcon,
  Shield,
  User,
  Clock,
  MapPin,
  Activity,
  Database,
  ChevronRight
} from "lucide-react";

// Mock audit events data
const auditEvents = [
  {
    id: 1,
    timestamp: new Date("2024-01-15T14:30:00"),
    user: {
      id: 1,
      name: "Иван Иванов",
      email: "ivan@company.com"
    },
    action: "Изменил цену на АИ-95",
    actionType: "price_change",
    object: "АЗС-5 на Ленина",
    objectType: "trading_point",
    ipAddress: "192.168.1.100",
    details: {
      before: { price: 51.50, currency: "RUB", fuelType: "АИ-95" },
      after: { price: 52.50, currency: "RUB", fuelType: "АИ-95" },
      reason: "Корректировка по рынку"
    },
    metadata: {
      sessionId: "sess_123456",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 2,
    timestamp: new Date("2024-01-15T13:45:00"),
    user: {
      id: 2,
      name: "Мария Петрова",
      email: "maria@company.com"
    },
    action: "Создала нового пользователя",
    actionType: "user_management",
    object: "Алексей Сидоров",
    objectType: "user",
    ipAddress: "192.168.1.101",
    details: {
      before: null,
      after: {
        name: "Алексей Сидоров",
        email: "alexey@company.com",
        role: "operator",
        status: "active",
        assignedPoints: ["АЗС-3 на Пушкина"]
      }
    },
    metadata: {
      sessionId: "sess_789012",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 3,
    timestamp: new Date("2024-01-15T12:20:00"),
    user: {
      id: 3,
      name: "Петр Смирнов",
      email: "petr@company.com"
    },
    action: "Удалил оборудование ТРК-1",
    actionType: "equipment_management",
    object: "ТРК-1 (ID: 12345)",
    objectType: "equipment",
    ipAddress: "192.168.1.102",
    details: {
      before: {
        name: "ТРК-1",
        type: "fuel_dispenser",
        status: "offline",
        location: "Стояка №1",
        serialNumber: "FD2024001"
      },
      after: null,
      reason: "Списание по износу"
    },
    metadata: {
      sessionId: "sess_345678",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 4,
    timestamp: new Date("2024-01-15T11:15:00"),
    user: {
      id: 1,
      name: "Иван Иванов",
      email: "ivan@company.com"
    },
    action: "Вошел в систему",
    actionType: "authentication",
    object: "Система TradeControl",
    objectType: "system",
    ipAddress: "192.168.1.100",
    details: {
      before: null,
      after: {
        loginMethod: "email_password",
        success: true,
        twoFactorUsed: false,
        deviceInfo: "Chrome 120 on Windows"
      }
    },
    metadata: {
      sessionId: "sess_123456",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 5,
    timestamp: new Date("2024-01-15T10:30:00"),
    user: {
      id: 4,
      name: "Анна Козлова",
      email: "anna@company.com"
    },
    action: "Изменила настройки сети",
    actionType: "network_settings",
    object: "Сеть Центр",
    objectType: "network",
    ipAddress: "192.168.1.103",
    details: {
      before: {
        autoUpdate: false,
        reportingInterval: 60,
        alertsEnabled: true
      },
      after: {
        autoUpdate: true,
        reportingInterval: 30,
        alertsEnabled: true
      },
      reason: "Оптимизация мониторинга"
    },
    metadata: {
      sessionId: "sess_901234",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 6,
    timestamp: new Date("2024-01-15T09:45:00"),
    user: {
      id: 5,
      name: "Дмитрий Волков",
      email: "dmitry@company.com"
    },
    action: "Добавил новую торговую точку",
    actionType: "network_settings",
    object: "АЗС-12 на Гагарина",
    objectType: "trading_point",
    ipAddress: "192.168.1.104",
    details: {
      before: null,
      after: {
        name: "АЗС-12 на Гагарина",
        address: "ул. Гагарина, 45",
        network: "Сеть Восток",
        status: "active",
        tankCount: 4
      }
    },
    metadata: {
      sessionId: "sess_567890",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Санкт-Петербург"
    }
  },
  {
    id: 7,
    timestamp: new Date("2024-01-15T08:30:00"),
    user: {
      id: 2,
      name: "Мария Петрова",
      email: "maria@company.com"
    },
    action: "Заблокировала пользователя",
    actionType: "user_management",
    object: "Сергей Попов",
    objectType: "user",
    ipAddress: "192.168.1.101",
    details: {
      before: {
        status: "active",
        lastLogin: "2024-01-14T18:20:00",
        failedLoginAttempts: 3
      },
      after: {
        status: "blocked",
        blockReason: "Подозрительная активность",
        blockedAt: "2024-01-15T08:30:00"
      },
      reason: "Превышено количество неудачных попыток входа"
    },
    metadata: {
      sessionId: "sess_789012",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 8,
    timestamp: new Date("2024-01-15T07:15:00"),
    user: {
      id: 6,
      name: "Елена Смирнова",
      email: "elena@company.com"
    },
    action: "Обновила уровни топлива в резервуаре",
    actionType: "equipment_management",
    object: "Резервуар №3 АИ-92",
    objectType: "tank",
    ipAddress: "192.168.1.105",
    details: {
      before: {
        fuelType: "АИ-92",
        volume: 15000,
        currentLevel: 8500,
        lastUpdated: "2024-01-14T23:45:00"
      },
      after: {
        fuelType: "АИ-92",
        volume: 15000,
        currentLevel: 12500,
        lastUpdated: "2024-01-15T07:15:00"
      },
      reason: "Поступление топлива от поставщика"
    },
    metadata: {
      sessionId: "sess_234567",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      location: "АЗС-5 на Ленина"
    }
  },
  {
    id: 9,
    timestamp: new Date("2024-01-14T23:45:00"),
    user: {
      id: 7,
      name: "Александр Федоров",
      email: "alex@company.com"
    },
    action: "Изменил цену на ДТ",
    actionType: "price_change",
    object: "АЗС-3 на Пушкина",
    objectType: "trading_point",
    ipAddress: "192.168.1.106",
    details: {
      before: { price: 58.90, currency: "RUB", fuelType: "ДТ" },
      after: { price: 59.50, currency: "RUB", fuelType: "ДТ" },
      reason: "Рост цен поставщика"
    },
    metadata: {
      sessionId: "sess_345678",
      userAgent: "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0",
      location: "АЗС-3 на Пушкина"
    }
  },
  {
    id: 10,
    timestamp: new Date("2024-01-14T22:30:00"),
    user: {
      id: 3,
      name: "Петр Смирнов",
      email: "petr@company.com"
    },
    action: "Выполнил диагностику ТРК-4",
    actionType: "equipment_management",
    object: "ТРК-4 (ID: 67890)",
    objectType: "equipment",
    ipAddress: "192.168.1.102",
    details: {
      before: {
        status: "warning",
        lastDiagnostic: "2024-01-10T15:00:00",
        errorCodes: ["E001", "W003"]
      },
      after: {
        status: "normal",
        lastDiagnostic: "2024-01-14T22:30:00",
        errorCodes: []
      },
      reason: "Плановое техническое обслуживание"
    },
    metadata: {
      sessionId: "sess_345678",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      location: "АЗС-7 на Гагарина"
    }
  },
  {
    id: 11,
    timestamp: new Date("2024-01-14T20:15:00"),
    user: {
      id: 8,
      name: "Ольга Николаева",
      email: "olga@company.com"
    },
    action: "Сгенерировала сменный отчет",
    actionType: "reports",
    object: "Смена 14.01.2024 (20:00-08:00)",
    objectType: "shift_report",
    ipAddress: "192.168.1.107",
    details: {
      before: null,
      after: {
        shiftDate: "2024-01-14",
        startTime: "20:00",
        endTime: "08:00",
        totalSales: 125000,
        fuelSold: 2500,
        transactions: 156
      }
    },
    metadata: {
      sessionId: "sess_456789",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "АЗС-1 на Московской"
    }
  },
  {
    id: 12,
    timestamp: new Date("2024-01-14T18:20:00"),
    user: {
      id: 9,
      name: "Сергей Попов",
      email: "sergey@company.com"
    },
    action: "Неудачная попытка входа в систему",
    actionType: "authentication",
    object: "Система TradeControl",
    objectType: "system",
    ipAddress: "85.143.45.123",
    details: {
      before: null,
      after: {
        loginMethod: "email_password",
        success: false,
        failureReason: "Неверный пароль",
        attemptNumber: 3
      }
    },
    metadata: {
      sessionId: null,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Неизвестно"
    }
  },
  {
    id: 13,
    timestamp: new Date("2024-01-14T16:45:00"),
    user: {
      id: 4,
      name: "Анна Козлова",
      email: "anna@company.com"
    },
    action: "Создала резервную копию базы данных",
    actionType: "system_maintenance",
    object: "База данных TradeControl",
    objectType: "database",
    ipAddress: "192.168.1.103",
    details: {
      before: {
        lastBackup: "2024-01-13T16:45:00",
        backupSize: "1.2GB"
      },
      after: {
        lastBackup: "2024-01-14T16:45:00",
        backupSize: "1.3GB",
        backupLocation: "/backups/2024-01-14_1645.sql"
      }
    },
    metadata: {
      sessionId: "sess_901234",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      location: "Москва"
    }
  },
  {
    id: 14,
    timestamp: new Date("2024-01-14T14:30:00"),
    user: {
      id: 10,
      name: "Михаил Лебедев",
      email: "mikhail@company.com"
    },
    action: "Назначил роль менеджера точки",
    actionType: "user_management",
    object: "Татьяна Белова",
    objectType: "user",
    ipAddress: "192.168.1.108",
    details: {
      before: {
        roles: ["operator"],
        permissions: ["transactions.create", "shifts.manage"]
      },
      after: {
        roles: ["operator", "point_manager"],
        permissions: ["transactions.create", "shifts.manage", "point.manage", "prices.edit", "reports.view"],
        assignedPoint: "АЗС-8 на Невском"
      },
      reason: "Повышение по службе"
    },
    metadata: {
      sessionId: "sess_567890",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: "Санкт-Петербург"
    }
  },
  {
    id: 15,
    timestamp: new Date("2024-01-14T12:00:00"),
    user: {
      id: 6,
      name: "Елена Смирнова",
      email: "elena@company.com"
    },
    action: "Обновила цены на все виды топлива",
    actionType: "price_change",
    object: "АЗС-5 на Ленина",
    objectType: "trading_point",
    ipAddress: "192.168.1.105",
    details: {
      before: {
        "АИ-92": 50.50,
        "АИ-95": 51.50,
        "АИ-98": 55.50,
        "ДТ": 58.90
      },
      after: {
        "АИ-92": 51.00,
        "АИ-95": 52.50,
        "АИ-98": 56.00,
        "ДТ": 59.50
      },
      reason: "Еженедельная корректировка цен"
    },
    metadata: {
      sessionId: "sess_234567",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      location: "АЗС-5 на Ленина"
    }
  }
];

// Mock users for filter
const allUsers = [
  { id: 1, name: "Иван Иванов", email: "ivan@company.com" },
  { id: 2, name: "Мария Петрова", email: "maria@company.com" },
  { id: 3, name: "Петр Смирнов", email: "petr@company.com" },
  { id: 4, name: "Анна Козлова", email: "anna@company.com" },
  { id: 5, name: "Дмитрий Волков", email: "dmitry@company.com" },
  { id: 6, name: "Елена Смирнова", email: "elena@company.com" },
  { id: 7, name: "Александр Федоров", email: "alex@company.com" },
  { id: 8, name: "Ольга Николаева", email: "olga@company.com" },
  { id: 9, name: "Сергей Попов", email: "sergey@company.com" },
  { id: 10, name: "Михаил Лебедев", email: "mikhail@company.com" }
];

// Action types for filter
const actionTypes = [
  { value: "all", label: "Все действия" },
  { value: "price_change", label: "Изменение цен" },
  { value: "user_management", label: "Управление пользователями" },
  { value: "equipment_management", label: "Работа с оборудованием" },
  { value: "authentication", label: "Аутентификация" },
  { value: "network_settings", label: "Настройки сети" },
  { value: "reports", label: "Отчеты" },
  { value: "system_maintenance", label: "Обслуживание системы" }
];

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
}

export default function AuditLog() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();

  // Filtered events based on filters
  const filteredEvents = useMemo(() => {
    return auditEvents.filter(event => {
      const matchesDateRange = (!dateRange.from || event.timestamp >= dateRange.from) &&
                               (!dateRange.to || event.timestamp <= dateRange.to);
      
      const matchesUser = selectedUser === "all" || event.user.id.toString() === selectedUser;
      
      const matchesActionType = selectedActionType === "all" || event.actionType === selectedActionType;
      
      const matchesSearch = searchTerm === "" ||
        event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.object.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesDateRange && matchesUser && matchesActionType && matchesSearch;
    });
  }, [dateRange, selectedUser, selectedActionType, searchTerm]);

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "price_change": return "💰";
      case "user_management": return "👥";
      case "equipment_management": return "⚙️";
      case "authentication": return "🔐";
      case "network_settings": return "🌐";
      case "reports": return "📊";
      case "system_maintenance": return "🛠️";
      default: return "📝";
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "price_change": return "bg-amber-100 text-amber-800";
      case "user_management": return "bg-blue-100 text-blue-800";
      case "equipment_management": return "bg-purple-100 text-purple-800";
      case "authentication": return "bg-green-100 text-green-800";
      case "network_settings": return "bg-cyan-100 text-cyan-800";
      case "reports": return "bg-indigo-100 text-indigo-800";
      case "system_maintenance": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewDetails = (event: any) => {
    setSelectedEvent(event);
    setDetailsOpen(true);
  };

  const applyFilters = () => {
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDateRange({
      from: subDays(new Date(), 7),
      to: new Date()
    });
    setSelectedUser("all");
    setSelectedActionType("all");
    setSearchTerm("");
  };

  const FilterPanel = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Date Range Picker */}
        <div className="space-y-2">
          <Label>Период</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
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

        {/* User Filter */}
        <div className="space-y-2">
          <Label>Пользователь</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Все пользователи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все пользователи</SelectItem>
              {allUsers.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Type Filter */}
        <div className="space-y-2">
          <Label>Тип события</Label>
          <Select value={selectedActionType} onValueChange={setSelectedActionType}>
            <SelectTrigger>
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

        {/* Search */}
        <div className="space-y-2">
          <Label>Поиск</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по действиям..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="flex gap-2">
          <Button onClick={applyFilters} className="flex-1">
            Применить
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            Сброс
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground flex items-center gap-3`}>
            <Shield className="h-8 w-8 text-primary" />
            Журнал аудита
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Полный лог всех действий пользователей в системе
          </p>
        </div>

        {/* Filters */}
        {isMobile ? (
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh]">
              <SheetHeader>
                <SheetTitle>Фильтры событий</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Фильтры
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FilterPanel />
              <div className="flex gap-2 mt-4">
                <Button onClick={applyFilters}>
                  Применить
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                События ({filteredEvents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* Mobile Cards */
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base flex items-center gap-2">
                              <span className="text-lg">{getActionTypeIcon(event.actionType)}</span>
                              {event.action}
                            </div>
                            <Badge className={`mt-1 text-xs ${getActionTypeColor(event.actionType)}`}>
                              {actionTypes.find(t => t.value === event.actionType)?.label}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleViewDetails(event)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {event.user.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(event.timestamp, "dd.MM.yyyy HH:mm", { locale: ru })}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {event.object}
                          </div>
                        </div>

                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleViewDetails(event)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Подробнее
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Desktop Table */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead>Объект</TableHead>
                      <TableHead>IP-адрес</TableHead>
                      <TableHead className="text-right">Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(event.timestamp, "dd.MM.yyyy HH:mm", { locale: ru })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.user.name}</div>
                            <div className="text-sm text-muted-foreground">{event.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getActionTypeIcon(event.actionType)}</span>
                            <div>
                              <div className="font-medium">{event.action}</div>
                              <Badge className={`text-xs ${getActionTypeColor(event.actionType)}`}>
                                {actionTypes.find(t => t.value === event.actionType)?.label}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{event.object}</div>
                          <div className="text-sm text-muted-foreground">{event.objectType}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.ipAddress}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleViewDetails(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет событий, соответствующих выбранным фильтрам</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className={`${isMobile ? "w-[95vw] h-[90vh]" : "max-w-4xl max-h-[80vh]"} overflow-hidden`}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-lg">{selectedEvent ? getActionTypeIcon(selectedEvent.actionType) : ''}</span>
                Детали события
              </DialogTitle>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="flex-1 overflow-auto space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ДЕЙСТВИЕ</Label>
                    <p className="font-medium">{selectedEvent.action}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ВРЕМЯ</Label>
                    <p className="font-medium">
                      {format(selectedEvent.timestamp, "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ПОЛЬЗОВАТЕЛЬ</Label>
                    <p className="font-medium">{selectedEvent.user.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.user.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IP-АДРЕС</Label>
                    <p className="font-mono font-medium">{selectedEvent.ipAddress}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ОБЪЕКТ</Label>
                    <p className="font-medium">{selectedEvent.object}</p>
                    <p className="text-sm text-muted-foreground">{selectedEvent.objectType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">МЕСТОПОЛОЖЕНИЕ</Label>
                    <p className="font-medium">{selectedEvent.metadata.location}</p>
                  </div>
                </div>

                {/* Changes */}
                {(selectedEvent.details.before || selectedEvent.details.after) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Изменения</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedEvent.details.before && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-muted-foreground">ДО</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                              {JSON.stringify(selectedEvent.details.before, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                      
                      {selectedEvent.details.after && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-muted-foreground">ПОСЛЕ</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                              {JSON.stringify(selectedEvent.details.after, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {selectedEvent.details.reason && (
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground">ПРИЧИНА</Label>
                        <p className="font-medium">{selectedEvent.details.reason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Technical Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Технические данные</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <pre className="text-xs bg-muted p-4 rounded overflow-auto">
                        {JSON.stringify(selectedEvent, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
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