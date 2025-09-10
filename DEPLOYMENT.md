# 🚀 Деплоймент TradeControl на продакшен

## Подготовка к публикации

### 1. Обновите конфигурацию

**Обязательно замените в следующих файлах:**

#### `.env.production`
```bash
VITE_API_URL=https://api.ваш-домен.com
VITE_BASE_URL=https://ваш-домен.com
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

#### `index.html`
- Замените `https://ВАШ_ДОМЕН.com` на реальный домен
- Добавьте реальное изображение `og-image.jpg`

#### `public/robots.txt`
- Замените `https://ВАШ_ДОМЕН.com` на реальный домен

#### `public/sitemap.xml`
- Замените `https://ВАШ_ДОМЕН.com` на реальный домен

### 2. Создайте изображение для социальных сетей

Создайте `og-image.jpg` размером 1200x630px для социальных сетей.
Используйте `public/og-image.html` как основу.

### 3. Подготовьте build

```bash
# Production build
npm run build:prod

# Проверьте локально
npm run preview
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