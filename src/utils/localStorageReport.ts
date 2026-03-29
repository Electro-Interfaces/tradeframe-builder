/**
 * Утилита для создания детального отчета о данных в localStorage
 */

export class LocalStorageReport {
  /**
   * Генерировать полный отчет о состоянии localStorage
   */
  static generateReport(): void {
    console.log('=' .repeat(60));

    // 1. Общая статистика
    const stats = this.getStorageStatistics();
    console.log(`- Всего ключей: ${stats.totalKeys}`);
    console.log(`- TradePoint ключей: ${stats.tradeframeKeys}`);
    console.log(`- Размер данных: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`- Использование: ${stats.usagePercent.toFixed(1)}%`);

    // 2. Анализ каждого ключа
    stats.keys.forEach(keyInfo => {
      console.log(`   Размер: ${(keyInfo.size / 1024).toFixed(2)} KB`);
      console.log(`   Записей: ${keyInfo.count}`);
      console.log(`   Последнее изменение: ${keyInfo.lastModified}`);
      
      if (keyInfo.preview) {
        console.log('   Превью данных:', keyInfo.preview);
      }
    });

    // 3. Детальный анализ пользователей
    const users = this.analyzeUsers();
    if (users.length > 0) {
      console.log('=' .repeat(60));
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Статус: ${user.status}`);
        console.log(`   Роли: ${user.roles.map(r => r.role_name).join(', ')}`);
        console.log(`   Последний вход: ${user.last_login ? new Date(user.last_login).toLocaleString('ru-RU') : 'Никогда'}`);
      });
    }

    // 4. Детальный анализ ролей
    const roles = this.analyzeRoles();
    if (roles.length > 0) {
      console.log('=' .repeat(60));
      roles.forEach((role, index) => {
        console.log(`\n${index + 1}. ${role.name} (${role.code})`);
        console.log(`   ID: ${role.id}`);
        console.log(`   Описание: ${role.description}`);
        console.log(`   Область: ${role.scope}`);
        console.log(`   Тип: ${role.is_system ? 'Системная' : 'Пользовательская'}`);
        console.log(`   Активна: ${role.is_active ? 'Да' : 'Нет'}`);
        console.log(`   Разрешений: ${role.permissions.length}`);
        
        // Детализация разрешений
        if (role.permissions.length > 0 && role.permissions.length <= 5) {
          console.log('   Разрешения:');
          role.permissions.forEach(perm => {
            console.log(`     - ${perm.section}.${perm.resource}: [${perm.actions.join(', ')}]`);
          });
        }
      });
    }

    // 5. Анализ сессий
    const sessions = this.analyzeSessions();
    if (sessions.length > 0) {
      console.log('=' .repeat(60));
      sessions.forEach((session, index) => {
        console.log(`\n${index + 1}. Сессия ${session.id}`);
        console.log(`   Пользователь: ${session.user_id}`);
        console.log(`   Создана: ${new Date(session.issued_at).toLocaleString('ru-RU')}`);
        console.log(`   Истекает: ${new Date(session.expires_at).toLocaleString('ru-RU')}`);
        console.log(`   Активна: ${session.is_active ? 'Да' : 'Нет'}`);
      });
    }

    // 6. Проверка целостности данных
    console.log('=' .repeat(60));
    const integrity = this.checkDataIntegrity();
    integrity.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    });

    console.log('\n' + '=' .repeat(60));
  }

  /**
   * Получить статистику по хранилищу
   */
  private static getStorageStatistics(): any {
    const keys: any[] = [];
    let totalSize = 0;
    let tradeframeKeys = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      const size = (key.length + (value?.length || 0)) * 2;
      totalSize += size;

      if (key.startsWith('tradeframe_')) {
        tradeframeKeys++;
        
        let count = 0;
        let lastModified = 'Unknown';
        let preview = null;

        try {
          const parsed = JSON.parse(value || '{}');
          
          if (parsed.data && Array.isArray(parsed.data)) {
            count = parsed.data.length;
          }
          
          if (parsed.metadata?.lastModified) {
            lastModified = new Date(parsed.metadata.lastModified).toLocaleString('ru-RU');
          }

          // Создаем превью для разных типов данных
          const keyName = key.replace('tradeframe_', '');
          if (keyName === 'users' && parsed.data?.[0]) {
            preview = `${count} пользователей`;
          } else if (keyName === 'roles' && parsed.data?.[0]) {
            preview = `${count} ролей`;
          } else if (keyName === 'sessions' && parsed.data?.[0]) {
            const activeSessions = parsed.data.filter((s: any) => s.is_active).length;
            preview = `${activeSessions} активных из ${count}`;
          }
        } catch (error) {
          // Игнорируем ошибки парсинга
        }

        keys.push({
          key,
          size,
          count,
          lastModified,
          preview
        });
      }
    }

    const limitBytes = 5 * 1024 * 1024; // 5MB
    const usagePercent = (totalSize / limitBytes) * 100;

    return {
      totalKeys: localStorage.length,
      tradeframeKeys,
      totalSize,
      usagePercent,
      keys
    };
  }

  /**
   * Анализировать пользователей
   */
  private static analyzeUsers(): any[] {
    try {
      const stored = localStorage.getItem('tradeframe_users');
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Анализировать роли
   */
  private static analyzeRoles(): any[] {
    try {
      const stored = localStorage.getItem('tradeframe_roles');
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Анализировать сессии
   */
  private static analyzeSessions(): any[] {
    try {
      const stored = localStorage.getItem('tradeframe_sessions');
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Проверить целостность данных
   */
  private static checkDataIntegrity(): Array<{name: string, passed: boolean, message: string}> {
    const checks: Array<{name: string, passed: boolean, message: string}> = [];

    // Проверка наличия критических ключей
    const requiredKeys = ['tradeframe_users', 'tradeframe_roles'];
    requiredKeys.forEach(key => {
      const exists = localStorage.getItem(key) !== null;
      checks.push({
        name: `Ключ ${key}`,
        passed: exists,
        message: exists ? 'Найден' : 'Отсутствует'
      });
    });

    // Проверка структуры данных
    try {
      const users = JSON.parse(localStorage.getItem('tradeframe_users') || '{}');
      const hasUserData = users.data && Array.isArray(users.data);
      checks.push({
        name: 'Структура пользователей',
        passed: hasUserData,
        message: hasUserData ? `${users.data.length} записей` : 'Некорректная структура'
      });
    } catch (error) {
      checks.push({
        name: 'Структура пользователей',
        passed: false,
        message: 'Ошибка парсинга'
      });
    }

    try {
      const roles = JSON.parse(localStorage.getItem('tradeframe_roles') || '{}');
      const hasRoleData = roles.data && Array.isArray(roles.data);
      checks.push({
        name: 'Структура ролей',
        passed: hasRoleData,
        message: hasRoleData ? `${roles.data.length} записей` : 'Некорректная структура'
      });
    } catch (error) {
      checks.push({
        name: 'Структура ролей',
        passed: false,
        message: 'Ошибка парсинга'
      });
    }

    // Проверка системных ролей
    try {
      const roles = JSON.parse(localStorage.getItem('tradeframe_roles') || '{}');
      if (roles.data && Array.isArray(roles.data)) {
        const systemRoles = roles.data.filter((r: any) => r.is_system);
        const hasAllSystemRoles = systemRoles.length >= 5;
        checks.push({
          name: 'Системные роли',
          passed: hasAllSystemRoles,
          message: `${systemRoles.length} из 5 системных ролей`
        });
      }
    } catch (error) {
      // Игнорируем
    }

    // Проверка супер-администратора
    try {
      const users = JSON.parse(localStorage.getItem('tradeframe_users') || '{}');
      if (users.data && Array.isArray(users.data)) {
        const superAdmin = users.data.find((u: any) => 
          u.roles?.some((r: any) => r.role_code === 'super_admin')
        );
        checks.push({
          name: 'Супер-администратор',
          passed: !!superAdmin,
          message: superAdmin ? `${superAdmin.email}` : 'Не найден'
        });
      }
    } catch (error) {
      // Игнорируем
    }

    return checks;
  }

  /**
   * Очистить все данные auth системы
   */
  static clearAuthData(): void {
    const keysToRemove = [
      'tradeframe_users',
      'tradeframe_roles',
      'tradeframe_sessions',
      'tradeframe_audit',
      'tradeframe_session'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

  }
}

// Автоматический запуск отчета при загрузке в development
if (import.meta.env.DEV) {
  // Добавляем команды в глобальный объект для удобства
  (window as any).authReport = () => LocalStorageReport.generateReport();
  (window as any).clearAuth = () => LocalStorageReport.clearAuthData();
  
  console.log('   authReport() - полный отчет о данных auth системы');
  console.log('   clearAuth() - очистить все данные auth системы');
}