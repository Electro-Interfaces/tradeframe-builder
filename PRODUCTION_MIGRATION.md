# 🚀 План миграции на реальное API

## 📋 Текущее состояние

### ✅ Готово:
- [x] HTTP клиенты созданы (`src/services/httpClients.ts`)
- [x] Полная типизация TypeScript
- [x] Обработка ошибок в формате RFC 7807 (Problem Details)
- [x] Поддержка заголовков: `Idempotency-Key`, `X-Trace-Id`, `Authorization`
- [x] Интерфейсы соответствуют API спецификации
- [x] Mock API имитирует реальные сетевые задержки

### 🔧 Mock сервисы (будут заменены):
- `mockEquipmentAPI` → `httpEquipmentAPI`
- `mockComponentsAPI` → `httpComponentsAPI`
- `mockEquipmentTemplatesAPI` → `httpEquipmentTemplatesAPI`

## 📝 Шаги миграции

### Шаг 1: Замена Equipment API

**Файл:** `src/services/equipment.ts`

```typescript
// ЗАМЕНИТЬ:
export const currentEquipmentAPI = mockEquipmentAPI;
// НА:
export const currentEquipmentAPI = httpEquipmentAPI;

// ЗАМЕНИТЬ:
export const currentEquipmentTemplatesAPI = dynamicEquipmentTemplatesAPI;
// НА:
export const currentEquipmentTemplatesAPI = httpEquipmentTemplatesAPI;
```

### Шаг 2: Замена Components API  

**Файл:** `src/services/components.ts`

```typescript
// ЗАМЕНИТЬ:
export const currentComponentsAPI = mockComponentsAPI;
// НА: 
export const currentComponentsAPI = httpComponentsAPI;
```

### Шаг 3: Обновить Component Templates Store

**Файл:** `src/mock/componentTemplatesStore.ts`

```typescript
// ЗАМЕНИТЬ локальные данные на API вызовы:
export const componentTemplatesStore = {
  async getAll(): Promise<ComponentTemplate[]> {
    return httpComponentTemplatesAPI.list();
  },

  async getById(id: string): Promise<ComponentTemplate | null> {
    try {
      return await httpComponentTemplatesAPI.get(id);
    } catch (error) {
      return null;
    }
  },

  async getCompatibleTemplates(equipmentTemplateId: string): Promise<ComponentTemplate[]> {
    return httpComponentTemplatesAPI.list(equipmentTemplateId);
  }
};
```

### Шаг 4: Настройка переменных окружения

**Файл:** `.env` или `.env.production`

```bash
# API Configuration
VITE_API_URL=https://api.yourcompany.com/api/v1
VITE_APP_ENV=production

# Auth Configuration (если используется)
VITE_AUTH_ENABLED=true
VITE_AUTH_TOKEN_STORAGE=localStorage  # или sessionStorage
```

### Шаг 5: Удаление демо предупреждений

**Файлы для обновления:**
- `src/pages/Equipment.tsx` - убрать "⚠️ ДЕМО РЕЖИМ"
- `src/components/equipment/ComponentWizard.tsx` - убрать "(ДЕМО)" из заголовка

```typescript
// УБРАТЬ эти строки:
<div className="mt-3 text-xs text-amber-400 bg-amber-900/20 px-3 py-1 rounded border border-amber-500/20">
  ⚠️ ДЕМО РЕЖИМ: Данные не сохраняются между сессиями
</div>
```

### Шаг 6: Обновление обработки ошибок

**Файл:** `src/pages/Equipment.tsx`

```typescript
// Добавить обработку специфичных HTTP ошибок:
const handleApiError = (error: HttpApiError) => {
  if (error.isAuthError()) {
    // Перенаправить на страницу входа
    router.push('/login');
    return;
  }
  
  if (error.isValidationError()) {
    // Показать детальные ошибки валидации
    toast({
      title: "Ошибка валидации",
      description: error.problemDetails.detail,
      variant: "destructive"
    });
    return;
  }
  
  if (error.isServerError()) {
    // Системная ошибка
    toast({
      title: "Системная ошибка", 
      description: "Попробуйте позже или обратитесь в поддержку",
      variant: "destructive"
    });
    return;
  }
  
  // Общая обработка
  toast({
    title: "Ошибка",
    description: error.message,
    variant: "destructive"
  });
};
```

## 🔗 API Endpoints (должны быть реализованы на backend)

### Equipment API:
- `GET /api/v1/equipment?trading_point_id=...&status=...&search=...`
- `POST /api/v1/equipment`
- `GET /api/v1/equipment/{id}`
- `PATCH /api/v1/equipment/{id}`
- `POST /api/v1/equipment/{id}:enable`
- `POST /api/v1/equipment/{id}:disable`
- `POST /api/v1/equipment/{id}:archive`
- `GET /api/v1/equipment/{id}/events`

### Equipment Templates API:
- `GET /api/v1/equipment-templates`
- `GET /api/v1/equipment-templates/{id}`

### Components API:
- `GET /api/v1/components?equipment_id=...&status=...&search=...`
- `POST /api/v1/components`
- `GET /api/v1/components/{id}`
- `PATCH /api/v1/components/{id}`
- `POST /api/v1/components/{id}:enable`
- `POST /api/v1/components/{id}:disable`
- `POST /api/v1/components/{id}:archive`

### Component Templates API:
- `GET /api/v1/component-templates?equipment_template_id=...`
- `GET /api/v1/component-templates/{id}`

## 🔒 Безопасность

### Заголовки запросов:
- `Authorization: Bearer <token>` - для аутентификации
- `Idempotency-Key: <unique-id>` - для мутирующих операций
- `X-Trace-Id: <trace-id>` - для трейсинга
- `Accept: application/problem+json` - для обработки ошибок

### CORS настройки:
```typescript
// Backend должен поддерживать:
Access-Control-Allow-Origin: https://yourfrontend.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type, Idempotency-Key, X-Trace-Id
Access-Control-Allow-Credentials: true
```

## 📊 База данных (должна быть создана)

### Таблицы:
```sql
-- Equipment
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  trading_point_id UUID NOT NULL,
  template_id UUID NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'offline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Equipment Templates  
CREATE TABLE equipment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  name VARCHAR(255) NOT NULL,
  technical_code VARCHAR(100) NOT NULL,
  system_type VARCHAR(100) NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Components
CREATE TABLE components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  trading_point_id UUID NOT NULL,
  equipment_id UUID NOT NULL,
  template_id UUID NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  serial_number VARCHAR(100),
  params JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  template_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Component Templates
CREATE TABLE component_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  params_schema JSONB NOT NULL,
  defaults JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipment-Component Compatibility
CREATE TABLE equipment_component_compat (
  equipment_template_id UUID NOT NULL,
  component_template_id UUID NOT NULL,
  PRIMARY KEY (equipment_template_id, component_template_id)
);
```

## ✅ Чеклист готовности к production

- [ ] Backend API реализован с всеми endpoints
- [ ] База данных создана и настроена
- [ ] CORS настроен корректно
- [ ] Аутентификация работает
- [ ] SSL сертификаты установлены
- [ ] Переменные окружения настроены
- [ ] Frontend собран для production (`npm run build`)
- [ ] Демо предупреждения удалены
- [ ] HTTP клиенты подключены
- [ ] Error handling протестирован
- [ ] Логирование настроено

## 🔧 Команды для миграции

```bash
# 1. Обновить переменные окружения
cp .env.example .env.production

# 2. Заменить API клиенты в коде
# (выполнить шаги 1-3 из плана выше)

# 3. Собрать production версию
npm run build

# 4. Тестирование с реальным API
npm run preview

# 5. Деплой
npm run deploy
```

## 🎯 Результат

После выполнения всех шагов:
- ✅ Frontend работает с реальным API
- ✅ Данные сохраняются в базе данных
- ✅ Многопользовательский режим
- ✅ Полный audit trail  
- ✅ Правильная обработка ошибок
- ✅ Безопасность и авторизация
- ✅ Готовность к production нагрузкам