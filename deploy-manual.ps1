# PowerShell скрипт деплоя на production с автоматическим вводом пароля
# Использование: .\deploy-manual.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Начинаем деплой на production..." -ForegroundColor Cyan

# Конфигурация
$PROD_SERVER = "root@194.135.36.195"
$PROD_DIR = "/var/www/www-root/data/www/prod.dataworker.ru"
$SSH_PASSWORD = "n3cBMDPU2@N*C"

# Конвертируем пароль в SecureString
$SecurePassword = ConvertTo-SecureString $SSH_PASSWORD -AsPlainText -Force

Write-Host "📦 Шаг 1: Сборка production bundle..." -ForegroundColor Blue
npm run build:prod

Write-Host "📦 Шаг 2: Создание архива..." -ForegroundColor Blue
if (Test-Path "dist.tar.gz") {
    Remove-Item "dist.tar.gz"
}
cd dist
tar -czf ../dist.tar.gz .
cd ..
$ArchiveSize = (Get-Item "dist.tar.gz").Length / 1MB
Write-Host "✅ Архив создан: $($ArchiveSize.ToString('0.0')) MB" -ForegroundColor Green

Write-Host "📤 Шаг 3: Загрузка архива на сервер..." -ForegroundColor Blue
$plink = "plink"
$pscp = "pscp"

# Загрузка архива
& $pscp -pw $SSH_PASSWORD dist.tar.gz "${PROD_SERVER}:/tmp/"

Write-Host "🔄 Шаг 4: Остановка PM2 процесса..." -ForegroundColor Blue
& $plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 stop tradeframe-prod"

Write-Host "📂 Шаг 5: Развертывание файлов..." -ForegroundColor Blue
& $plink -pw $SSH_PASSWORD $PROD_SERVER "cd $PROD_DIR && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"

Write-Host "🔄 Шаг 6: Копирование обновленного sts.js..." -ForegroundColor Blue
& $pscp -pw $SSH_PASSWORD server/routes/sts.js "${PROD_SERVER}:${PROD_DIR}/server/routes/"

Write-Host "🔄 Шаг 7: Перезапуск PM2 процессов..." -ForegroundColor Blue
& $plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 restart tradeframe-prod tradeframe-backend-proxy"

Write-Host "📊 Шаг 8: Проверка статуса PM2..." -ForegroundColor Blue
& $plink -pw $SSH_PASSWORD $PROD_SERVER "pm2 list"

Write-Host "✅ Деплой завершен успешно!" -ForegroundColor Green
Write-Host "🌐 Проверьте работу: https://prod.dataworker.ru" -ForegroundColor Green

# Проверка версии tanksService
Write-Host "🔍 Проверка версии tanksService на сервере..." -ForegroundColor Blue
$TANKS_FILE = & $plink -pw $SSH_PASSWORD $PROD_SERVER "find $PROD_DIR/dist/assets -name '*tanksService*.js' -exec basename {} \;"
Write-Host "📄 Установлен файл: $TANKS_FILE" -ForegroundColor Green
