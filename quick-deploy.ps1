# ========================================
# 🚀 Быстрый деплой TradeFrame на production
# ========================================
# Версия: 1.5.30
# Сервер: prod.dataworker.ru (194.135.36.195)
# Использование: .\quick-deploy.ps1
# ========================================

$ErrorActionPreference = "Stop"

# Конфигурация
$PROD_SERVER = "root@194.135.36.195"
$PROD_DIR = "/var/www/www-root/data/www/prod.dataworker.ru"
$FRONTEND_PM2 = "tradeframe-prod-frontend"
$BACKEND_PM2 = "tradeframe-prod-backend"
$SSH_PASSWORD = $env:TRADEFRAME_DEPLOY_SSH_PASSWORD

if ([string]::IsNullOrWhiteSpace($SSH_PASSWORD)) {
    Write-Host "🔐 Переменная TRADEFRAME_DEPLOY_SSH_PASSWORD не задана, запрашиваю пароль..." -ForegroundColor Yellow
    $SecureInput = Read-Host "Введите SSH пароль" -AsSecureString
    $Ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureInput)
    try {
        $SSH_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Ptr)
    }
}

if ([string]::IsNullOrWhiteSpace($SSH_PASSWORD)) {
    Write-Error "SSH пароль не задан. Установите TRADEFRAME_DEPLOY_SSH_PASSWORD или введите пароль при запуске."
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Быстрый деплой TradeFrame v1.5.30" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Функция для вывода статуса
function Write-Step {
    param($Step, $Total, $Message)
    Write-Host "📋 Шаг $Step/$Total`: $Message" -ForegroundColor Yellow
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Проверка наличия plink и pscp
$plinkPath = (Get-Command plink -ErrorAction SilentlyContinue)
$pscpPath = (Get-Command pscp -ErrorAction SilentlyContinue)

if (-not $plinkPath -or -not $pscpPath) {
    Write-Error "plink или pscp не найдены!"
    Write-Info "Установите PuTTY: https://www.putty.org/"
    Write-Info "Или используйте Node.js скрипт: node deploy-auto.cjs"
    exit 1
}

# Шаг 1: Сборка production bundle
Write-Step 1 7 "Сборка production bundle..."
npm run build:prod

if (-not (Test-Path "dist")) {
    Write-Error "Папка dist не создана!"
    exit 1
}

Write-Success "Сборка завершена`n"

# Шаг 2: Создание архива
Write-Step 2 7 "Создание архива..."
if (Test-Path "dist.tar.gz") {
    Remove-Item "dist.tar.gz"
}

Push-Location dist
tar -czf ../dist.tar.gz .
Pop-Location

$ArchiveSize = "{0:N2} MB" -f ((Get-Item "dist.tar.gz").Length / 1MB)
Write-Success "Архив создан: $ArchiveSize`n"

# Шаг 3: Загрузка архива на сервер
Write-Step 3 7 "Загрузка архива на сервер..."
& pscp -pw $SSH_PASSWORD dist.tar.gz "${PROD_SERVER}:/tmp/"
Write-Success "Архив загружен`n"

# Шаг 4: Остановка PM2 процесса
Write-Step 4 7 "Остановка PM2 процесса..."
& plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 stop $FRONTEND_PM2"
Write-Success "Процесс остановлен`n"

# Шаг 5: Развертывание файлов
Write-Step 5 7 "Развертывание файлов..."
& plink -pw $SSH_PASSWORD $PROD_SERVER "cd $PROD_DIR && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"
Write-Success "Файлы развернуты`n"

# Шаг 6: Копирование обновленного server/routes/sts.js (если есть)
if (Test-Path "server/routes/sts.js") {
    Write-Step 6 7 "Копирование обновленного sts.js..."
    & pscp -pw $SSH_PASSWORD server/routes/sts.js "${PROD_SERVER}:${PROD_DIR}/server/routes/"
    Write-Success "sts.js обновлен`n"
} else {
    Write-Host "⚠️  Шаг 6/7: server/routes/sts.js не найден, пропуск...`n" -ForegroundColor Yellow
}

# Шаг 7: Перезапуск PM2 процессов
Write-Step 7 7 "Перезапуск PM2 процессов..."
& plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 restart $FRONTEND_PM2 $BACKEND_PM2"
Write-Success "Процессы перезапущены`n"

# Проверка статуса
Write-Info "📊 Проверка статуса PM2..."
& plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 list"

# Проверка версии на сервере
Write-Host "`n" -NoNewline
Write-Info "🔍 Проверка версии приложения на сервере..."
$versionCheck = & plink -pw $SSH_PASSWORD $PROD_SERVER "grep -r 'APP_VERSION = ' $PROD_DIR/dist/assets/*.js | head -1" 2>$null
if ($versionCheck) {
    if ($versionCheck -match "v[\d.]+") {
        $version = $matches[0]
        Write-Success "📄 Версия: $version"
    } else {
        Write-Host "⚠️  Не удалось определить версию" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Не удалось определить версию" -ForegroundColor Yellow
}

# Итог
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Success "✅ Деплой завершен успешно!"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌐 Проверьте работу: " -ForegroundColor Green -NoNewline
Write-Host "https://prod.dataworker.ru`n" -ForegroundColor Cyan

# Очистка локального архива (опционально)
$cleanup = Read-Host "Удалить локальный архив dist.tar.gz? (y/n)"
if ($cleanup -eq 'y' -or $cleanup -eq 'Y') {
    Remove-Item dist.tar.gz
    Write-Success "✅ Архив удален"
}

Write-Host "`nГотово! 🎉`n" -ForegroundColor Green

# Открыть сайт в браузере?
$openBrowser = Read-Host "Открыть https://prod.dataworker.ru в браузере? (y/n)"
if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
    Start-Process "https://prod.dataworker.ru"
}
