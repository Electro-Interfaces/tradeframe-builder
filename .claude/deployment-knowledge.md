# Deployment Process - TradeFrame Builder

## Окружения

| Окружение | URL | Репозиторий | Remote |
|-----------|-----|-------------|--------|
| **TEST** | https://testtf.dataworker.ru | Electro-Interfaces/tradeframe-builder | `test` |
| **PROD** | https://prod.dataworker.ru | Electro-Interfaces/TradeControl | `prod` |
| ~~GitHub Pages~~ | ~~electro-interfaces.github.io/tradeframe-builder~~ | - | НЕ ИСПОЛЬЗУЕТСЯ (старая версия 1.5.27) |

## Процесс деплоя

Деплой **АВТОМАТИЧЕСКИЙ** через GitHub Actions при push в main:

```bash
# Push на TEST
git push test main

# Push на PROD
git push prod main

# Или оба сразу (после коммита)
git push test main && git push prod main
```

## Workflow файлы

- `.github/workflows/deploy-test.yml` - деплой на testtf.dataworker.ru
- `.github/workflows/deploy-prod.yml` - деплой на prod.dataworker.ru

## Что делает GitHub Actions

1. Checkout кода
2. `npm ci` - установка зависимостей
3. `npm run build:prod` - сборка
4. Создание архива `dist.tar.gz`
5. SCP копирование на сервер
6. Распаковка, `npm install` в server/
7. `pm2 delete` + `pm2 start` (пересоздание процессов)
8. Проверка HTTP 200

## Проверка статуса деплоя

```bash
# Статус TEST
gh run list --repo Electro-Interfaces/tradeframe-builder --limit 1

# Статус PROD
gh run list --repo Electro-Interfaces/TradeControl --limit 1

# Логи ошибок (если failure)
gh run view <run_id> --repo <repo> --log-failed | tail -30
```

## Проверка версии на серверах

```bash
# TEST
curl -s https://testtf.dataworker.ru/ | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1

# PROD
curl -s https://prod.dataworker.ru/ | grep -o "[0-9]\+\.[0-9]\+\.[0-9]\+" | head -1
```

## Частые ошибки

### "Could not resolve ... from ..."
**Причина:** Файл не добавлен в git (в untracked files)

**Решение:**
```bash
git status  # Проверить untracked files
git add <путь_к_файлу>
git commit -m "fix: добавлен отсутствующий файл"
git push test main && git push prod main
```

### Пример забытых файлов (2025-12-26)
- `src/utils/base64.ts`
- `src/components/selects/MultiPointSelect.tsx`

## НЕ требуется

- ❌ Ручной SSH деплой
- ❌ `pm2 restart` вручную
- ❌ Копирование файлов через SCP вручную

Всё автоматизировано через GitHub Actions!
