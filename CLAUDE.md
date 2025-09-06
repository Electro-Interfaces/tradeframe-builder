# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌐 Language Settings

**ВАЖНО**: Общение с пользователем ведется **ТОЛЬКО НА РУССКОМ ЯЗЫКЕ**. Все ответы, комментарии, вопросы и объяснения должны быть на русском.

## 🎨 Design System

**ВАЖНО**: Приложение использует **ТЕМНУЮ ТЕМУ** по умолчанию. Все компоненты должны быть оптимизированы для темной темы с соответствующей цветовой палитрой.

## 🚨 КРИТИЧЕСКИ ВАЖНАЯ АРХИТЕКТУРНАЯ ИНФОРМАЦИЯ

**ПРОЕКТ ИСПОЛЬЗУЕТ ПРЯМОЕ ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ SUPABASE - БЕЗ ПРОМЕЖУТОЧНЫХ API СЕРВЕРОВ!**

Весь доступ к данным осуществляется через прямые Supabase клиентские подключения, настроенные в слое сервисов. Никаких промежуточных API серверов или Express endpoints не используется.

## 🚀 Auto-Start Instructions

При каждом запуске Claude Code в этом проекте:
1. **Проверить статус frontend сервера**: `netstat -ano | findstr :3000`
2. **Если frontend не запущен**: автоматически запустить `npm run dev` (порт 3000)
3. **Предоставить пользователю ссылку**: 
   - Frontend: http://localhost:3000/

## 🔒 Project Constraints & Rules

### Обязательные ограничения:
- ❌ НЕ создавать новые файлы без явной необходимости
- ❌ НЕ создавать документацию (.md файлы) без прямого запроса
- ❌ ЗАПРЕЩЕНО создавать mock-данные или mock-сервисы
- ✅ ВСЕГДА предпочитать редактирование существующих файлов
- ✅ ВСЕГДА использовать существующие UI компоненты из `src/components/ui/`
- ✅ ВСЕГДА следовать TypeScript и React конвенциям проекта
- ✅ ВСЕГДА использовать Tailwind CSS для стилизации

### Архитектурные принципы:
- Использовать React Query для работы с API
- Применять shadcn/ui компоненты
- Следовать паттернам роутинга в App.tsx

## 🗄️ Архитектура данных - ТОЛЬКО ПРЯМЫЕ ПОДКЛЮЧЕНИЯ

### База данных Supabase:
- ✅ **ТОЛЬКО ПРЯМЫЕ подключения к Supabase** через клиентские библиотеки
- ✅ Все сервисы в `src/services/` работают напрямую с Supabase
- ✅ Аутентификация через Supabase Auth
- ❌ **НИКАКИХ Express API серверов или промежуточных endpoints**
- ❌ **ЗАПРЕЩЕНО** использовать HTTP клиенты для внутренних данных

### API торговой сети (внешние системы):
- ✅ **Только для внешних торговых сетей** - настраивается в разделе "Обмен данными"
- ✅ HTTP клиенты только для внешних API, не для внутренних данных
- ✅ Конфигурация внешних API в системных настройках

### 📡 Конфигурация внешних подключений:
**ВСЕ параметры подключения к внешним API и базе данных настраиваются в разделе "Обмен данными":**
- **Внешние API**: URL, токены, методы аутентификации
- **База данных Supabase**: URL проекта, ключи доступа (anon/service)
- **Маппинг данных**: Соответствие внешних и внутренних ID
- **Синхронизация**: Интервалы и правила обновления данных

### Ключевые файлы архитектуры:
- `src/services/supabaseAuthService.ts` - прямая аутентификация Supabase
- `src/services/*SupabaseService.ts` - все сервисы с прямыми Supabase подключениями
- Раздел "Обмен данными" в UI - настройки ТОЛЬКО для внешних систем

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview
```

## 🗄️ Database Tools for Claude Code Agents

### SQL Direct Access Tool
**Location**: `tools/sql-direct.js`  
**Purpose**: Прямой доступ к базе данных Supabase для всех агентов

```bash
# Quick database diagnostics
node tools/sql-direct.js tables                    # List all tables
node tools/sql-direct.js describe equipment_templates  # Table structure  
node tools/sql-direct.js select equipment_templates    # Sample data

# Integration in code
import { executeSelect, describeTable } from './tools/sql-direct.js';
```

**Key Database Facts**:
- ✅ **Schema**: Uses `is_active` (boolean), NOT `status` (string)
- ✅ **IDs**: All UUIDs, not strings 
- ✅ **Access**: Service Role Key for development (full access)
- ✅ **Tables**: 8 main tables available (equipment_templates, equipment, networks, etc.)

See `tools/README.md` for complete documentation.

## Architecture Overview

This is a React-based trading platform UI built with:
- **Vite** - Build tool and dev server
- **React 18** with TypeScript
- **React Router v6** - Routing with pages in `src/pages/`
- **shadcn/ui components** - UI components in `src/components/ui/`
- **Tailwind CSS** - Styling with custom trade platform colors
- **React Query (TanStack Query)** - Data fetching and caching
- **React Hook Form + Zod** - Form handling and validation

## Project Structure

### Key Directories
- `src/pages/` - Route components mapped in App.tsx
- `src/components/` - Reusable components organized by feature
- `src/services/` - API clients and service layer
- `src/contexts/` - React contexts (Auth, Selection)
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions

### Routing Pattern
All routes are defined in `src/App.tsx`:
- Admin routes: `/admin/*`
- Settings routes: `/settings/*`
- Network routes: `/network/*`
- Point routes: `/point/*`

### Интеграция данных
- **Прямые Supabase клиенты** во всех сервисах `src/services/`
- **HTTP клиенты только для внешних систем** в `src/services/httpClients.ts`
- **Никаких mock сервисов** - только реальные Supabase данные
- **Аутентификация через Supabase Auth**, не через localStorage токены

## Component Patterns

### UI Components
- All UI primitives from shadcn/ui in `src/components/ui/`
- Follow existing patterns when creating new components
- Use CVA (class-variance-authority) for component variants
- Leverage Tailwind utility classes with `cn()` helper

### Form Components
- Use React Hook Form with Zod schemas
- Form components use the `<Form>` wrapper from `src/components/ui/form.tsx`
- Validation schemas should be defined with Zod

### Получение данных
- **React Query hooks для Supabase запросов**, не для API вызовов
- **Слой сервисов работает напрямую с Supabase**, не с HTTP запросами
- **Loading states** обрабатываются Skeleton компонентами
- **Error states** используют ErrorState/EmptyState компоненты

## TypeScript Configuration

- Path alias `@/*` maps to `./src/*`
- Relaxed TypeScript settings (no implicit any, unused params allowed)
- Type definitions should be in `src/types/`

## Styling Conventions

- Tailwind CSS for all styling
- Custom theme colors: trade.blue, trade.purple, trade.green, trade.orange
- Status colors: success, warning, error
- Container width set to 100% with 1.5rem padding
- Use existing shadow and border radius variables

## Important Notes

- This is a Lovable.dev project with automatic Git sync
- Component tagger active in development mode
- **ПРЯМОЕ подключение к Supabase - БЕЗ Express серверов**
- **Развертывание только frontend приложения - серверная часть в Supabase**