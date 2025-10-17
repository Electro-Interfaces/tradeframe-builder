# 🔄 Диаграмма процесса деплоя

## Workflow: TEST Environment

```mermaid
graph TD
    A[Developer Push to main] --> B[GitHub Actions Triggered]
    B --> C[Checkout Code]
    C --> D[Setup Node.js 20]
    D --> E[npm ci]
    E --> F[npm run sync-version]
    F --> G[npm run build:prod]
    G --> H{Build Success?}
    H -->|No| I[❌ Build Failed - Stop]
    H -->|Yes| J[SSH to Server]
    J --> K[Create Backup]
    K --> L[Upload dist/]
    L --> M[git pull on server]
    M --> N[npm install in server/]
    N --> O[PM2 Restart]
    O --> P{Health Check}
    P -->|200 OK| Q[✅ Deploy Success]
    P -->|Error| R[❌ Deploy Failed]
    Q --> S[Notify Success]
    R --> T[Show Rollback Instructions]
```

## Workflow: PRODUCTION Environment

```mermaid
graph TD
    A[Developer Push to main] --> B[GitHub Actions Triggered]
    B --> C{Environment Protection}
    C -->|Requires Approval| D[Wait for Approval]
    C -->|Auto Deploy| E[Checkout Code]
    D --> E
    E --> F[Setup Node.js 20]
    F --> G[npm ci]
    G --> H[npm run sync-version]
    H --> I[npm run build:prod]
    I --> J{Build Success?}
    J -->|No| K[❌ Build Failed - Stop]
    J -->|Yes| L[SSH to Server]
    L --> M[Create Backup]
    M --> N[Upload dist/]
    N --> O[git pull on server]
    O --> P[npm install in server/]
    P --> Q[PM2 Restart]
    Q --> R{Health Check}
    R -->|200 OK| S[Create Git Tag]
    S --> T[✅ Deploy Success]
    R -->|Error| U[❌ Deploy Failed]
    T --> V[Notify Success]
    U --> W[Show Rollback Instructions]
```

## Процесс синхронизации TEST → PROD

```mermaid
graph LR
    A[TEST: tradeframe-builder] -->|1. Code Tested| B[Run sync-repos.sh]
    B -->|2. Create Sync Branch| C[PROD: TradeControl]
    C -->|3. Create Pull Request| D[Code Review]
    D -->|4. Approve & Merge| E[PROD Deploy Triggered]
    E -->|5. Auto Deploy| F[prod.dataworker.ru]
```

## Архитектура репозиториев

```mermaid
graph TB
    subgraph GitHub
        R1[tradeframe-builder<br/>TEST Repository]
        R2[TradeControl<br/>PROD Repository]
    end

    subgraph Server: 194.135.36.195
        S1[testTF.dataworker.ru<br/>PM2: test-frontend, test-backend]
        S2[prod.dataworker.ru<br/>PM2: prod-frontend, prod-backend]
    end

    R1 -->|GitHub Actions<br/>Auto Deploy| S1
    R2 -->|GitHub Actions<br/>Auto Deploy| S2

    S1 -.->|Manual Sync| R2
```

## Структура деплоя на сервере

```mermaid
graph TD
    A[Server: 194.135.36.195] --> B[/var/www/www-root/data/www/]
    B --> C[testTF.dataworker.ru/]
    B --> D[prod.dataworker.ru/]

    C --> C1[dist/ - Frontend Build]
    C --> C2[server/ - Backend Proxy]
    C --> C3[.git/ - Git Repository]

    D --> D1[dist/ - Frontend Build]
    D --> D2[server/ - Backend Proxy]
    D --> D3[.git/ - Git Repository]

    C2 --> C4[PM2: tradeframe-test-frontend:3007]
    C2 --> C5[PM2: tradeframe-test-backend:3002]

    D2 --> D6[PM2: tradeframe-prod-frontend:3008]
    D2 --> D7[PM2: tradeframe-prod-backend:3003]
```

## Timeline типичного деплоя

```mermaid
gantt
    title Деплой Timeline (типичный 5-минутный деплой)
    dateFormat  mm:ss
    axisFormat %M:%S

    section GitHub Actions
    Checkout & Setup       :a1, 00:00, 00:30
    Install Dependencies   :a2, after a1, 01:00
    Build Project         :a3, after a2, 02:00

    section Server
    Create Backup         :b1, after a3, 00:20
    Upload Files          :b2, after b1, 00:40
    Git Pull              :b3, after b2, 00:20
    NPM Install           :b4, after b3, 00:30
    PM2 Restart           :b5, after b4, 00:10

    section Verification
    Health Check          :c1, after b5, 00:10
    Success Notification  :c2, after c1, 00:05
```

## Rollback процесс

```mermaid
graph LR
    A[❌ Deploy Failed] --> B{Rollback Method}
    B -->|Auto Backup| C[SSH to Server]
    C --> D[Find Backup in /tmp/backups/]
    D --> E[tar -xzf backup.tar.gz]
    E --> F[PM2 Restart]
    F --> G[✅ Rolled Back]

    B -->|Git Reset| H[SSH to Server]
    H --> I[git reset --hard COMMIT]
    I --> J[npm run build:prod]
    J --> K[PM2 Restart]
    K --> G
```

## Security: SSH Key Flow

```mermaid
graph TD
    A[Generate SSH Key Pair] --> B[Public Key]
    A --> C[Private Key]

    B --> D[Add to Server<br/>~/.ssh/authorized_keys]
    C --> E[Add to GitHub Secrets<br/>SSH_PRIVATE_KEY]

    F[GitHub Actions Run] --> G[Load Private Key from Secret]
    G --> H[SSH Connection to Server]
    D --> H
    H --> I[✅ Authenticated]
    I --> J[Deploy Operations]
```

---

## 📊 Статистика деплоя

**Средние показатели:**

- ⏱️ **Время деплоя TEST**: 3-5 минут
- ⏱️ **Время деплоя PROD**: 4-6 минут (с health checks)
- 💾 **Размер сборки**: ~1.2 MB (gzipped)
- 📦 **Количество файлов**: ~50-100 файлов в dist/
- 🔄 **Downtime**: ~5-10 секунд (время перезапуска PM2)

**Бэкапы:**

- 📁 Хранятся в `/tmp/backups/`
- 📦 Средний размер: 2-5 MB
- 🗑️ Автоочистка: при перезагрузке сервера (`/tmp` очищается)
- 💡 Рекомендация: настроить регулярное копирование в постоянное хранилище

---

## 🎯 Best Practices

1. **Всегда тестируйте в TEST** перед деплоем в PROD
2. **Code Review** для всех изменений перед merge
3. **Создавайте git tags** для версионирования
4. **Мониторьте логи** после каждого деплоя
5. **Сохраняйте бэкапы** в безопасное место
6. **Документируйте изменения** в CHANGELOG.md
