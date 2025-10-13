# История деплоя и исправлений

## 2025-10-13: Критические исправления загрузки данных на production

### Контекст проблемы
После деплоя на production пользователи (особенно на мобильных устройствах) сообщили, что данные резервуаров и терминального оборудования не загружаются после входа в систему. Страница оборудования открывалась, но разделы оставались пустыми.

### Инфраструктура production

**Сервер:** 194.135.36.195
**Домен:** https://prod.dataworker.ru/
**Deployment:** GitHub Actions → SSH → PM2

**PM2 процессы:**
- `tradeframe-prod` (порт 3000) - статический фронтенд
- `tradeframe-backend-proxy` (порт 3001) - прокси для STS API

**Конфигурация деплоя:**
- `.github/workflows/deploy.yml` - автоматический деплой при push в main
- `ecosystem.config.cjs` - конфигурация PM2

**⚠️ Проблема с GitHub Actions:**
В ходе работы выяснилось, что GitHub Actions workflow не срабатывает автоматически. Потребовался ручной деплой через локальную сборку и SSH.

### Корневые причины проблем

#### 1. Race Condition при инициализации (src/contexts/SelectionContext.tsx)

**Проблема:** Компонент Equipment пытался загрузить данные до того, как SelectionContext завершил инициализацию и выбор торговой точки.

**Симптомы:**
- На мобильных устройствах данные не загружались после логина
- `selectedTradingPoint` был пустым при первом рендере Equipment

**Решение:**
```typescript
// Добавлен флаг isInitialized в SelectionContext
const [isInitialized, setIsInitialized] = useState<boolean>(false);

// В Equipment.tsx добавлена проверка
if (!isInitialized) {
  return <LoadingScreen />;
}
```

**Коммит:** Предыдущая сессия

#### 2. Хрупкая загрузка данных с Promise.all (src/hooks/useEquipment.ts)

**Проблема:** Использование `Promise.all` для одновременной загрузки terminalInfo и tanks приводило к полному отказу, если хотя бы один запрос падал.

**Код до исправления (строки 76-79):**
```typescript
const [terminalInfoData, tanksData] = await Promise.all([
  stsApiService.getTerminalInfo(contextParams),  // v2/info возвращает 500
  stsApiService.getTanks(contextParams)          // v1/tanks работает OK
]);
```

**Симптомы:**
- При ошибке `/v2/info` (500) весь блок падал в catch
- Данные резервуаров не отображались, хотя `/v1/tanks` работал

**Решение (строки 75-102):**
```typescript
// Загружаем данные по отдельности, чтобы ошибка в одном не ломала другой
let terminalInfoData: TerminalInfo | null = null;
let tanksData: Tank[] = [];

// Пытаемся загрузить информацию о терминале
try {
  terminalInfoData = await stsApiService.getTerminalInfo(contextParams);
  setTerminalInfo(terminalInfoData);
  const equipmentItems = equipmentService.mapTerminalInfoToEquipment(terminalInfoData);
  setEquipment(equipmentItems);
} catch (terminalError) {
  console.warn('Не удалось загрузить информацию о терминале:', terminalError);
  setTerminalInfo(null);
  setEquipment([]);
}

// Пытаемся загрузить резервуары
try {
  tanksData = await stsApiService.getTanks(contextParams);
  setTanks(tanksData);
} catch (tanksError) {
  console.warn('Не удалось загрузить резервуары:', tanksError);
  setTanks([]);
}
```

**Коммит:** `60992f1` - fix: раздельная загрузка terminalInfo и tanks для устойчивости к ошибкам

#### 3. Ошибка Backend Proxy "Cannot set property path" (server/routes/sts.js)

**Проблема:** В fallback роуте была попытка записи в read-only свойство `req.path`, что вызывало ошибку 500.

**Код до исправления (строка 160):**
```javascript
router.all('*', (req, res) => {
  req.path = req.originalUrl.replace('/api/sts', '');  // ❌ req.path - read-only!
  proxyRequest(req, res);
});
```

**Симптомы:**
- Backend Proxy возвращал 500 для всех запросов через fallback роут
- Ошибка: `"Cannot set property path of #<IncomingMessage> which has only a getter"`

**Решение (строки 159-163):**
```javascript
router.all('*', (req, res) => {
  // req.path - это read-only свойство, используем req.originalUrl напрямую
  // proxyRequest использует req.path, который уже правильно установлен роутером
  proxyRequest(req, res);
});
```

**Коммит:** `d6a6192` - fix: исправлена ошибка Backend Proxy

#### 4. Отсутствующий роут /v2/info (server/routes/sts.js)

**Проблема:** Явный роут для `/v2/info` отсутствовал, запрос уходил в fallback роут с ошибкой.

**Решение (строка 133):**
```javascript
// === Endpoints для информации о ТО ===
router.get('/v1/info', (req, res) => proxyRequest(req, res));
router.get('/v2/info', (req, res) => proxyRequest(req, res));  // ✅ Добавлено
```

**Коммит:** `d6a6192` - fix: исправлена ошибка Backend Proxy

### Процесс ручного деплоя

**⚠️ GitHub Actions не сработал автоматически, потребовался ручной деплой:**

```bash
# 1. Локальная сборка production bundle
npm run build:prod

# 2. Создание архива
cd dist && tar -czf ../dist.tar.gz . && cd ..

# 3. Загрузка на сервер
scp dist.tar.gz root@194.135.36.195:/tmp/

# 4. Остановка PM2 процессов
ssh root@194.135.36.195 "pm2 stop tradeframe-prod tradeframe-backend-proxy"

# 5. Распаковка на сервере
ssh root@194.135.36.195 "
  cd /var/www/www-root/data/www/prod.dataworker.ru &&
  rm -rf dist &&
  mkdir dist &&
  cd dist &&
  tar -xzf /tmp/dist.tar.gz &&
  rm /tmp/dist.tar.gz
"

# 6. Загрузка исправленного server/routes/sts.js
scp server/routes/sts.js root@194.135.36.195:/var/www/www-root/data/www/prod.dataworker.ru/server/routes/

# 7. Перезапуск PM2 процессов
ssh root@194.135.36.195 "
  cd /var/www/www-root/data/www/prod.dataworker.ru &&
  pm2 restart tradeframe-prod tradeframe-backend-proxy &&
  pm2 list
"
```

### Результаты после исправлений

✅ **Данные загружаются корректно:**
- Терминальное оборудование: Купюроприемник, АЗС, POS, QR, Смена, Картридер, МПС-ридер
- Резервуары: 3 резервуара с полными данными (объем, температура, заполнение)

✅ **API запросы работают:**
- `GET /v2/info` → 200 OK
- `GET /v1/tanks` → 200 OK

✅ **Нет ошибок в консоли браузера**

✅ **Устойчивость к частичным сбоям:**
- Если `/v2/info` падает, резервуары все равно отображаются
- Если `/v1/tanks` падает, терминальное оборудование все равно отображается

### Важные уроки

1. **GitHub Actions требует проверки:**
   - Workflow может не сработать автоматически
   - Нужен мониторинг статуса деплоя
   - Всегда имейте план ручного деплоя

2. **Browser cache на production:**
   - Service Workers кешируют агрессивно
   - Пользователям может потребоваться hard refresh (Ctrl+Shift+R)
   - Рассмотреть добавление версионирования в manifest.json

3. **Promise.all - хрупкий паттерн:**
   - Используйте раздельную загрузку для независимых данных
   - Индивидуальная обработка ошибок повышает надежность

4. **Backend Proxy нюансы:**
   - `req.path` - read-only в Express
   - Явные роуты предпочтительнее fallback
   - Логирование критично для диагностики

### Файлы затронутые исправлениями

**Frontend:**
- `src/hooks/useEquipment.ts` - раздельная загрузка данных
- `src/contexts/SelectionContext.tsx` - флаг isInitialized (предыдущая сессия)
- `src/pages/Equipment.tsx` - проверка isInitialized (предыдущая сессия)

**Backend:**
- `server/routes/sts.js` - исправление fallback роута, добавление /v2/info

### Коммиты

```
d6a6192 - fix: исправлена ошибка Backend Proxy и устойчивость загрузки данных
60992f1 - fix: раздельная загрузка terminalInfo и tanks для устойчивости к ошибкам
a100a65 - fix: удалена проверка конфигурации API СТС для Backend Proxy
afd2bf0 - fix: переход на Backend Proxy для всех запросов к STS API
```

### Мониторинг и следующие шаги

**Для будущих деплоев:**
1. Проверять статус GitHub Actions workflow
2. Тестировать на production с hard refresh
3. Проверять PM2 процессы: `ssh root@194.135.36.195 "pm2 status"`
4. Проверять логи Backend Proxy: `ssh root@194.135.36.195 "pm2 logs tradeframe-backend-proxy --lines 50"`

**Потенциальные улучшения:**
1. Настроить уведомления GitHub Actions о статусе деплоя
2. Добавить healthcheck endpoints в Backend Proxy
3. Настроить мониторинг uptime для production
4. Рассмотреть использование CDN для статических файлов

---

**Документ создан:** 2025-10-13
**Последнее обновление:** 2025-10-13
**Статус:** Все критические проблемы решены, production работает стабильно
