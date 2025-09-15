/**
 * Сервис управления пользователями с интеграцией ролей и разрешений
 * Расширяет функциональность AuthService для CRUD операций с пользователями
 */

import { persistentStorage } from '@/utils/persistentStorage'
// Removed CryptoUtils - using simpler approach
import { AuthService } from './authService'
import { authService } from './auth/authService'
import { RoleService } from './roleService'
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserStatus,
  AuditLog,
  UserRole
} from '@/types/auth'

export interface UserSearchFilters {
  status?: UserStatus
  roleCode?: string
  tenantId?: string
}

export interface UserStatistics {
  totalUsers: number
  usersByStatus: Record<UserStatus, number>
  usersByRole: Record<string, number>
  activeUsers: number
  newUsersThisMonth: number
  lastLoginActivity: Array<{ user: User, lastLogin: Date | null }>
}

export class UserService {
  private static readonly USERS_KEY = 'tradeframe_users'
  private static readonly AUDIT_KEY = 'tradeframe_audit'

  /**
   * Получить всех пользователей
   */
  static async getAllUsers(includeDeleted = false): Promise<User[]> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    return includeDeleted ? users : users.filter(u => !u.deleted_at)
  }

  /**
   * Получить пользователя по ID (через AuthService для консистентности)
   */
  static async getUserById(id: string): Promise<User | null> {
    return await AuthService.getUserById(id)
  }

  /**
   * Получить пользователя по email (через AuthService для консистентности)
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    return await AuthService.getUserByEmail(email)
  }

  /**
   * Создать нового пользователя с назначением ролей
   */
  static async createUser(input: CreateUserInput & { tenantId: string, roles?: string[] }): Promise<User> {
    // Используем AuthService для создания базового пользователя
    const user = await AuthService.register(input)

    // Назначаем роли если указаны
    if (input.roles && input.roles.length > 0) {
      for (const roleId of input.roles) {
        try {
          await RoleService.assignRoleToUser({
            user_id: user.id,
            role_id: roleId
          })
        } catch (error) {
          console.warn(`Failed to assign role ${roleId} to user ${user.id}:`, error)
        }
      }

      // Получаем обновленного пользователя с ролями
      return await this.getUserById(user.id) || user
    }

    return user
  }

  /**
   * Обновить данные пользователя
   */
  static async updateUser(id: string, updates: UpdateUserInput): Promise<User> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const userIndex = users.findIndex(u => u.id === id && !u.deleted_at)

    if (userIndex === -1) {
      throw new Error('Пользователь не найден')
    }

    const user = users[userIndex]
    const oldValues = { ...user }

    // Проверяем уникальность email при обновлении
    if (updates.email && updates.email !== user.email) {
      const existingUser = users.find(u => u.email === updates.email && u.id !== id && !u.deleted_at)
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует')
      }
    }

    // Применяем обновления
    if (updates.email !== undefined) user.email = updates.email
    if (updates.name !== undefined) user.name = updates.name
    if (updates.phone !== undefined) user.phone = updates.phone
    if (updates.status !== undefined) user.status = updates.status

    user.updated_at = new Date()
    user.version += 1

    users[userIndex] = user
    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.Updated', 'User', user.id, {
      old_values: {
        email: oldValues.email,
        name: oldValues.name,
        phone: oldValues.phone,
        status: oldValues.status
      },
      new_values: {
        email: user.email,
        name: user.name,
        phone: user.phone,
        status: user.status
      }
    })

    return user
  }

  /**
   * Удалить пользователя (soft delete)
   */
  static async deleteUser(id: string): Promise<void> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === id && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Проверяем, что это не последний супер-админ
    const isSuperAdmin = user.roles.some(role => role.role_code === 'super_admin')
    if (isSuperAdmin) {
      const allUsers = users.filter(u => !u.deleted_at)
      const superAdmins = allUsers.filter(u => 
        u.status === 'active' && u.roles.some(role => role.role_code === 'super_admin')
      )
      
      if (superAdmins.length <= 1) {
        throw new Error('Нельзя удалить последнего супер-администратора')
      }
    }

    // Soft delete
    user.deleted_at = new Date()
    user.status = 'inactive'
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.Deleted', 'User', user.id, {
      email: user.email,
      name: user.name,
      roles: user.roles.map(r => r.role_code)
    })
  }

  /**
   * Изменить пароль пользователя
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === userId && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Проверяем текущий пароль (используем новый authService)
    const isCurrentPasswordValid = await authService.verifyPassword(user, currentPassword)
    if (!isCurrentPasswordValid) {
      throw new Error('Неверный текущий пароль')
    }

    // Генерируем новый хеш пароля (используем новый простой алгоритм)
    const newSalt = authService.generateSalt()
    const newHash = await authService.createPasswordHash(newPassword, newSalt)

    // Обновляем пароль
    user.pwd_salt = newSalt
    user.pwd_hash = newHash
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.PasswordChanged', 'User', user.id, {
      email: user.email
    })
  }

  /**
   * Обновить email пользователя (логин)
   */
  static async changeEmail(userId: string, newEmail: string): Promise<User> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === userId && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Проверяем уникальность email
    const existingUser = users.find(u => u.email === newEmail && u.id !== userId && !u.deleted_at)
    if (existingUser) {
      throw new Error('Email уже используется')
    }

    const oldEmail = user.email
    user.email = newEmail
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.EmailChanged', 'User', user.id, {
      oldEmail,
      newEmail
    })

    return user
  }

  /**
   * Сохранить пользовательские предпочтения
   */
  static async updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<User> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === userId && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Объединяем с существующими предпочтениями
    user.preferences = {
      ...user.preferences,
      ...preferences
    }
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    return user
  }

  /**
   * Изменить статус пользователя
   */
  static async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === id && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const oldStatus = user.status

    // Проверяем, что это не последний активный супер-админ при деактивации
    if (status !== 'active') {
      const isSuperAdmin = user.roles.some(role => role.role_code === 'super_admin')
      if (isSuperAdmin) {
        const allUsers = users.filter(u => !u.deleted_at)
        const activeSuperAdmins = allUsers.filter(u => 
          u.status === 'active' && 
          u.id !== id &&
          u.roles.some(role => role.role_code === 'super_admin')
        )
        
        if (activeSuperAdmins.length === 0) {
          throw new Error('Нельзя деактивировать последнего активного супер-администратора')
        }
      }
    }

    user.status = status
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.Status.Changed', 'User', user.id, {
      old_status: oldStatus,
      new_status: status,
      email: user.email
    })

    return user
  }

  /**
   * Поиск пользователей
   */
  static async searchUsers(query: string, filters?: UserSearchFilters): Promise<User[]> {
    const users = await this.getAllUsers()
    
    let filtered = users

    // Применяем фильтры
    if (filters?.status) {
      filtered = filtered.filter(u => u.status === filters.status)
    }

    if (filters?.roleCode) {
      filtered = filtered.filter(u => 
        u.roles.some(role => role.role_code === filters.roleCode)
      )
    }

    if (filters?.tenantId) {
      filtered = filtered.filter(u => u.tenant_id === filters.tenantId)
    }

    // Применяем текстовый поиск
    if (query.trim()) {
      const searchQuery = query.toLowerCase().trim()
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery) ||
        (u.phone && u.phone.includes(searchQuery)) ||
        u.roles.some(role => role.role_name.toLowerCase().includes(searchQuery))
      )
    }

    return filtered
  }

  /**
   * Получить статистику пользователей
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    const users = await this.getAllUsers()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Подсчет по статусам
    const usersByStatus = users.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1
      return acc
    }, {} as Record<UserStatus, number>)

    // Подсчет по ролям
    const usersByRole = users.reduce((acc, user) => {
      user.roles.forEach(role => {
        acc[role.role_name] = (acc[role.role_name] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    // Новые пользователи за месяц
    const newUsersThisMonth = users.filter(u => 
      u.created_at >= startOfMonth
    ).length

    // Активность последних входов
    const lastLoginActivity = users
      .map(user => ({
        user,
        lastLogin: user.last_login || null
      }))
      .sort((a, b) => {
        if (!a.lastLogin && !b.lastLogin) return 0
        if (!a.lastLogin) return 1
        if (!b.lastLogin) return -1
        return b.lastLogin.getTime() - a.lastLogin.getTime()
      })
      .slice(0, 20)

    return {
      totalUsers: users.length,
      usersByStatus,
      usersByRole,
      activeUsers: usersByStatus.active || 0,
      newUsersThisMonth,
      lastLoginActivity
    }
  }

  /**
   * Сбросить пароль пользователя (генерировать временный)
   */
  static async resetUserPassword(userId: string): Promise<string> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const user = users.find(u => u.id === userId && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Генерируем временный пароль (используем новый простой алгоритм)
    const temporaryPassword = Math.random().toString(36).substring(2, 10)
    const newSalt = authService.generateSalt()
    const newHash = await authService.createPasswordHash(temporaryPassword, newSalt)

    user.pwd_hash = newHash
    user.pwd_salt = newSalt
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.Password.Reset', 'User', user.id, {
      email: user.email,
      reset_by: 'admin' // TODO: получать текущего пользователя
    })

    return temporaryPassword
  }

  /**
   * Получить роли пользователя
   */
  static async getUserRoles(userId: string): Promise<UserRole[]> {
    const user = await this.getUserById(userId)
    return user?.roles || []
  }

  /**
   * Массовое обновление пользователей
   */
  static async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<Pick<UpdateUserInput, 'status'>>
  ): Promise<User[]> {
    const users = await persistentStorage.getItem<User[]>(this.USERS_KEY) || []
    const updatedUsers: User[] = []

    for (const userId of userIds) {
      const user = users.find(u => u.id === userId && !u.deleted_at)
      if (!user) continue

      const oldValues = { status: user.status }

      if (updates.status !== undefined) {
        user.status = updates.status
      }

      user.updated_at = new Date()
      user.version += 1

      updatedUsers.push(user)

      await this.logAudit('User.Bulk.Updated', 'User', user.id, {
        old_values: oldValues,
        new_values: { status: user.status }
      })
    }

    if (updatedUsers.length > 0) {
      await persistentStorage.setItem(this.USERS_KEY, users)
    }

    return updatedUsers
  }

  /**
   * Получить пользователей с истекающими ролями
   */
  static async getUsersWithExpiringRoles(daysAhead: number = 7): Promise<Array<{
    user: User
    expiringRoles: UserRole[]
  }>> {
    const users = await this.getAllUsers()
    const checkDate = new Date()
    checkDate.setDate(checkDate.getDate() + daysAhead)

    const result: Array<{ user: User, expiringRoles: UserRole[] }> = []

    users.forEach(user => {
      const expiringRoles = user.roles.filter(role => 
        role.expires_at && role.expires_at <= checkDate
      )

      if (expiringRoles.length > 0) {
        result.push({ user, expiringRoles })
      }
    })

    return result
  }

  /**
   * Создать тестовых пользователей
   */
  static async createTestUsers(tenantId: string): Promise<User[]> {
    const existingUsers = await this.getAllUsers()
    
    // Получаем роли для назначения
    const roles = await RoleService.getAllRoles()
    const superAdminRole = roles.find(r => r.code === 'super_admin')
    const networkAdminRole = roles.find(r => r.code === 'network_admin')
    const pointManagerRole = roles.find(r => r.code === 'point_manager')
    const operatorRole = roles.find(r => r.code === 'operator')
    const driverRole = roles.find(r => r.code === 'driver')

    const testUsersData = [
      {
        email: 'admin@tradeframe.ru',
        name: 'Максим Администраторов',
        password: 'Admin123!',
        roleId: superAdminRole?.id
      },
      {
        email: 'manager@bto.ru',
        name: 'Елена Петрова',
        password: 'Manager123!',
        roleId: networkAdminRole?.id
      },
      {
        email: 'manager.point1@demo-azs.ru',
        name: 'Иван Сидоров',
        password: 'Point123!',
        roleId: pointManagerRole?.id
      },
      {
        email: 'operator1@demo-azs.ru',
        name: 'Мария Козлова',
        password: 'Operator123!',
        roleId: operatorRole?.id
      },
      {
        email: 'driver.petrov@logistics.ru',
        name: 'Алексей Петров',
        password: 'Driver123!',
        roleId: driverRole?.id
      },
      {
        email: 'operator2@demo-azs.ru',
        name: 'Анна Морозова',
        password: 'Operator123!',
        status: 'inactive' as UserStatus,
        roleId: operatorRole?.id
      }
    ]

    const createdUsers: User[] = []

    for (const userData of testUsersData) {
      // Проверяем, что пользователь еще не существует
      const existingUser = existingUsers.find(u => u.email === userData.email)
      if (existingUser) continue

      try {
        const user = await this.createUser({
          tenantId,
          email: userData.email,
          name: userData.name,
          password: userData.password,
          status: (userData.status as UserStatus) || 'active',
          roles: userData.roleId ? [userData.roleId] : []
        })

        createdUsers.push(user)
      } catch (error) {
        console.warn(`Failed to create test user ${userData.email}:`, error)
      }
    }

    if (createdUsers.length > 0) {
      await this.logAudit('System.TestUsers.Created', 'System', undefined, {
        users_created: createdUsers.map(u => u.email)
      })
    }

    return createdUsers
  }

  /**
   * Записать событие в аудит
   */
  private static async logAudit(
    action: string,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const auditLogs = await persistentStorage.getItem<AuditLog[]>(this.AUDIT_KEY) || []
    
    const log: AuditLog = {
      id: `audit_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`,
      tenant_id: 'system', // TODO: получать из контекста
      action,
      entity_type: entityType,
      entity_id: entityId,
      new_values: details,
      created_at: new Date()
    }

    auditLogs.push(log)
    
    // Сохраняем только последние 1000 записей
    if (auditLogs.length > 1000) {
      auditLogs.splice(0, auditLogs.length - 1000)
    }

    await persistentStorage.setItem(this.AUDIT_KEY, auditLogs)
  }
}