---
name: youtrack-tasks
description: Управление задачами YouTrack - просмотр, поиск, работа с задачами проекта TradeFrame (TF). Используй при работе с задачами, планировании, отслеживании прогресса.
---

# YouTrack Tasks для TradeFrame Builder

## Конфигурация проекта

- **URL:** https://mag.youtrack.cloud/
- **Основной способ:** локальный YouTrack CLI
- **REST API:** используется CLI-оберткой
- **Проект:** TradeFrame (**TF**) ← ЭТОТ РЕПОЗИТОРИЙ
- **Доска:** TradeFrame Builder
- **Язык:** Русский

> **Важно:** Для этого проекта не использовать YouTrack MCP. Все операции выполнять через CLI:
> `powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" <cmd> [args]`

### Структура проектов YouTrack

```
YouTrack (mag.youtrack.cloud)
│
├── TradeFrame (TF) ✅       ← ЭТОТ ПРОЕКТ (~34 задачи)
│   └── Доска: TradeFrame Builder
│
├── TradeSuite (TS)          ← Зонтичный проект
│   ├── TradeFrame           ← Подсистема
│   ├── TradeCorp            ← Корпоративный модуль
│   ├── TradeGate            ← Шлюз, интеграции
│   └── TradeBonus           ← Бонусная система
│
├── Бизнес (BIZ)             ← Бизнес-задачи
└── ...другие проекты
```

---

## 🚀 Быстрые команды (что говорить Claude)

### Просмотр задач
| Команда | Что делает |
|---------|------------|
| "покажи задачу TF-XXX" | Детали конкретной задачи |
| "мои задачи" | `project: TF assignee: me #Unresolved` |
| "открытые задачи" | `project: TF #Unresolved` |
| "все задачи проекта" | `project: TF` |
| "баги" | `project: TF Type: Bug` |
| "критичные" | `project: TF Priority: Critical` |

### Работа с задачей
| Команда | Что делает |
|---------|------------|
| "работаю над TF-XXX" | Взять в работу, изучить требования, план |
| "статус TF-XXX" | Текущий статус и детали |
| "задача готова" | Перевести в To Verify/Done |
| "добавь комментарий: текст" | Комментарий к текущей задаче |
| "заблокирован по TF-XXX" | Статус Blocked + комментарий |

### Создание задач
| Команда | Что делает |
|---------|------------|
| "создай задачу: название" | Новая задача в TF |
| "создай баг: описание" | Баг в TF |
| "создай подзадачу для TF-XXX" | Подзадача |

### Связи между задачами
| Команда | Что делает |
|---------|------------|
| "TF-XXX блокирует TF-YYY" | Связь blocked by |
| "TF-XXX зависит от TF-YYY" | Связь depends on |
| "свяжи TF-XXX и TF-YYY" | Связь relates to |

### Спринты и доски
| Команда | Что делает |
|---------|------------|
| "текущий спринт" | Задачи активного спринта |
| "доска TradeFrame" | Состояние доски |

---

## 🔄 Workflow разработки

```
┌─────────────────────────────────────────────────────┐
│  1. ВЫБОР ЗАДАЧИ                                    │
│     "мои задачи" / "открытые задачи"                │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  2. ВЗЯТИЕ В РАБОТУ                                 │
│     "работаю над TF-XXX"                            │
│     → Claude читает задачу, предлагает план         │
│     → Статус → In Progress                          │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  3. РАЗРАБОТКА                                      │
│     → Коммиты: feat(TF-XXX): описание               │
│     → Промежуточные отчеты в комментариях           │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  4. ЗАВЕРШЕНИЕ                                      │
│     "задача готова"                                 │
│     → Комментарий о выполнении                      │
│     → Статус → To Verify / Done                     │
└─────────────────────────────────────────────────────┘
```

---

## CLI команды

```powershell
# Проекты
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" projects
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" project TF

# Задачи
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" get TF-123
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" search "project: TF #Unresolved"
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" create TF Task "Название задачи"

# Изменения
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" state TF-123 "В работе"
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" assign TF-123 МАГ
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" comment TF-123 "Текст комментария"
```

---

## Типовые запросы YouTrack

### Задачи проекта TF
```
# Все нерешённые
project: TF #Unresolved

# Мои задачи в работе
project: TF assignee: me State: {In Progress}

# Все задачи
project: TF

# По типу
project: TF Type: Bug
project: TF Type: Feature
project: TF Type: Task

# По приоритету
project: TF Priority: Critical
project: TF Priority: High

# По ключевому слову
project: TF summary: терминал
project: TF description: API
```

### Конкретная задача
```
powershell -ExecutionPolicy Bypass -File "C:\Users\magsp\.claude\skills\youtrack-workflow\scripts\yt-cli.ps1" get TF-123
```

---

## Формат коммитов с задачами

```bash
# Новый функционал
feat(TF-48): добавлен мониторинг операций онлайн

# Исправление бага
fix(TF-64): исправлено отображение списка карт

# Рефакторинг
refactor(TF-30): переход на V2 API транзакций

# Документация
docs(TF-13): обновлена инструкция пользователя

# Стиль
style(TF-55): исправлены отступы в компоненте

# Тесты
test(TF-42): добавлены unit тесты для сервиса
```

---

## Статусы задач

| Статус | Код | Действие |
|--------|-----|----------|
| Открыта | Open | Новая задача |
| Подготовка | Подготовка | Анализ требований |
| В работе | In Progress | Активная разработка |
| На проверке | To Verify | Тестирование/ревью |
| Готово | Done | Выполнено |
| Заблокирована | Blocked | Ждёт зависимостей |

---

## Приоритеты

| Приоритет | Описание | Срок реакции |
|-----------|----------|--------------|
| 🔴 Critical | Блокирует работу | < 4 часов |
| 🟠 High | Срочно | < 1 дня |
| 🟡 Medium | Обычный | < 1 недели |
| 🔵 Low | Может подождать | Бэклог |

---

## Связи задач

| Тип связи | Описание | Пример |
|-----------|----------|--------|
| **subtask of** | Подзадача | TF-10 subtask of TF-5 |
| **depends on** | Зависит от | TF-10 depends on TF-8 |
| **blocked by** | Блокируется | TF-10 blocked by TF-7 |
| **relates to** | Связана | TF-10 relates to TF-12 |
| **duplicates** | Дубликат | TF-10 duplicates TF-3 |

---

## Шаблоны описаний

### Для бага
```markdown
## Описание проблемы
[Что происходит]

## Ожидаемое поведение
[Как должно быть]

## Шаги воспроизведения
1. Шаг 1
2. Шаг 2

## Окружение
- Браузер: Chrome 120
- ОС: Windows 11
```

### Для функционала
```markdown
## Описание
[Что нужно сделать]

## Критерии приёмки
- [ ] Критерий 1
- [ ] Критерий 2

## Технические требования
[Детали реализации]
```

---

## Полезные ссылки

- **Проект TF:** https://mag.youtrack.cloud/projects/0-13
- **Доска:** https://mag.youtrack.cloud/agiles/148-38/current
- **Документация:** `docs/YOUTRACK_SETUP.md`
