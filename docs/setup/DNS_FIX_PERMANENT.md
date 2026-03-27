# 🔧 Постоянное исправление проблемы DNS на production сервере

## Проблема
DNS серверы хостера (2a03:6f00:1:2::5c35:740d, 2a03:6f00:1:2::5c35:7468) нестабильны и периодически падают, вызывая ошибку `getaddrinfo EAI_AGAIN` в backend.

## Корневая причина
DHCP клиент автоматически получает нестабильные DNS от хостера и переопределяет наши настройки при каждом lease renewal.

---

## ✅ Решение (применено на сервере 194.135.36.195)

### 1. Отключение DNS от DHCP в systemd-networkd

**Файл:** `/etc/systemd/network/eth0.network.d/10-ignore-dns.conf`

```ini
[DHCPv4]
UseDNS=false
```

**Команда создания:**
```bash
mkdir -p /etc/systemd/network/eth0.network.d
cat > /etc/systemd/network/eth0.network.d/10-ignore-dns.conf << 'EOF'
[DHCPv4]
UseDNS=false
EOF
```

---

### 2. Настройка netplan (отключение DNS от DHCP)

**Файл:** `/etc/netplan/50-cloud-init.yaml`

```yaml
network:
  version: 2
  ethernets:
    eth0:
      match:
        macaddress: "c2:ed:9b:09:a1:11"
      gateway4: 194.135.36.1
      dhcp4: true
      dhcp4-overrides:
        use-dns: false      # <- КЛЮЧЕВАЯ СТРОКА
      dhcp6: false
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 1.1.1.1
    eth1:
      match:
        macaddress: "54:52:00:1b:ed:51"
      optional: true
      addresses:
      - "192.168.0.6/24"
      dhcp4: false
      dhcp6: false
```

**Команда применения:**
```bash
netplan apply
```

---

### 3. Настройка systemd-resolved

**Файл:** `/etc/systemd/resolved.conf.d/dns.conf`

```ini
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSSEC=no
```

**Команда создания:**
```bash
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/dns.conf << 'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSSEC=no
EOF
systemctl restart systemd-resolved
```

---

## 📋 Проверка после применения

### 1. Проверить текущие DNS серверы
```bash
resolvectl status
```

**Ожидаемый результат:**
```
Global
  Current DNS Server: 8.8.8.8
         DNS Servers: 8.8.8.8 8.8.4.4
Fallback DNS Servers: 1.1.1.1 1.0.0.1

Link 2 (eth0)
       DNS Servers: 8.8.8.8 8.8.4.4 1.1.1.1
```

**НЕ должно быть:** `2a03:6f00:1:2::5c35:*`

### 2. Проверить DNS резолвинг
```bash
nslookup pos.autooplata.ru
```

**Должно вернуть:**
```
Server:		127.0.0.53
Address:	127.0.0.53#53

Non-authoritative answer:
Name:	pos.autooplata.ru
Address: 195.133.27.26
```

### 3. Проверить работу backend API
```bash
curl "http://localhost:3001/api/sts/v1/info?system=15&station=4"
```

**Должно вернуть JSON с данными** (не ошибку 500)

### 4. Проверить логи backend
```bash
pm2 logs tradeframe-prod-backend --lines 20
```

**НЕ должно быть:**
- `getaddrinfo EAI_AGAIN`
- `Failed to authenticate with STS API`
- `Failed to refresh JWT token`

---

## 🔄 Полный скрипт исправления (если нужно переприменить)

```bash
#!/bin/bash
# Запускать от root

echo "1. Настройка systemd-networkd..."
mkdir -p /etc/systemd/network/eth0.network.d
cat > /etc/systemd/network/eth0.network.d/10-ignore-dns.conf << 'EOF'
[DHCPv4]
UseDNS=false
EOF

echo "2. Настройка netplan..."
cat > /etc/netplan/50-cloud-init.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      match:
        macaddress: "c2:ed:9b:09:a1:11"
      gateway4: 194.135.36.1
      dhcp4: true
      dhcp4-overrides:
        use-dns: false
      dhcp6: false
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 1.1.1.1
    eth1:
      match:
        macaddress: "54:52:00:1b:ed:51"
      optional: true
      addresses:
      - "192.168.0.6/24"
      dhcp4: false
      dhcp6: false
EOF

echo "3. Настройка systemd-resolved..."
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/dns.conf << 'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSSEC=no
EOF

echo "4. Применение изменений..."
netplan apply
systemctl restart systemd-networkd
systemctl restart systemd-resolved

echo "5. Ожидание 3 секунды..."
sleep 3

echo "6. Проверка DNS..."
resolvectl status
echo ""
nslookup pos.autooplata.ru

echo "7. Перезапуск backend..."
pm2 restart tradeframe-prod-backend

echo "✅ Готово! Проверьте работу через 'pm2 logs tradeframe-prod-backend'"
```

---

## 📊 Мониторинг (опционально)

Создать скрипт проверки DNS каждый час:

**Файл:** `/root/check-dns.sh`

```bash
#!/bin/bash

LOG="/var/log/dns-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Проверка DNS
DNS_CHECK=$(resolvectl status | grep "DNS Servers:" | head -1)

if echo "$DNS_CHECK" | grep -q "2a03:6f00"; then
    echo "[$DATE] ❌ ПРОБЛЕМА: Обнаружены DNS от хостера!" >> $LOG
    echo "$DNS_CHECK" >> $LOG

    # Автоматическое исправление
    systemctl restart systemd-networkd
    systemctl restart systemd-resolved
    echo "[$DATE] 🔄 Выполнен перезапуск сервисов" >> $LOG
else
    echo "[$DATE] ✅ DNS работают корректно" >> $LOG
fi

# Проверка резолвинга
if ! nslookup pos.autooplata.ru > /dev/null 2>&1; then
    echo "[$DATE] ❌ DNS не резолвит pos.autooplata.ru" >> $LOG
fi
```

**Добавить в cron:**
```bash
chmod +x /root/check-dns.sh
crontab -e

# Добавить строку:
0 * * * * /root/check-dns.sh
```

---

## 🚨 Что делать если проблема вернётся

1. **Проверить файлы конфигурации:**
   ```bash
   cat /etc/systemd/network/eth0.network.d/10-ignore-dns.conf
   cat /etc/netplan/50-cloud-init.yaml
   cat /etc/systemd/resolved.conf.d/dns.conf
   ```

2. **Проверить resolvectl:**
   ```bash
   resolvectl status
   ```
   Если видите `2a03:6f00:*` - конфигурация не применилась

3. **Переприменить настройки:**
   ```bash
   netplan apply
   systemctl restart systemd-networkd
   systemctl restart systemd-resolved
   pm2 restart tradeframe-prod-backend
   ```

4. **Проверить логи:**
   ```bash
   journalctl -u systemd-resolved --since "1 hour ago"
   journalctl -u systemd-networkd --since "1 hour ago"
   ```

---

## 📝 История изменений

**2025-10-16:**
- Применено постоянное исправление DNS
- Отключен приём DNS от DHCP в 3 местах
- Настроены Google DNS (8.8.8.8, 8.8.4.4) + Cloudflare (1.1.1.1)

---

## 📚 Дополнительная информация

**Почему проблема возникала:**
- DHCP lease обновляется каждые несколько часов
- При каждом renewal DHCP сервер передавал свои DNS
- Эти DNS переопределяли наши настройки из resolved.conf
- DNS хостера периодически падали → backend не мог подключиться к STS API

**Почему сейчас должно работать:**
- `UseDNS=false` в systemd-networkd блокирует приём DNS от DHCP
- `dhcp4-overrides: use-dns: false` в netplan делает то же самое
- Двойная защита гарантирует что настройки не будут переопределены
