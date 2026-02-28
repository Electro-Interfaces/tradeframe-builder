# 📋 Инструкция по настройке PDF экспорта в TradeControl Builder

## 📊 Общая информация

**Система**: TradeControl Builder v1.5.16
**Компонент**: PDF экспорт операций и отчетов
**Библиотека**: pdfmake v0.2.10
**Окружение**: Production (prod.dataworker.ru)

## 🎯 Цель

Включить функциональность экспорта данных в PDF формат на production сервере. В данный момент PDF экспорт отключен для предотвращения ошибок на серверах без установленных зависимостей.

## 📋 Предварительные требования

- Доступ к production серверу по SSH
- Права администратора на production сервере
- Node.js версии 18+ установлен на сервере
- npm или yarn package manager
- PM2 process manager (если используется)

## 🚀 Пошаговая инструкция

### Шаг 1: Подключение к серверу

```bash
# Подключиться к production серверу
ssh user@prod.dataworker.ru

# Перейти в директорию проекта
cd /var/www/www-root/data/www/prod.dataworker.ru/
```

### Шаг 2: Проверка текущего состояния

```bash
# Проверить статус проекта
pwd
ls -la

# Проверить package.json на наличие зависимостей
grep -A 5 -B 5 "pdfmake" package.json

# Проверить текущие переменные окружения
cat .env* 2>/dev/null || echo "Файлы .env не найдены"

# Проверить установленные зависимости
ls -la node_modules/pdfmake 2>/dev/null || echo "pdfmake не установлен"
```

### Шаг 3: Установка зависимостей

```bash
# Установить все зависимости проекта
npm install

# Проверить что pdfmake установился корректно
ls -la node_modules/pdfmake/build/
```

**Ожидаемый результат:**
```
node_modules/pdfmake/build/
├── pdfmake.js
├── pdfmake.min.js
├── vfs_fonts.js
└── ...
```

### Шаг 4: Настройка переменных окружения

**Вариант A: Создание нового .env.production файла**
```bash
# Создать файл с настройками для production
cat > .env.production << 'EOF'
# PDF Export Configuration
VITE_DISABLE_PDF_EXPORT=false

# Другие переменные окружения (если есть)
# VITE_API_URL=https://api.prod.dataworker.ru
# VITE_APP_VERSION=1.5.16
EOF
```

**Вариант B: Добавление в существующий .env файл**
```bash
# Если файл .env уже существует
echo "VITE_DISABLE_PDF_EXPORT=false" >> .env.production

# Проверить содержимое
cat .env.production
```

### Шаг 5: Пересборка проекта

```bash
# Очистить предыдущую сборку (опционально)
rm -rf dist/

# Собрать проект для production с новыми настройками
npm run build:prod

# Или если команда build:prod недоступна
NODE_ENV=production npm run build
```

**Проверка успешной сборки:**
```bash
# Проверить что dist/ создан и содержит файлы
ls -la dist/
ls -la dist/assets/

# Проверить что в сборке есть pdfmake chunks
ls dist/assets/ | grep -i pdf || echo "PDF chunks не найдены (это нормально если используется динамический импорт)"
```

### Шаг 6: Обновление статических файлов

```bash
# Если используется отдельная директория для статики
# Скопировать собранные файлы в рабочую директорию веб-сервера
cp -r dist/* /path/to/web/directory/ 2>/dev/null || echo "Директория уже актуальна"

# Проверить права доступа к файлам
chmod -R 755 dist/
```

### Шаг 7: Перезапуск сервисов

**Если используется PM2:**
```bash
# Проверить запущенные процессы
pm2 list

# Перезапустить приложение
pm2 restart all

# Или перезапустить конкретное приложение
pm2 restart tradeframe-builder

# Проверить логи
pm2 logs --lines 50
```

**Если используется systemd:**
```bash
# Перезапустить сервис
sudo systemctl restart tradeframe-app

# Проверить статус
sudo systemctl status tradeframe-app
```

**Если используется обычный Node.js процесс:**
```bash
# Найти процесс
ps aux | grep node

# Завершить и перезапустить
pkill -f "tradeframe\|node.*server"
nohup npm start > app.log 2>&1 &
```

### Шаг 8: Проверка функциональности

```bash
# Проверить что веб-сервер отвечает
curl -I https://prod.dataworker.ru/

# Проверить что JavaScript файлы загружаются
curl -I https://prod.dataworker.ru/assets/index-*.js
```

**Ручная проверка в браузере:**

1. Открыть https://prod.dataworker.ru/
2. Войти в систему (если требуется аутентификация)
3. Перейти в раздел "Операции" → `/network/operations-transactions`
4. Нажать кнопку "Экспорт в PDF"
5. Проверить что файл PDF скачивается без ошибок
6. Открыть Developer Tools (F12) → Console
7. Убедиться что нет ошибок связанных с pdfmake

## 🔍 Диагностика проблем

### Проблема: Ошибка "Failed to resolve import pdfmake"

**Причина:** Зависимости не установлены или сборка выполнена без переменной окружения

**Решение:**
```bash
# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install

# Проверить переменную окружения
grep VITE_DISABLE_PDF_EXPORT .env.production

# Пересобрать проект
npm run build:prod
```

### Проблема: PDF не скачивается, показывается alert

**Причина:** PDF экспорт отключен или fallback режим активен

**Решение:**
```bash
# Проверить переменную окружения
echo $VITE_DISABLE_PDF_EXPORT
cat .env.production | grep VITE_DISABLE_PDF_EXPORT

# Убедиться что значение false, а не true
sed -i 's/VITE_DISABLE_PDF_EXPORT=true/VITE_DISABLE_PDF_EXPORT=false/' .env.production
```

### Проблема: Сервер не перезапускается

**Решение:**
```bash
# Принудительно завершить все Node.js процессы
sudo pkill -f node

# Проверить что порты освобождены
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :8080

# Перезапустить с логированием
npm start 2>&1 | tee restart.log
```

### Проблема: Большой размер bundle после включения PDF

**Решение:**
Это нормальное поведение. pdfmake добавляет ~2-3MB к размеру приложения. Библиотека загружается динамически только при использовании PDF экспорта.

## 📊 Проверочный чек-лист

- [ ] SSH доступ к серверу получен
- [ ] Директория проекта найдена
- [ ] package.json содержит pdfmake в dependencies
- [ ] `npm install` выполнен успешно
- [ ] node_modules/pdfmake/build/ содержит файлы
- [ ] .env.production создан с VITE_DISABLE_PDF_EXPORT=false
- [ ] `npm run build:prod` выполнен без ошибок
- [ ] dist/ директория создана и содержит файлы
- [ ] Сервис перезапущен (PM2/systemd/Node.js)
- [ ] Веб-сайт загружается без ошибок
- [ ] PDF экспорт работает в браузере
- [ ] Консоль браузера не показывает ошибки pdfmake

## 🔧 Команды для быстрого решения

**Полная переустановка (если ничего не помогает):**
```bash
#!/bin/bash
cd /var/www/www-root/data/www/prod.dataworker.ru/

# Backup текущего состояния
cp -r dist/ dist_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null

# Очистка
rm -rf node_modules/ dist/ package-lock.json

# Переустановка
npm install

# Настройка PDF
echo "VITE_DISABLE_PDF_EXPORT=false" > .env.production

# Сборка
npm run build:prod

# Перезапуск
pm2 restart all

echo "✅ PDF экспорт настроен и готов к использованию"
```

## 📞 Поддержка

При возникновении проблем:

1. Сохранить логи ошибок из консоли браузера
2. Сохранить логи сервера (`pm2 logs` или системные логи)
3. Выполнить команды диагностики из раздела "Диагностика проблем"
4. Предоставить вывод команд для анализа

## 📝 Дополнительная информация

**Архитектура PDF экспорта:**
- `src/utils/pdfMake.ts` - основной модуль управления PDF
- `src/utils/pdfMakeLoader.ts` - динамический загрузчик pdfmake
- Компоненты с PDF экспортом: операции, отчеты, дашборды

**Переменные окружения:**
- `VITE_DISABLE_PDF_EXPORT=false` - включить PDF экспорт
- `VITE_DISABLE_PDF_EXPORT=true` - отключить PDF экспорт (fallback режим)

**Размеры файлов:**
- pdfmake: ~2.1MB
- vfs_fonts: ~1.8MB
- Итого: ~4MB дополнительно к bundle