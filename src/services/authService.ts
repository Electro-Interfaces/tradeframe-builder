/**
 * Сервис авторизации с поддержкой мультитенантности и гранулярных разрешений
 * Использует localStorage для хранения и WebCrypto для хеширования паролей
 */

import { CryptoUtils, type PasswordHash } from '@/utils/crypto'
import { PermissionChecker } from '@/utils/permissions'
import { persistentStorage } from '@/utils/persistentStorage'
import type {
  User,
  Session,
  Role,
  UserRole,
  LoginCredentials,
  CreateUserInput,
  ChangePasswordInput,
  PermissionAction,
  AuditLog
} from '@/types/auth'

export class AuthService {
  private static readonly SESSION_KEY = 'tradeframe_session'
  private static readonly USERS_KEY = 'tradeframe_users'
  private static readonly SESSIONS_KEY = 'tradeframe_sessions'
  private static readonly AUDIT_KEY = 'tradeframe_audit'
  
  private static readonly SESSION_DURATION = 8 * 60 * 60 * 1000 // 8 часов
  private static readonly REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 дней

  /**
   * Авторизация пользователя
   */
  static async login(credentials: LoginCredentials): Promise<{
    user: User
    session: Session
    token: string
  }> {
    const users = await this.getUsers()
    const user = users.find(u => u.email === credentials.email && u.status === 'active' && !u.deleted_at)

    if (!user) {
      await this.logAudit('Auth.Login.Failed', 'User', undefined, { 
        email: credentials.email,
        reason: 'User not found or inactive' 
      })
      throw new Error('Неверный email или пароль')
    }

    // Проверяем пароль
    const isValidPassword = await CryptoUtils.verifyPassword(
      credentials.password,
      user.pwd_hash,
      user.pwd_salt
    )

    if (!isValidPassword) {
      await this.logAudit('Auth.Login.Failed', 'User', user.id, {
        email: credentials.email,
        reason: 'Invalid password'
      })
      throw new Error('Неверный email или пароль')
    }

    // Создаем сессию
    const now = new Date()
    const session: Session = {
      id: CryptoUtils.generateSessionToken(),
      user_id: user.id,
      tenant_id: user.tenant_id,
      issued_at: now,
      expires_at: new Date(now.getTime() + this.SESSION_DURATION),
      refresh_expires_at: new Date(now.getTime() + this.REFRESH_DURATION),
      is_active: true
    }

    // Обновляем время последнего входа
    await this.updateUserLastLogin(user.id)

    // Сохраняем сессию
    await this.saveSession(session)

    // Создаем токен для localStorage
    const tokenData = {
      user_id: user.id,
      tenant_id: user.tenant_id,
      issued_at: session.issued_at.getTime(),
      expires_at: session.expires_at.getTime()
    }
    const token = CryptoUtils.createSessionData(tokenData)

    await this.logAudit('Auth.Login.Success', 'User', user.id, {
      email: user.email,
      session_id: session.id
    })

    return { user, session, token }
  }

  /**
   * Выход из системы
   */
  static async logout(sessionId?: string): Promise<void> {
    const currentSession = sessionId ? 
      await this.getSessionById(sessionId) : 
      await this.getCurrentSession()

    if (currentSession) {
      // Деактивируем сессию
      await this.deactivateSession(currentSession.id)
      
      await this.logAudit('Auth.Logout.Success', 'User', currentSession.user_id, {
        session_id: currentSession.id
      })
    }

    // Очищаем localStorage
    localStorage.removeItem(this.SESSION_KEY)
  }

  /**
   * Регистрация нового пользователя
   */
  static async register(input: CreateUserInput): Promise<User> {
    const users = await this.getUsers()
    
    // Проверяем уникальность email
    const existingUser = users.find(u => u.email === input.email && !u.deleted_at)
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует')
    }

    // Валидируем пароль
    const passwordValidation = CryptoUtils.validatePasswordStrength(input.password)
    if (!passwordValidation.isValid) {
      throw new Error(`Слабый пароль: ${passwordValidation.errors.join(', ')}`)
    }

    // Хешируем пароль
    const passwordHash = await CryptoUtils.hashPassword(input.password)

    // Создаем пользователя
    const now = new Date()
    const user: User = {
      id: CryptoUtils.generateSecureId(),
      tenant_id: input.tenant_id || 'default', // TODO: получать из контекста
      email: input.email,
      name: input.name,
      phone: input.phone,
      status: input.status || 'active',
      roles: [], // роли будут назначены отдельно
      pwd_salt: passwordHash.salt,
      pwd_hash: passwordHash.hash,
      created_at: now,
      updated_at: now,
      version: 1
    }

    // Сохраняем пользователя
    users.push(user)
    await persistentStorage.setItem(this.USERS_KEY, users)

    await this.logAudit('User.Created', 'User', user.id, {
      email: user.email,
      name: user.name
    })

    return user
  }

  /**
   * Получить текущего пользователя
   */
  static async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession()
    if (!session) return null

    return await this.getUserById(session.user_id)
  }

  /**
   * Получить текущую сессию
   */
  static async getCurrentSession(): Promise<Session | null> {
    const token = localStorage.getItem(this.SESSION_KEY)
    if (!token) return null

    const sessionData = CryptoUtils.parseSessionData(token)
    if (!sessionData || !CryptoUtils.isSessionValid(token)) {
      localStorage.removeItem(this.SESSION_KEY)
      return null
    }

    const session = await this.getSessionById(`session_${sessionData.user_id}`)
    if (!session || !session.is_active) {
      localStorage.removeItem(this.SESSION_KEY)
      return null
    }

    return session
  }

  /**
   * Обновить сессию (refresh token)
   */
  static async refreshSession(): Promise<string | null> {
    const currentSession = await this.getCurrentSession()
    if (!currentSession) return null

    const now = new Date()
    
    // Проверяем, не истек ли refresh token
    if (now > currentSession.refresh_expires_at) {
      await this.logout(currentSession.id)
      return null
    }

    // Продлеваем сессию
    currentSession.expires_at = new Date(now.getTime() + this.SESSION_DURATION)
    await this.saveSession(currentSession)

    // Создаем новый токен
    const tokenData = {
      user_id: currentSession.user_id,
      tenant_id: currentSession.tenant_id,
      issued_at: currentSession.issued_at.getTime(),
      expires_at: currentSession.expires_at.getTime()
    }
    const token = CryptoUtils.createSessionData(tokenData)
    localStorage.setItem(this.SESSION_KEY, token)

    return token
  }

  /**
   * Проверить разрешение пользователя
   */
  static async hasPermission(
    section: string,
    resource: string,
    action: PermissionAction,
    context?: Record<string, any>
  ): Promise<boolean> {
    const user = await this.getCurrentUser()
    return PermissionChecker.hasPermission(user, section, resource, action, context)
  }

  /**
   * Изменить пароль
   */
  static async changePassword(input: ChangePasswordInput): Promise<void> {
    const users = await this.getUsers()
    const user = users.find(u => u.id === input.user_id && !u.deleted_at)

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    // Проверяем старый пароль
    const isValidOldPassword = await CryptoUtils.verifyPassword(
      input.old_password,
      user.pwd_hash,
      user.pwd_salt
    )

    if (!isValidOldPassword) {
      await this.logAudit('Auth.Password.Change.Failed', 'User', user.id, {
        reason: 'Invalid old password'
      })
      throw new Error('Неверный текущий пароль')
    }

    // Валидируем новый пароль
    const passwordValidation = CryptoUtils.validatePasswordStrength(input.new_password)
    if (!passwordValidation.isValid) {
      throw new Error(`Слабый пароль: ${passwordValidation.errors.join(', ')}`)
    }

    // Хешируем новый пароль
    const newPasswordHash = await CryptoUtils.hashPassword(input.new_password)

    // Обновляем пароль
    user.pwd_hash = newPasswordHash.hash
    user.pwd_salt = newPasswordHash.salt
    user.updated_at = new Date()
    user.version += 1

    await persistentStorage.setItem(this.USERS_KEY, users)

    // Деактивируем все сессии пользователя (принудительный re-login)
    await this.deactivateAllUserSessions(user.id)

    await this.logAudit('Auth.Password.Changed', 'User', user.id, {
      email: user.email
    })
  }

  /**
   * Получить всех пользователей
   */
  private static async getUsers(): Promise<User[]> {
    return await persistentStorage.getItem(this.USERS_KEY) || []
  }

  /**
   * Получить пользователя по ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find(u => u.id === id && !u.deleted_at) || null
  }

  /**
   * Получить пользователя по email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find(u => u.email === email && !u.deleted_at) || null
  }

  /**
   * Сохранить сессию
   */
  private static async saveSession(session: Session): Promise<void> {
    const sessions = await persistentStorage.getItem<Session[]>(this.SESSIONS_KEY) || []
    const existingIndex = sessions.findIndex(s => s.id === session.id)
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session
    } else {
      sessions.push(session)
    }

    await persistentStorage.setItem(this.SESSIONS_KEY, sessions)
    
    // Сохраняем также в localStorage для быстрого доступа
    const tokenData = {
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      issued_at: session.issued_at.getTime(),
      expires_at: session.expires_at.getTime()
    }
    localStorage.setItem(this.SESSION_KEY, CryptoUtils.createSessionData(tokenData))
  }

  /**
   * Получить сессию по ID
   */
  private static async getSessionById(id: string): Promise<Session | null> {
    const sessions = await persistentStorage.getItem<Session[]>(this.SESSIONS_KEY) || []
    return sessions.find(s => s.id === id) || null
  }

  /**
   * Деактивировать сессию
   */
  private static async deactivateSession(sessionId: string): Promise<void> {
    const sessions = await persistentStorage.getItem<Session[]>(this.SESSIONS_KEY) || []
    const session = sessions.find(s => s.id === sessionId)
    
    if (session) {
      session.is_active = false
      await persistentStorage.setItem(this.SESSIONS_KEY, sessions)
    }
  }

  /**
   * Деактивировать все сессии пользователя
   */
  private static async deactivateAllUserSessions(userId: string): Promise<void> {
    const sessions = await persistentStorage.getItem<Session[]>(this.SESSIONS_KEY) || []
    const userSessions = sessions.filter(s => s.user_id === userId)
    
    userSessions.forEach(session => {
      session.is_active = false
    })

    await persistentStorage.setItem(this.SESSIONS_KEY, sessions)
  }

  /**
   * Обновить время последнего входа
   */
  private static async updateUserLastLogin(userId: string): Promise<void> {
    const users = await this.getUsers()
    const user = users.find(u => u.id === userId)
    
    if (user) {
      user.last_login = new Date()
      user.updated_at = new Date()
      await persistentStorage.setItem(this.USERS_KEY, users)
    }
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
    const currentUser = await this.getCurrentUser()
    
    const log: AuditLog = {
      id: CryptoUtils.generateSecureId(),
      tenant_id: currentUser?.tenant_id || 'system',
      user_id: currentUser?.id,
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

  /**
   * Очистить просроченные сессии
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const sessions = await persistentStorage.getItem<Session[]>(this.SESSIONS_KEY) || []
    const now = new Date()
    
    const activeSessions = sessions.filter(s => s.refresh_expires_at > now)
    await persistentStorage.setItem(this.SESSIONS_KEY, activeSessions)
  }
}