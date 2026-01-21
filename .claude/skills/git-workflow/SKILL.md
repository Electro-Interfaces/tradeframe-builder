---
name: git-workflow
description: Помогает с Git операциями - коммиты, ветки, PR, деплой. Используй при работе с git, создании коммитов, пушах на сервер.
---

# Git Workflow для TradeFrame

## Структура репозитория

**Remotes:**
- `origin` - основной репозиторий
- `test` - тестовый сервер (GitHub Pages)
- `prod` - production сервер (TradeControl)

## Формат коммитов

```
тип(область): краткое описание на русском

Подробное описание изменений (опционально)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Типы коммитов

| Тип | Назначение | Пример |
|-----|-----------|--------|
| `feat` | Новая функциональность | `feat(tanks): добавлен график уровня топлива` |
| `fix` | Исправление бага | `fix(auth): исправлена ошибка при входе` |
| `refactor` | Рефакторинг кода | `refactor(api): оптимизация запросов` |
| `docs` | Документация | `docs: обновлен README` |
| `style` | Стили, форматирование | `style(ui): исправлены отступы` |
| `test` | Тесты | `test(utils): добавлены unit тесты` |
| `chore` | Служебные задачи | `chore: обновлены зависимости` |

### Области (scope)

- `auth` - аутентификация
- `tanks` - резервуары
- `shifts` - смены
- `equipment` - оборудование
- `notifications` - уведомления
- `api` - API и сервисы
- `ui` - интерфейс
- `deploy` - деплой

## Workflow деплоя

### 1. Локальная разработка
```bash
# Создать feature ветку (опционально)
git checkout -b feature/новая-функция

# Внести изменения...

# Коммит
git add .
git commit -m "feat(область): описание изменений"
```

### 2. Деплой на TEST
```bash
# Пуш в test remote
git push test main

# GitHub Actions автоматически соберет и задеплоит
# Проверить: https://electro-interfaces.github.io/tradeframe-builder/
```

### 3. Деплой на PRODUCTION
```bash
# Только после успешного тестирования!
git push prod main

# GitHub Actions автоматически задеплоит
# Проверить: https://prod.dataworker.ru/
```

## Важные правила

### ✅ Делать
- Коммиты на русском языке
- Описательные сообщения коммитов
- Тестировать на TEST перед PRODUCTION
- Обновлять версию в `src/config/version.ts`

### ❌ НЕ делать
- `git push --force` на main/prod
- Коммитить `.env` файлы
- Коммитить `node_modules/`
- Делать коммиты типа "fix", "update", "changes"

## Проверка перед коммитом

```bash
# Проверить статус
git status

# Посмотреть изменения
git diff

# Проверить сборку
npm run build

# Проверить типы
npm run type-check

# Проверить линтер
npm run lint
```

## Откат изменений

```bash
# Отменить последний коммит (не запушенный)
git reset --soft HEAD~1

# Отменить изменения в файле
git checkout -- path/to/file

# Вернуться к предыдущему коммиту
git revert HEAD
```

## Полезные команды

```bash
# История коммитов
git log --oneline -10

# Статус веток
git branch -a

# Синхронизация с remote
git fetch --all

# Проверить remotes
git remote -v
```
