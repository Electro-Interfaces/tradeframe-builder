# 🏗️ Архитектура TradeControl

## Обзор системы

TradeControl построен как современное одностраничное приложение (SPA) с использованием React и TypeScript. Система следует принципам компонентной архитектуры и разделения ответственности.

## 🎯 Архитектурные принципы

- **Компонентный подход** - Переиспользуемые React компоненты
- **Типизация** - Строгая типизация с TypeScript
- **Реактивность** - React Query для управления состоянием сервера
- **Модульность** - Четкое разделение по функциональным модулям
- **Accessibility** - Поддержка всех устройств и возможностей

## 📁 Структура проекта

```
src/
├── components/           # React компоненты
│   ├── ui/              # Базовые UI компоненты (shadcn/ui)
│   ├── layout/          # Компоненты макета (Header, Sidebar, etc.)
│   ├── admin/           # Компоненты администрирования
│   ├── forms/           # Формы и поля ввода
│   ├── charts/          # Графики и визуализации
│   └── common/          # Общие компоненты
├── pages/               # Компоненты страниц (роутинг)
├── services/            # Бизнес-логика и API клиенты
├── contexts/            # React контексты (состояние приложения)
├── hooks/               # Кастомные React хуки
├── types/               # TypeScript определения типов
├── utils/               # Утилиты и хелперы
├── styles/              # Глобальные стили
└── config/              # Конфигурация приложения
```

## 🎨 UI/UX Архитектура

### Дизайн-система
- **Компонентная библиотека**: shadcn/ui
- **Стилизация**: Tailwind CSS
- **Темизация**: CSS переменные + Tailwind
- **Типографика**: Системные шрифты
- **Цветовая схема**: Темная тема по умолчанию

### Адаптивность
```typescript
// Breakpoints
sm: '640px'   // Мобильные устройства
md: '768px'   // Планшеты
lg: '1024px'  // Десктопы
xl: '1280px'  // Большие экраны
2xl: '1536px' // Очень большие экраны
```

### Компоненты макета
- `Header` - Навигация и профиль пользователя
- `AppSidebar` - Основное меню приложения  
- `MainLayout` - Базовый макет для всех страниц
- `ProtectedRoute` - Защищенные роуты с авторизацией

## 📊 Управление состоянием

### Локальное состояние
- **useState** - Для простого локального состояния
- **useReducer** - Для сложной логики состояния
- **Custom hooks** - Переиспользуемая логика

### Глобальное состояние
- **React Context** - Для аутентификации и настроек
- **React Query** - Для серверного состояния
- **localStorage** - Для персистентных настроек

### Управление формами
```typescript
// React Hook Form + Zod
const form = useForm<FormData>({
  resolver: zodResolver(validationSchema),
  defaultValues: initialValues
});
```

## 🗄️ Архитектура данных

### База данных (PostgreSQL)
```sql
-- Основные таблицы
users                 -- Пользователи системы
networks              -- Торговые сети
trading_points        -- Торговые точки (АЗС)
equipment             -- Оборудование
equipment_templates   -- Шаблоны оборудования
prices               -- Цены на топливо
```

### API слой
```typescript
// services/
├── authService.ts        # Аутентификация
├── networksService.ts    # Работа с сетями
├── usersService.ts       # Управление пользователями
├── pricesService.ts      # Управление ценами
└── adminApiClient.ts     # HTTP-клиент для backend API
```

### Кэширование данных
```typescript
// React Query конфигурация
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 минут
      cacheTime: 10 * 60 * 1000,    // 10 минут
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
});
```

## 🔐 Безопасность

### Аутентификация
- **JWT аутентификация** - Через Express backend (server/services/auth/)
- **Custom Auth Context** - Управление сессией на фронтенде
- **requireAuth middleware** - Проверка Bearer-токена на каждом запросе
- **Refresh tokens** - Автоматическое обновление

### Авторизация
```typescript
// Система ролей
type UserRole = 
  | 'super_admin'     // Полный доступ
  | 'network_admin'   // Управление сетью
  | 'point_manager'   // Управление точкой
  | 'operator'        // Операции
  | 'driver';         // Сливы топлива

// Проверка разрешений
const hasPermission = (permission: string): boolean => {
  return user?.permissions.includes(permission) || 
         user?.permissions.includes('all');
};
```

### Валидация данных
```typescript
// Zod схемы валидации
const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['admin', 'manager', 'operator'])
});
```

## 🛣️ Роутинг

### Структура маршрутов
```typescript
// App.tsx
const routes = {
  '/': 'Главная',
  '/network/overview': 'Обзор сети',
  '/network/operations-transactions': 'Операции',
  '/point/prices': 'Цены',
  '/point/tanks': 'Резервуары', 
  '/point/equipment': 'Оборудование',
  '/admin/users-and-roles': 'Пользователи',
  '/admin/roles': 'Роли',
  '/settings/*': 'Настройки'
};
```

### Защищенные роуты
```typescript
<ProtectedRoute>
  <AdminRoute>
    <UsersPage />
  </AdminRoute>
</ProtectedRoute>
```

## 📱 PWA и мобильная оптимизация

### Service Worker
- Кэширование статических ресурсов
- Offline функциональность (частичная)
- Push уведомления (заготовка)

### Мобильные возможности
```typescript
// hooks/useMobile.ts
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile };
};
```

## 🔄 Жизненный цикл данных

### 1. Загрузка данных
```typescript
// React Query hook
const { data, loading, error } = useQuery({
  queryKey: ['networks'],
  queryFn: networksService.getAllNetworks,
  staleTime: 5 * 60 * 1000
});
```

### 2. Мутации данных
```typescript
const mutation = useMutation({
  mutationFn: networksService.createNetwork,
  onSuccess: () => {
    queryClient.invalidateQueries(['networks']);
    toast.success('Сеть создана успешно');
  },
  onError: (error) => {
    toast.error(`Ошибка: ${error.message}`);
  }
});
```

### 3. Оптимистичные обновления
```typescript
const optimisticMutation = useMutation({
  mutationFn: updateNetwork,
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['networks']);
    const previousData = queryClient.getQueryData(['networks']);
    queryClient.setQueryData(['networks'], (old) => 
      updateOptimistically(old, newData)
    );
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['networks'], context.previousData);
  }
});
```

## 🧪 Тестирование

### Структура тестов
```
tests/
├── unit/               # Юнит-тесты компонентов
├── integration/        # Интеграционные тесты
├── e2e/               # End-to-end тесты
└── __mocks__/         # Моки для тестов
```

### Тестовый стек
- **Jest** - Тест раннер
- **React Testing Library** - Тестирование компонентов
- **MSW** - Mock Service Worker для API
- **Cypress** - E2E тестирование (планируется)

## 📈 Производительность

### Оптимизации
- **Code splitting** - Ленивая загрузка роутов
- **Bundle optimization** - Tree shaking
- **Image optimization** - Lazy loading изображений
- **Memoization** - React.memo для компонентов
- **Virtual scrolling** - Для больших списков

### Метрики производительности
- **Bundle size** - Отслеживание размера сборки
- **Load time** - Время загрузки страниц
- **Core Web Vitals** - LCP, FID, CLS
- **Memory usage** - Мониторинг утечек памяти

## 🔧 Инструменты разработки

### Development Tools
- **Vite** - Быстрый dev server и сборщик
- **TypeScript** - Статическая типизация
- **ESLint** - Линтинг кода
- **Prettier** - Форматирование кода

### Database Tools
```bash
# SQL Direct Access
node tools/sql-direct.js tables
node tools/sql-direct.js describe users
node tools/sql-direct.js select networks
```

## 📦 Деплоймент

### Build процесс
```bash
npm run build:prod      # Production сборка
npm run preview         # Локальный preview
npm run build:analyze   # Анализ bundle
```

### CI/CD Pipeline
1. **Lint & Test** - Проверка кода и тесты
2. **Build** - Сборка приложения  
3. **Deploy** - Автоматический деплой
4. **Health Check** - Проверка работоспособности

### Environments
- **Development** - Локальная разработка
- **Staging** - Тестовая среда
- **Production** - Продуктивная среда

## 🎯 Планы развития

### Ближайшие задачи
- Реализация неиспользуемых модулей
- Улучшение offline функциональности  
- Добавление unit тестов
- Оптимизация производительности

### Долгосрочные планы
- Микрофронтенд архитектура
- GraphQL API
- Расширенная аналитика
- Мобильное приложение