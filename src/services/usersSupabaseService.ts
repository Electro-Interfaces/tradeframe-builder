/**
 * Сервис для работы с пользователями через Supabase
 * УПРОЩЕН: Убраны checkConnection и все проверки подключения
 * Прямые вызовы Supabase с четкими ошибками
 */

import { supabaseService } from './supabaseServiceClient'
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  UserStatus,
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

// Используем готовый service клиент
const supabase = supabaseService

export class UserSupabaseService {

  /**
   * Получить всех пользователей из Supabase
   */
  static async getAllUsers(includeDeleted = false): Promise<User[]> {
    console.log('🔍 UserSupabaseService.getAllUsers() called');

    try {
      let query = supabase.from('users').select(`
        *,
        roles:user_roles(
          role_id,
          role:roles(
            id,
            name,
            code,
            scope
          )
        )
      `)

      if (!includeDeleted) {
        query = query.is('deleted_at', null)
      }

      const response = await query

      if (response.error) {
        console.error('❌ Database error loading users:', response.error);
        throw new Error(`Database unavailable: ${response.error.message}`);
      }

      // Преобразуем в нужный формат
      console.log('✅ Loaded users from Supabase:', response.data?.length || 0);
      return response.data?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || 'Пользователь',
        phone: user.phone,
        status: user.is_active ? 'active' : 'inactive', // Преобразуем is_active в status
        roles: user.roles?.map((r: any) => ({
          role_id: r.role?.id,
          role_name: r.role?.name,
          role_code: r.role?.code,
          scope: r.role?.scope
        })) || [],
        permissions: [], // Получаем из ролей
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
        version: user.version || 1,
        deleted_at: user.deleted_at ? new Date(user.deleted_at) : undefined
      })) || [];

    } catch (error) {
      console.error('Критическая ошибка получения пользователей:', error);
      return [];
    }
  }

  /**
   * Получить пользователя по ID
   */
  static async getUserById(id: string): Promise<User | null> {
    console.log(`🔍 UserSupabaseService.getUserById(${id}) called`);

    try {
      const response = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            role_id,
            role:roles(
              id,
              name,
              code,
              scope,
              permissions
            )
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)

      if (response.error) {
        console.error('❌ Database error loading user by ID:', response.error);
        throw new Error(`Database unavailable: ${response.error.message}`);
      }
      
      if (!response.data?.length) {
        return null;
      }

      const user = response.data[0]
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || 'Пользователь',
        phone: user.phone,
        status: user.is_active ? 'active' : 'inactive',
        roles: user.roles?.map((r: any) => ({
          role_id: r.role?.id,
          role_name: r.role?.name,
          role_code: r.role?.code,
          scope: r.role?.scope,
          permissions: r.role?.permissions || []
        })) || [],
        permissions: user.roles?.flatMap((r: any) => r.role?.permissions || []) || [],
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
        version: user.version || 1
      }

    } catch (error) {
      console.error('❌ UserSupabaseService.getUserById error:', error);
      throw error;
    }
  }

  /**
   * Получить пользователя по email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await supabase
        .from('users')
        .select(`
          *,
          roles:user_roles(
            role_id,
            role:roles(
              id,
              name,
              code,
              scope,
              permissions
            )
          )
        `)
        .eq('email', email.toLowerCase())
        .is('deleted_at', null)

      if (response.error) {
        console.error('❌ Database error loading user by ID:', response.error);
        throw new Error(`Database unavailable: ${response.error.message}`);
      }
      
      if (!response.data?.length) {
        return null;
      }

      const user = response.data[0]
      return {
        id: user.id,
        email: user.email,
        name: user.name || user.full_name || 'Пользователь',
        phone: user.phone,
        status: user.is_active ? 'active' : 'inactive',
        roles: user.roles?.map((r: any) => ({
          role_id: r.role?.id,
          role_name: r.role?.name,
          role_code: r.role?.code,
          scope: r.role?.scope,
          permissions: r.role?.permissions || []
        })) || [],
        permissions: user.roles?.flatMap((r: any) => r.role?.permissions || []) || [],
        created_at: new Date(user.created_at),
        updated_at: new Date(user.updated_at),
        last_login: user.last_login ? new Date(user.last_login) : null,
        version: user.version || 1
      }

    } catch (error) {
      console.error('Ошибка получения пользователя по email:', error)
      return null
    }
  }

  /**
   * Создать нового пользователя
   */
  static async createUser(input: CreateUserInput & { tenantId: string, roles?: string[] }): Promise<User> {
    console.log('📝 UserSupabaseService.createUser() called');

    try {
      // Проверяем уникальность email
      const existingUser = await this.getUserByEmail(input.email)
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует')
      }

      // Создаем пользователя
      const userData = {
        email: input.email.toLowerCase(),
        name: input.name,
        phone: input.phone,
        status: input.status || 'active',
        tenant_id: input.tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }

      const userResponse = await supabase
        .from('users')
        .insert(userData)

      if (userResponse.error) {
        throw new Error(`Ошибка создания пользователя: ${userResponse.error}`)
      }

      const newUser = userResponse.data?.[0]
      if (!newUser) {
        throw new Error('Пользователь не был создан')
      }

      // Назначаем роли если указаны
      if (input.roles && input.roles.length > 0) {
        const roleAssignments = input.roles.map(roleId => ({
          user_id: newUser.id,
          role_id: roleId,
          assigned_at: new Date().toISOString()
        }))

        await supabase
          .from('user_roles')
          .insert(roleAssignments)
      }

      // Получаем созданного пользователя с ролями
      return await this.getUserById(newUser.id) || {
        ...newUser,
        roles: [],
        permissions: [],
        created_at: new Date(newUser.created_at),
        updated_at: new Date(newUser.updated_at),
        version: 1
      }

    } catch (error) {
      console.error('Ошибка создания пользователя:', error)
      throw error
    }
  }

  /**
   * Обновить пользователя
   */
  static async updateUser(id: string, updates: UpdateUserInput): Promise<User> {
    try {
      // Проверяем уникальность email при обновлении
      if (updates.email) {
        const existingUser = await this.getUserByEmail(updates.email)
        if (existingUser && existingUser.id !== id) {
          throw new Error('Пользователь с таким email уже существует')
        }
      }

      const updateData = {
        ...(updates.email && { email: updates.email.toLowerCase() }),
        ...(updates.name && { name: updates.name }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.status && { status: updates.status }),
        updated_at: new Date().toISOString(),
        version: 'version + 1' // Увеличиваем версию
      }

      const response = await supabase
        .from('users')
        .update(updateData, { id })

      if (response.error) {
        throw new Error(`Ошибка обновления пользователя: ${response.error}`)
      }

      // Возвращаем обновленного пользователя
      const updatedUser = await this.getUserById(id)
      if (!updatedUser) {
        throw new Error('Пользователь не найден после обновления')
      }

      return updatedUser

    } catch (error) {
      console.error('Ошибка обновления пользователя:', error)
      throw error
    }
  }

  /**
   * Удалить пользователя (soft delete)
   */
  static async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.getUserById(id)
      if (!user) {
        throw new Error('Пользователь не найден')
      }

      // Проверяем, что это не последний супер-админ
      const isSuperAdmin = user.roles.some(role => role.role_code === 'super_admin')
      if (isSuperAdmin) {
        const allUsers = await this.getAllUsers()
        const activeSuperAdmins = allUsers.filter(u =>
          u.status === 'active' &&
          u.id !== id &&
          u.roles.some(role => role.role_code === 'super_admin')
        )

        if (activeSuperAdmins.length === 0) {
          throw new Error('Нельзя удалить последнего супер-администратора')
        }
      }

      // Soft delete
      const response = await supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'inactive',
          updated_at: new Date().toISOString()
        }, { id })

      if (response.error) {
        throw new Error(`Ошибка удаления пользователя: ${response.error}`)
      }

    } catch (error) {
      console.error('Ошибка удаления пользователя:', error)
      throw error
    }
  }

  /**
   * Получить статистику пользователей
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    try {
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

    } catch (error) {
      console.error('Ошибка получения статистики:', error)
      return {
        totalUsers: 0,
        usersByStatus: {} as Record<UserStatus, number>,
        usersByRole: {},
        activeUsers: 0,
        newUsersThisMonth: 0,
        lastLoginActivity: []
      }
    }
  }

  /**
   * Поиск пользователей
   */
  static async searchUsers(query: string, filters?: UserSearchFilters): Promise<User[]> {
    try {
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

    } catch (error) {
      console.error('Ошибка поиска пользователей:', error)
      return []
    }
  }

  /**
   * Изменить статус пользователя
   */
  static async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    return this.updateUser(id, { status })
  }

  /**
   * Создать тестовых пользователей для демонстрации системы
   */
  static async createTestUsers(tenantId: string): Promise<User[]> {
    console.log('👥 Создание тестовых пользователей...')

    const testUsersData = [
      {
        email: 'admin@tradeframe.ru',
        name: 'Системный администратор',
        phone: '+7 (999) 123-45-67',
        status: 'active' as UserStatus,
        tenantId,
        roles: [] // Роли будут назначены отдельно
      },
      {
        email: 'manager@tradeframe.ru', 
        name: 'Менеджер сети',
        phone: '+7 (999) 234-56-78',
        status: 'active' as UserStatus,
        tenantId,
        roles: []
      },
      {
        email: 'operator@tradeframe.ru',
        name: 'Оператор АЗС',
        phone: '+7 (999) 345-67-89',
        status: 'active' as UserStatus,
        tenantId,
        roles: []
      }
    ]

    const createdUsers: User[] = []

    for (const userData of testUsersData) {
      try {
        // Проверяем, существует ли уже такой пользователь
        const existingUser = await this.getUserByEmail(userData.email)
        if (existingUser) {
          console.log(`⚠️ Пользователь ${userData.email} уже существует`)
          createdUsers.push(existingUser)
          continue
        }

        // Создаем нового пользователя
        const newUser = await this.createUser(userData)
        createdUsers.push(newUser)
        console.log(`✅ Создан пользователь: ${newUser.email}`)

      } catch (error) {
        console.error(`❌ Ошибка создания пользователя ${userData.email}:`, error)
      }
    }

    console.log(`✅ Обработано ${createdUsers.length} тестовых пользователей`)
    return createdUsers
  }
}

// Экспортируем как основной сервис пользователей
export const UserService = UserSupabaseService

// Также экспортируем класс для совместимости
export const usersSupabaseService = UserSupabaseService