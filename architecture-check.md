# ✅ Архитектурная проверка: Шаблоны vs Экземпляры

## Проверено: Четкое разделение сущностей

### 1. **ШАБЛОНЫ** (Templates) - изменяемые, хранятся в базе

#### EquipmentTemplate
```typescript
interface EquipmentTemplate {
  id: EquipmentTemplateId;
  name: string;                    // Техническое название
  display_name: string;           // Отображаемое название
  system_type: string;            // Тип системы
  status: boolean;                // Активен/неактивен
  is_system: boolean;             // Системный (нельзя удалить)
  default_params: Record<string, any>;  // Параметры по умолчанию
  required_params: string[];      // Обязательные параметры
  // + метаданные создания/изменения
}
```

#### ComponentTemplate  
```typescript
interface ComponentTemplate {
  id: ComponentTemplateId;
  code: string;                   // Уникальный код
  name: string;                   // Техническое название
  display_name: string;           // Отображаемое название
  category: string;               // Категория
  system_type: string;            // Тип системы
  status: boolean;                // Активен/неактивен
  is_system: boolean;             // Системный
  defaults: Record<string, any>;  // Параметры по умолчанию
  required_params: string[];      // Обязательные параметры
  // + метаданные создания/изменения
}
```

### 2. **ЭКЗЕМПЛЯРЫ** (Instances) - независимые копии

#### Equipment (независимый экземпляр)
```typescript
interface Equipment {
  id: EquipmentId;
  trading_point_id: TradingPointId;
  
  // ⭐ СКОПИРОВАННЫЕ данные из шаблона (НЕ ССЫЛКИ!)
  name: string;                   // Из template.name
  display_name: string;           // Пользовательское название
  system_type: string;            // Из template.system_type
  
  // ⭐ УНИКАЛЬНЫЕ данные экземпляра
  serial_number?: string;
  status: EquipmentStatus;
  installation_date?: string;
  
  // ⭐ ПАРАМЕТРЫ - объединение template.default_params + custom_params
  params: Record<string, any>;
  
  // ⭐ ИСТОРИЯ создания (НЕ ЗАВИСИМОСТЬ!)
  created_from_template?: string; // Только для истории
  
  // НЕТ template_id! ❌
}
```

#### Component (независимый экземпляр)
```typescript
interface Component {
  id: ComponentId;
  trading_point_id: string;
  equipment_id: string;
  
  // ⭐ СКОПИРОВАННЫЕ данные из шаблона (НЕ ССЫЛКИ!)
  name: string;                   // Из template.name
  display_name: string;           // Пользовательское название
  system_type: string;            // Из template.system_type
  category: string;               // Из template.category
  
  // ⭐ УНИКАЛЬНЫЕ данные экземпляра
  serial_number?: string;
  status: ComponentStatus;
  
  // ⭐ ПАРАМЕТРЫ - объединение template.defaults + custom_params
  params: Record<string, any>;
  
  // ⭐ ИСТОРИЯ создания (НЕ ЗАВИСИМОСТЬ!)
  created_from_template?: string; // Только для истории
  
  // НЕТ template_id! ❌
}
```

## 3. **ПРОЦЕСС СОЗДАНИЯ** - копирование, не ссылки

### Создание Equipment:
```typescript
async create(data: CreateEquipmentRequest): Promise<Equipment> {
  // 1. Получаем шаблон для КОПИРОВАНИЯ данных
  const template = mockEquipmentTemplates.find(t => t.id === data.template_id);
  
  // 2. Создаем НЕЗАВИСИМЫЙ экземпляр
  const newEquipment: Equipment = {
    // Копируем основную информацию ИЗ шаблона
    name: template.name,              // ⭐ КОПИЯ
    system_type: template.system_type, // ⭐ КОПИЯ
    
    // Уникальные данные экземпляра
    display_name: data.display_name,
    serial_number: data.serial_number,
    
    // Объединяем параметры
    params: {
      ...template.default_params,     // ⭐ КОПИЯ defaults
      ...(data.custom_params || {})   // + кастомные
    },
    
    // Только история, НЕ зависимость!
    created_from_template: template.id // ⭐ ИСТОРИЯ
  };
  
  // 3. НИКАКИХ ССЫЛОК НА ШАБЛОН!
  // НЕТ template_id, НЕТ template объекта
}
```

### Создание Component:
```typescript  
async create(data: CreateComponentRequest): Promise<Component> {
  // 1. Получаем шаблон для КОПИРОВАНИЯ данных
  const template = componentTemplatesStore.getById(data.template_id);
  
  // 2. Создаем НЕЗАВИСИМЫЙ экземпляр
  const newComponent: Component = {
    // Копируем базовые данные ИЗ шаблона
    name: template.name,              // ⭐ КОПИЯ
    system_type: template.system_type, // ⭐ КОПИЯ
    category: template.category,       // ⭐ КОПИЯ
    
    // Уникальные данные экземпляра
    display_name: data.display_name,
    serial_number: data.serial_number,
    
    // Объединяем параметры
    params: {
      ...template.defaults,           // ⭐ КОПИЯ defaults  
      ...(data.custom_params || {})   // + кастомные
    },
    
    // Только история, НЕ зависимость!
    created_from_template: template.id // ⭐ ИСТОРИЯ
  };
  
  // 3. НИКАКИХ ССЫЛОК НА ШАБЛОН!
}
```

## 4. **ФИЛЬТРАЦИЯ** - по данным экземпляров, не по шаблонам

### ДО (неправильно):
```typescript
if (params.template_id) {
  filteredEquipment = filteredEquipment.filter(eq => eq.template_id === params.template_id);
}
```

### ПОСЛЕ (правильно):
```typescript
if (params.system_type) {
  filteredEquipment = filteredEquipment.filter(eq => eq.system_type === params.system_type);
}
if (params.name) {
  filteredEquipment = filteredEquipment.filter(eq => eq.name === params.name);
}
```

## ✅ **РЕЗУЛЬТАТ**: Полная независимость

1. **Шаблоны** - живут своей жизнью, могут изменяться
2. **Экземпляры** - полностью независимые копии с собственными данными
3. **Нет прямых зависимостей** - только история создания
4. **Изменение шаблона** НЕ влияет на существующие экземпляры
5. **Удаление шаблона** НЕ ломает существующие экземпляры

### Архитектура соответствует требованию:
> "что есть шаблоны со всеми полями и они могут изменяться и храниться в базе - используя шаблоны я заполняю при добавлении оборудования и компонетов в торговой точке параметры и сохраняю - это уже становится реальным оборудованием не связанным никак с шаблоном"

**✅ ПРОВЕРЕНО: Это разные сущности в системе!**