# Contributing to TradeControl Builder

Спасибо за ваш интерес к улучшению TradeControl Builder! Этот гайд поможет вам быстро начать работу с проектом.

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- npm 9+
- Git

### Установка
```bash
# Клонировать репозиторий
git clone <repository-url>
cd tradeframe-builder

# Установить зависимости
npm install

# Запустить development сервер
npm run dev
```

## 📁 Структура проекта

```
tradeframe-builder/
├── src/
│   ├── components/     # React компоненты
│   ├── pages/         # Страницы приложения
│   ├── services/      # API сервисы и бизнес-логика
│   ├── contexts/      # React контексты
│   ├── hooks/         # Кастомные React хуки
│   ├── types/         # TypeScript типы
│   └── utils/         # Утилиты
├── public/            # Статические файлы
├── archive/           # Архивированные компоненты
└── tools/             # Инструменты разработки
```

## 💻 Основные команды

```bash
# Разработка
npm run dev              # Запуск dev сервера
npm run dev:open         # Запуск dev сервера с автооткрытием браузера
npm run dev:host         # Запуск dev сервера с доступом по сети

# Сборка
npm run build            # Продакшн сборка
npm run build:dev        # Development сборка
npm run build:analyze    # Сборка с анализом bundle

# Качество кода
npm run lint             # Проверка ESLint
npm run lint:fix         # Автоисправление ESLint
npm run type-check       # Проверка TypeScript

# Утилиты
npm run clean            # Очистка кэша сборки
npm run preview          # Превью продакшн сборки
```

## 🏗️ Архитектура

### Технологический стек
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **State**: React Query + Context API
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6

### Паттерны кодирования

#### Компоненты
```typescript
// ✅ Хорошо: используйте именованные экспорты
export function ComponentName() {
  return <div>Component content</div>
}

// ✅ Хорошо: типизируйте props
interface Props {
  title: string
  isActive?: boolean
}

export function Component({ title, isActive = false }: Props) {
  return <div>{title}</div>
}
```

#### Сервисы
```typescript
// ✅ Хорошо: используйте объектную структуру
export const myService = {
  async getData(): Promise<DataType[]> {
    // implementation
  },

  async createData(data: CreateDataRequest): Promise<DataType> {
    // implementation
  }
}
```

#### Хуки
```typescript
// ✅ Хорошо: префикс use + описательное имя
export function useDataManagement() {
  const [data, setData] = useState<DataType[]>([])
  // hook logic
  return { data, setData, /* other methods */ }
}
```

## 🎨 Стилизация

### Tailwind CSS
- Используйте Tailwind утилиты для стилизации
- Избегайте кастомного CSS без необходимости
- Используйте `cn()` helper для условных классов

```typescript
import { cn } from "@/lib/utils"

// ✅ Хорошо
<div className={cn(
  "base-styles",
  isActive && "active-styles",
  variant === "primary" && "primary-styles"
)} />
```

### shadcn/ui компоненты
- Используйте готовые UI компоненты из `@/components/ui/`
- При необходимости кастомизации - создавайте wrapper компоненты

## 📝 Коммиты

### Формат коммитов
```
<type>(<scope>): <description>

<body>

<footer>
```

### Типы коммитов
- `feat`: новая функциональность
- `fix`: исправление бага
- `docs`: изменения в документации
- `style`: форматирование кода
- `refactor`: рефакторинг без изменения функциональности
- `perf`: улучшение производительности
- `test`: добавление/исправление тестов
- `chore`: обслуживание проекта

### Примеры
```
feat(components): добавить новый компонент для отображения графиков

fix(api): исправить ошибку валидации в endpoints пользователей

docs(readme): обновить инструкции по установке
```

## 🐛 Отладка

### VS Code
- Установите рекомендуемые расширения из `.vscode/extensions.json`
- Используйте настройки из `.vscode/settings.json`

### Chrome DevTools
- React Developer Tools
- Vite inspector доступен в dev режиме

### Логирование
```typescript
// ✅ Хорошо: используйте префиксы для категоризации
console.log('🎯 Network request:', data)
console.error('❌ API Error:', error)
console.warn('⚠️ Deprecated method used')
```

## 📋 Процесс разработки

### 1. Создание новой функции
```bash
# Создать новую ветку
git checkout -b feature/new-feature-name

# Внести изменения
# Протестировать локально

# Закоммитить изменения
git add .
git commit -m "feat: описание новой функции"

# Отправить PR
git push origin feature/new-feature-name
```

### 2. Исправление бага
```bash
# Создать ветку для исправления
git checkout -b fix/bug-description

# Исправить баг
# Протестировать исправление

# Закоммитить
git commit -m "fix: описание исправления"
```

### 3. Code Review
- Проверьте TypeScript ошибки: `npm run type-check`
- Проверьте ESLint: `npm run lint`
- Убедитесь что приложение собирается: `npm run build`
- Протестируйте функциональность вручную

## 🤝 Помощь

### Документация
- `CLAUDE.md` - инструкции для Claude Code
- `README.md` - основная документация проекта
- Код хорошо задокументирован комментариями

### Вопросы
- Создайте Issue в репозитории
- Опишите проблему подробно
- Приложите скриншоты если необходимо

### Предложения
- Обсудите крупные изменения в Issues перед реализацией
- Маленькие улучшения можно сразу делать через PR

---

**Удачного кодинга! 🚀**