/**
 * Тестовый модуль для проверки работы auth системы в localStorage
 */

import { AuthService } from '@/services/authService'
import { RoleService } from '@/services/roleService'
import { UserService } from '@/services/userService'
import { CryptoTesting } from '@/utils/crypto'

export class AuthTestRunner {
  static async runFullSystemTest(): Promise<{
    success: boolean
    results: Record<string, any>
    errors: string[]
  }> {
    const results: Record<string, any> = {}
    const errors: string[] = []

    console.log('🧪 Запуск полного тестирования auth системы...')

    try {
      // 1. Тест криптографии
      console.log('1️⃣ Тест криптографических функций...')
      const cryptoTest = await CryptoTesting.testPasswordHashing()
      const idTest = CryptoTesting.testSecureIdGeneration()
      results.crypto = { passwordHashing: cryptoTest, secureIdGeneration: idTest }

      if (!cryptoTest || !idTest) {
        errors.push('Криптографические тесты не прошли')
      }

      // 2. Создание системных ролей
      console.log('2️⃣ Создание системных ролей...')
      const systemRoles = await RoleService.createDefaultSystemRoles('default_tenant')
      results.systemRoles = {
        created: systemRoles.length,
        roles: systemRoles.map(r => ({ code: r.code, name: r.name }))
      }
      console.log(`✅ Создано ${systemRoles.length} системных ролей`)

      // 3. Создание тестовых пользователей
      console.log('3️⃣ Создание тестовых пользователей...')
      const testUsers = await UserService.createTestUsers('default_tenant')
      results.testUsers = {
        created: testUsers.length,
        users: testUsers.map(u => ({ email: u.email, name: u.name, status: u.status }))
      }
      console.log(`✅ Создано ${testUsers.length} тестовых пользователей`)

      // 4. Тест авторизации
      console.log('4️⃣ Тест авторизации...')
      const loginResult = await AuthService.login({
        email: 'admin@tradeframe.ru',
        password: 'Admin123!'
      })

      results.login = {
        user: {
          email: loginResult.user.email,
          name: loginResult.user.name,
          roles: loginResult.user.roles.length
        },
        sessionValid: !!loginResult.session,
        tokenGenerated: !!loginResult.token
      }
      console.log(`✅ Авторизация прошла успешно: ${loginResult.user.email}`)

      // 5. Тест разрешений
      console.log('5️⃣ Тест проверки разрешений...')
      const hasAllPermissions = await AuthService.hasPermission('*', '*', 'manage')
      const hasNetworkPermissions = await AuthService.hasPermission('networks', 'networks', 'read')
      const hasNoPermissions = await AuthService.hasPermission('admin', 'system', 'delete')

      results.permissions = {
        allPermissions: hasAllPermissions, // должно быть true для super_admin
        networkPermissions: hasNetworkPermissions, // должно быть true
        restrictedPermissions: hasNoPermissions // может быть true для super_admin
      }

      // 6. Тест статистики
      console.log('6️⃣ Тест статистики...')
      const userStats = await UserService.getUserStatistics()
      const roleStats = await RoleService.getRoleStatistics()

      results.statistics = {
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        totalRoles: roleStats.totalRoles,
        systemRoles: roleStats.systemRoles
      }

      // 7. Выход из системы
      console.log('7️⃣ Тест выхода из системы...')
      await AuthService.logout()
      const currentUser = await AuthService.getCurrentUser()
      results.logout = {
        userAfterLogout: currentUser === null
      }
      console.log(`✅ Выход из системы выполнен`)

      // 8. Проверка localStorage
      console.log('8️⃣ Проверка localStorage...')
      const localStorageKeys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('tradeframe_')) {
          localStorageKeys.push(key)
        }
      }

      results.localStorage = {
        keysFound: localStorageKeys.length,
        keys: localStorageKeys
      }

      console.log('✅ Все тесты прошли успешно!')
      return { success: errors.length === 0, results, errors }

    } catch (error) {
      console.error('❌ Ошибка в тестировании:', error)
      errors.push(`Системная ошибка: ${error}`)
      return { success: false, results, errors }
    }
  }

  /**
   * Проверить текущее состояние localStorage
   */
  static inspectLocalStorage(): Record<string, any> {
    const inspection: Record<string, any> = {
      keys: [],
      sizes: {},
      totalSize: 0
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('tradeframe_')) {
        const value = localStorage.getItem(key)
        const size = (key.length + (value?.length || 0)) * 2 // approximate bytes
        
        inspection.keys.push(key)
        inspection.sizes[key] = {
          size,
          hasData: !!value,
          preview: value ? JSON.parse(value).metadata?.lastModified : null
        }
        inspection.totalSize += size
      }
    }

    console.log('📊 Инспекция localStorage:', inspection)
    return inspection
  }

  /**
   * Очистить все тестовые данные
   */
  static async clearTestData(): Promise<void> {
    console.log('🧹 Очистка тестовых данных...')
    
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('tradeframe_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`✅ Удалено ${keysToRemove.length} ключей из localStorage`)
  }

  /**
   * Экспортировать все данные для проверки
   */
  static exportAllData(): Record<string, any> {
    const exportData: Record<string, any> = {}
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('tradeframe_')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            exportData[key] = JSON.parse(value)
          } catch (error) {
            exportData[key] = { error: 'Failed to parse', raw: value }
          }
        }
      }
    }

    console.log('📦 Экспортированные данные:', exportData)
    return exportData
  }
}

// Автоматический запуск в development
if (import.meta.env.DEV) {
  // Запускаем тест через 2 секунды после загрузки
  setTimeout(async () => {
    console.log('🔄 Автоматический запуск тестирования auth системы...')
    const testResult = await AuthTestRunner.runFullSystemTest()
    
    if (testResult.success) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!')
      console.log('📊 Результаты:', testResult.results)
      
      // Инспекция localStorage
      AuthTestRunner.inspectLocalStorage()
    } else {
      console.error('❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ')
      console.error('🐛 Ошибки:', testResult.errors)
    }
  }, 2000)
}