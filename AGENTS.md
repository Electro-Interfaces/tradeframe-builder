# Repository Guidelines for AI Agents

## Project Overview
**TradeControl Builder** — платформа управления торговыми сетями АЗС.
- **Frontend:** Vite + React 18 + TypeScript
- **Backend:** Express.js (server/)
- **Database:** PostgreSQL (pg)
- **UI:** Tailwind CSS + shadcn/ui (Radix)

## Project Structure
```
src/
├── components/     # UI компоненты (PascalCase.tsx)
├── pages/          # Роутинговые страницы
├── hooks/          # React хуки (use*.ts)
├── services/       # API и бизнес-логика (*Service.ts)
├── contexts/       # React контексты (*Context.tsx)
├── types/          # TypeScript типы (*.ts)
├── config/         # Конфигурация
└── utils/          # Утилиты (camelCase.ts)

server/
├── routes/         # Express роуты (*.js)
├── services/       # Backend сервисы
└── index.js        # Entry point
```

## Build, Lint & Test Commands

### Development
```bash
npm run dev              # Vite dev server (localhost:3000)
npm run dev:host         # Dev с внешним доступом
```

### Build
```bash
npm run build            # GitHub Pages (test environment)
npm run build:prod       # Production build
npm run build:dev        # Development build
```

### Linting & Type Checking
```bash
npm run lint             # ESLint проверка
npm run lint:fix         # ESLint с автофиксом
npm run type-check       # TypeScript проверка (tsc --noEmit)
```

### Testing
```bash
npm test                 # Placeholder (тесты не настроены)
# Будущие тесты: Vitest для unit, Playwright для e2e
# Размещение: src/__tests__/*.test.tsx или рядом с компонентами
```

### Backend (server/)
```bash
cd server && npm install && npm start   # Запуск Express
npm run start:prod                       # PM2 production
```

## Code Style Guidelines

### EditorConfig
- **Indent:** 2 spaces (JS/TS/JSON/CSS), 4 spaces (Python)
- **Line endings:** LF
- **Charset:** UTF-8
- **Trailing whitespace:** trim (кроме .md)
- **Final newline:** yes

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| React компоненты | PascalCase | `TankCard.tsx` |
| Хуки | use* camelCase | `useTanks.ts` |
| Сервисы | *Service camelCase | `tanksService.ts` |
| Утилиты | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `Tank`, `TankProps` |
| Constants | UPPER_SNAKE | `CACHE_TTL`, `API_URL` |
| CSS classes | kebab-case (Tailwind) | `text-slate-400` |

### Import Order (группировать с пустой строкой между)
```typescript
// 1. React/external libraries
import { useState, useEffect, memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases (@/)
import { Button } from '@/components/ui/button';
import { tanksService } from '@/services/tanksService';
import type { Tank } from '@/types/tanks';

// 3. Relative imports
import { LocalComponent } from './LocalComponent';
```

### TypeScript Patterns
```typescript
// Интерфейсы для props
interface UseTanksOptions {
  networkId?: string;
  tradingPointId?: string;
  autoLoad?: boolean;
}

// Явные return types для публичных функций
async function getTanks(id: string): Promise<Tank[]> { ... }

// Type imports отдельно
import type { Tank, TankEvent } from '@/types/tanks';

// Избегать any, но проект допускает (noImplicitAny: false)
// Предпочитать unknown + type guards
```

### React Patterns
```typescript
// Мемоизация для производительности
const TanksList = memo(({ tanks }: Props) => ( ... ));

// Хуки с options object
export function useTanks(options: UseTanksOptions = {}): UseTanksReturn {
  const { networkId, autoLoad = true } = options;
  // ...
}

// Параллельные запросы вместо последовательных
const [network, point] = await Promise.all([
  networksService.getById(networkId),
  tradingPointsService.getById(pointId)
]);
```

### Error Handling
```typescript
// Frontend: try-catch + toast уведомления
try {
  const data = await tanksService.getTanks(networkId, tradingPointId);
  setTanks(data);
} catch (err) {
  const error = err instanceof Error ? err : new Error('Неизвестная ошибка');
  setError(error);
  toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
}

// Backend: конкретные сообщения об ошибках
if (!STS_API_URL || !STS_API_USERNAME) {
  throw new Error('Missing required STS API environment variables');
}
```

### Service Class Pattern
```typescript
/**
 * Сервис для работы с резервуарами
 * JSDoc комментарии на русском
 */
class TanksService {
  /**
   * Получить резервуары через Backend Proxy
   */
  async getTanks(networkId: string, tradingPointId: string): Promise<Tank[]> {
    // Валидация параметров
    if (!networkId || !tradingPointId) {
      throw new Error('Не указаны сеть или торговая точка');
    }
    // ...
  }
}

export const tanksService = new TanksService();
```

## Commit Guidelines (Conventional Commits)
```bash
feat(tanks): добавить калибровку резервуаров
fix(notifications): исправить дублирование уведомлений
refactor(auth): упростить проверку прав
docs: обновить README
chore: обновить зависимости
```

**Scopes:** tanks, auth, notifications, prices, shifts, equipment, api, ui

## Environment Variables
- `VITE_*` — доступны в браузере
- Без префикса — только backend (server/)
- Секреты НЕ коммитить, использовать `.env.local`

## Agent-Specific Notes
- **Язык:** Комментарии, сообщения, коммиты — на русском
- **Lint перед коммитом:** `npm run lint:fix && npm run type-check`
- **API:** Все запросы через Backend Proxy (server/routes/sts.js)
- **Кэширование:** NodeCache на backend, React Query на frontend
- **PWA:** Service Worker отключен в dev mode

## Строгие запреты

### Код
- **НЕ добавлять `console.log()`, `console.info()`, `console.warn()`** в код
- Отладочные выводы только по явному запросу пользователя
- После отладки — удалять все console.*

### Серверы и терминалы
- **Запускать серверы по запросу пользователя** в фоновом режиме
- Порядок запуска: СНАЧАЛА backend (3001), ПОТОМ frontend (3000)
- Использовать `start /B` для фонового запуска без новых окон

### Архитектура (два сервера)
```
Backend (порт 3001)  →  cd server && node index.js
Frontend (порт 3000) →  npm run dev

Порядок: СНАЧАЛА backend, ПОТОМ frontend
```
- Frontend проксирует `/api/*` на backend через Vite proxy
- Без backend — ошибки 500 на всех API запросах

### Запуск серверов (команды для агента)

**1. Запуск backend (порт 3001):**
```powershell
powershell -Command "Start-Process -NoNewWindow -FilePath 'node' -ArgumentList 'index.js' -WorkingDirectory 'D:\Users\magsp\ELSYPLUS\TradeControl\server'"
```

**2. Запуск frontend (порт 3000):**
```powershell
powershell -Command "Start-Process -NoNewWindow -FilePath 'cmd' -ArgumentList '/c','npm run dev' -WorkingDirectory 'D:\Users\magsp\ELSYPLUS\TradeControl'"
```

**3. Проверка портов:**
```powershell
powershell -Command "Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | Select-Object LocalPort,State,OwningProcess"
```

**4. После запуска — вывести кликабельные ссылки:**
```markdown
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
```

### Перезапуск серверов с очисткой кэша

**1. Остановить процессы на портах:**
```powershell
powershell -Command "Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

**2. Очистить кэш Vite:**
```bash
rm -rf node_modules/.vite
```
(Backend NodeCache сбрасывается при рестарте автоматически)

**3. Запустить серверы заново** (команды выше)

**4. Вывести ссылки** (см. выше)
