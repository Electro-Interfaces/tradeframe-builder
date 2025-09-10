# 🚀 Руководство по развертыванию TradeControl

## Быстрый старт для команды разработки

### 1. Установка и запуск
```bash
# Клонирование репозитория
git clone <repository-url>
cd tradeframe-builder

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev          # Frontend (port 3000)
npm run api:dev      # Backend API (port 3001)
```

### 2. Переменные окружения
```bash
# Создать .env из примера
cp .env.example .env

# Основные переменные
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🎯 Готовность приложения (92%)

### ✅ ГОТОВО К ПЕРЕДАЧЕ
- **Архитектура**: React 18 + TypeScript + Vite (95%)
- **Мобильная адаптация**: Все разделы оптимизированы (95%)
- **PWA функциональность**: Service Worker + Manifest (90%)
- **Безопасность**: JWT + Supabase RLS (85%)
- **Бизнес-логика**: 5 основных разделов (90%)

### ⚠️ ТРЕБУЕТ ДОРАБОТКИ
- **Docker конфигурация**: Отсутствует
- **CI/CD pipeline**: Не настроен
- **Unit тесты**: Не реализованы
- **Health checks**: Отсутствуют

### 🚨 КРИТИЧНО ДЛЯ PRODUCTION
- HTTPS настройка (обязательно для PWA)
- Production Supabase проект
- Environment secrets управление
- Мониторинг и логирование

## Production развертывание

### Подготовка конфигурации
#### `.env.production`
```bash
VITE_API_URL=https://api.ваш-домен.com
VITE_BASE_URL=https://ваш-домен.com
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

### Docker конфигурация (TODO - приоритет 1)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### CI/CD Pipeline (TODO - приоритет 1)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test
```

## Варианты деплоймента

### Option 1: Vercel (рекомендуется)

1. Подключите репозиторий к Vercel
2. Установите environment variables в Vercel Dashboard
3. Build Command: `npm run build:prod`
4. Output Directory: `dist`

### Option 2: Netlify

1. Подключите репозиторий к Netlify
2. Build Command: `npm run build:prod`
3. Publish Directory: `dist`
4. Добавьте файл `_redirects`:

```bash
echo "/*    /index.html   200" > dist/_redirects
```

### Option 3: VPS/Dedicated Server

1. Соберите приложение:
```bash
npm run build:prod
```

2. Скопируйте папку `dist` на сервер

3. Настройте nginx:
```nginx
server {
    listen 80;
    server_name ваш-домен.com;
    root /path/to/dist;
    index index.html;

    # Обслуживание статических файлов
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Контрольный список

- [ ] Обновлены все домены в конфигурации
- [ ] Создан `.env.production` с реальными данными
- [ ] Добавлено изображение `og-image.jpg`
- [ ] Проверен production build локально
- [ ] Настроены SSL сертификаты
- [ ] Работает HTTPS редирект
- [ ] Проверена мобильная версия
- [ ] Настроена база данных Supabase
- [ ] Протестирована авторизация

## После деплоймента

1. Проверьте работоспособность всех основных функций
2. Протестируйте на мобильных устройствах
3. Проверьте PWA функциональность
4. Настройте мониторинг и аналитику

## Поддержка

Если возникнут проблемы с деплойментом, проверьте:
- Console браузера на ошибки
- Network запросы
- Environment variables
- CORS настройки API