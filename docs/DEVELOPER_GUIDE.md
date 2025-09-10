# 👨‍💻 Руководство разработчика TradeControl

## 🚀 Начало работы

### Требования к системе
- **Node.js** 18.0+ 
- **npm** 9.0+
- **Git** последняя версия
- **VS Code** (рекомендуемый редактор)

### Первый запуск

```bash
# 1. Клонирование репозитория
git clone <repository-url>
cd tradecontrol

# 2. Установка зависимостей
npm install

# 3. Настройка окружения
cp .env.example .env
# Отредактируйте .env файл

# 4. Запуск разработки
npm run dev
```

## 📁 Структура проекта

```
src/
├── components/          # React компоненты
│   ├── ui/             # shadcn/ui базовые компоненты
│   ├── layout/         # Макет (Header, Sidebar)
│   ├── forms/          # Формы и поля
│   ├── admin/          # Админ панель
│   └── common/         # Переиспользуемые компоненты
├── pages/              # Страницы приложения
├── services/           # API сервисы и бизнес логика
├── hooks/              # Кастомные React хуки
├── contexts/           # React контексты
├── types/              # TypeScript типы
├── utils/              # Утилиты и хелперы
├── styles/             # Глобальные стили
└── config/             # Конфигурация
```

## 🎯 Стандарты кодирования

### TypeScript

```typescript
// ✅ Хорошо - используйте строгую типизацию
interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

// ✅ Хорошо - используйте типы для пропсов
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  className?: string;
}

// ❌ Плохо - избегайте any
const handleSubmit = (data: any) => { ... }

// ✅ Хорошо - типизируйте все
const handleSubmit = (data: UserFormData) => { ... }
```

### React компоненты

```typescript
// ✅ Предпочитаемый стиль - функциональные компоненты с TypeScript
export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, className }) => {
  const [loading, setLoading] = useState(false);
  
  return (
    <Card className={cn("p-4", className)}>
      <h3>{user.name}</h3>
      <Button onClick={() => onEdit(user)}>
        Редактировать
      </Button>
    </Card>
  );
};

// ✅ Экспорт по умолчанию для страниц
export default function UsersPage() {
  return <UsersList />;
}
```

### Стили

```typescript
// ✅ Используйте Tailwind классы
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// ✅ Используйте cn() для условных классов
<Button className={cn(
  "px-4 py-2",
  variant === "primary" && "bg-blue-600",
  loading && "opacity-50 cursor-not-allowed"
)}>

// ❌ Избегайте inline стилей
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

## 🧩 Работа с компонентами

### Создание нового компонента

```bash
# Структура для нового компонента
src/components/users/
├── UserCard.tsx
├── UsersList.tsx
├── UserFormDialog.tsx
└── index.ts        # Экспорты
```

```typescript
// src/components/users/UserCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from '@/types/user';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex gap-2 mt-4">
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(user)}>
              Редактировать
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" onClick={() => onDelete(user.id)}>
              Удалить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Использование UI компонентов

```typescript
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// Формы с React Hook Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа'),
  email: z.string().email('Неверный email'),
});

export const UserForm = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Имя</Label>
          <Input
            {...form.register('name')}
            placeholder="Введите имя"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-500">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
      </div>
    </form>
  );
};
```

## 📡 Работа с API

### Создание сервиса

```typescript
// src/services/usersService.ts
import { supabase } from '@/lib/supabase';
import { User, CreateUserData, UpdateUserData } from '@/types/user';

export class UsersService {
  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('deleted_at', null);
    
    if (error) throw error;
    return data || [];
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...userData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const usersService = new UsersService();
```

### Использование React Query

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/usersService';
import { useToast } from '@/hooks/use-toast';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAllUsers(),
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: usersService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Успешно',
        description: 'Пользователь создан',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Использование в компоненте
export const UsersPage = () => {
  const { data: users, isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
```

## 🔒 Работа с аутентификацией

### Использование AuthContext

```typescript
import { useAuth } from '@/contexts/AuthContext';

export const SomeProtectedComponent = () => {
  const { user, hasPermission, canManageUsers } = useAuth();

  // Проверка авторизации
  if (!user) {
    return <div>Необходимо войти в систему</div>;
  }

  // Проверка разрешений
  if (!canManageUsers()) {
    return <div>Недостаточно прав доступа</div>;
  }

  return (
    <div>
      <h1>Привет, {user.name}!</h1>
      {hasPermission('users.create') && (
        <Button>Создать пользователя</Button>
      )}
    </div>
  );
};
```

### Создание защищенной страницы

```typescript
// src/pages/AdminPage.tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredPermissions={['admin.access']}>
      <div>
        <h1>Админ панель</h1>
        {/* Контент страницы */}
      </div>
    </ProtectedRoute>
  );
}
```

## 🧪 Тестирование

### Unit тесты

```typescript
// src/components/__tests__/UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserCard } from '../UserCard';

const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  roles: [],
};

describe('UserCard', () => {
  it('renders user information', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Редактировать'));
    expect(onEdit).toHaveBeenCalledWith(mockUser);
  });
});
```

### Запуск тестов

```bash
npm run test              # Все тесты
npm run test:watch        # Тесты в watch режиме
npm run test:coverage     # Тесты с покрытием
```

## 🔧 Debugging

### Инструменты разработчика

```typescript
// Debugging React Query
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </>
  );
}

// Debugging состояния
const [state, setState] = useState(initialState);
console.log('Current state:', state); // Удалите перед коммитом

// Используйте React Developer Tools
// Chrome extension для инспекции компонентов
```

### Диагностика базы данных

```bash
# Проверка таблиц
node tools/sql-direct.js tables

# Структура таблицы
node tools/sql-direct.js describe users

# Данные из таблицы
node tools/sql-direct.js select "users limit 10"

# Кастомный запрос
node tools/sql-direct.js select "SELECT COUNT(*) FROM users WHERE status='active'"
```

## 📦 Сборка и развертывание

### Development

```bash
npm run dev          # Запуск dev-сервера
npm run api:dev      # Запуск API сервера
npm run lint         # Проверка кода
npm run type-check   # Проверка типов
```

### Production

```bash
npm run build        # Сборка для продакшена
npm run preview      # Предпросмотр сборки
npm run build:analyze # Анализ размера bundle
```

### Развертывание

```bash
# Vercel
npm i -g vercel
vercel --prod

# Netlify
npm run build
# Загрузите папку dist в Netlify

# Docker
docker build -t tradecontrol .
docker run -p 3000:3000 tradecontrol
```

## 🔄 Git Workflow

### Ветки

```bash
main                 # Основная ветка (production)
develop             # Ветка разработки
feature/user-roles  # Ветки фич
bugfix/login-error  # Исправления багов
hotfix/critical-fix # Критические исправления
```

### Коммиты

```bash
# Используйте Conventional Commits
feat: add user roles management
fix: resolve login redirect issue
docs: update API documentation
style: format code with prettier
refactor: simplify user service logic
test: add user card component tests
```

### Pull Request процесс

1. Создайте ветку от `develop`
2. Внесите изменения и тесты
3. Убедитесь что `npm run lint` проходит
4. Создайте Pull Request в `develop`
5. Дождитесь ревью и одобрения
6. Merge в `develop`

## 📊 Performance

### Оптимизация компонентов

```typescript
// Используйте memo для предотвращения лишних рендеров
const UserCard = React.memo<UserCardProps>(({ user, onEdit }) => {
  return <Card>...</Card>;
});

// Используйте useMemo для тяжелых вычислений
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.name.localeCompare(b.name));
}, [users]);

// Используйте useCallback для стабильных функций
const handleEdit = useCallback((user: User) => {
  // логика обработки
}, []);
```

### Lazy loading

```typescript
// Ленивая загрузка страниц
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));

// Использование в роутинге
<Suspense fallback={<div>Загрузка...</div>}>
  <Routes>
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/users" element={<UsersPage />} />
  </Routes>
</Suspense>
```

## 🐛 Частые проблемы

### TypeScript ошибки

```typescript
// ❌ Проблема: Type 'string | undefined' is not assignable
const userId = user?.id;
doSomething(userId); // ошибка

// ✅ Решение: проверка или утверждение
if (userId) {
  doSomething(userId);
}
// или
doSomething(userId!); // только если уверены что не undefined
```

### React Query кэширование

```typescript
// ❌ Проблема: данные не обновляются
const { data } = useQuery(['users'], fetchUsers);

// ✅ Решение: инвалидация кэша
const mutation = useMutation(createUser, {
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
  }
});
```

### Supabase подключение

```bash
# Проблема: не подключается к базе
# Решение: проверьте переменные окружения
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Проверьте RLS политики
# Возможно политики блокируют доступ
```

## 📚 Полезные ресурсы

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Query](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)

## 🤝 Контрибуция

### Процесс внесения изменений

1. Изучите существующий код и архитектуру
2. Создайте Issue для обсуждения больших изменений
3. Форкните репозиторий
4. Создайте feature ветку
5. Следуйте стандартам кодирования
6. Добавьте тесты для новой функциональности
7. Обновите документацию при необходимости
8. Создайте Pull Request

### Code Review чеклист

- [ ] Код соответствует стандартам проекта
- [ ] Добавлены необходимые тесты
- [ ] Обновлена документация
- [ ] Проверена типизация TypeScript
- [ ] Нет нарушений линтера
- [ ] Проверена производительность
- [ ] Учтены edge cases
- [ ] Протестирована на разных устройствах