/**
 * Типы для системы авторизации и управления разрешениями
 * Поддержка мультитенантности, гранулярных разрешений и soft-delete
 */

export type PermissionAction = 'read' | 'write' | 'delete' | 'manage' | 'view_menu'
export type RoleScope = 'global' | 'network' | 'trading_point' | 'assigned'
export type UserStatus = 'active' | 'inactive' | 'blocked'

export interface PermissionCondition {
  field: string                    // поле для проверки
  operator: '=' | '!=' | 'in' | 'not_in' | 'contains' | 'starts_with'
  value: any                       // значение условия
}

export interface Permission {
  section: string                  // раздел системы (networks, operations, etc.)
  resource: string                 // конкретный ресурс (trading_points, transactions, etc.)
  actions: PermissionAction[]      // массив разрешенных действий
  conditions?: PermissionCondition[] // дополнительные условия доступа
}

export interface Role {
  id: string
  tenant_id: string
  code: string                     // уникальный код роли
  name: string                     // отображаемое имя
  description: string
  permissions: Permission[]        // гранулярные разрешения
  scope: RoleScope                 // область действия роли
  scope_values?: string[]          // конкретные значения области (ID сетей/точек)
  is_system: boolean              // системная роль (нельзя удалить/изменить)
  is_active: boolean              // активность роли
  created_at: Date
  updated_at: Date
  deleted_at?: Date               // soft delete
}

export interface UserRole {
  role_id: string                 // ID роли
  role_code: string               // код роли для быстрого доступа
  role_name: string               // название роли для отображения
  scope: RoleScope                // область действия
  scope_value?: string            // конкретное значение области
  permissions: Permission[]       // кэшированные разрешения роли
  assigned_at: Date              // когда назначена
  assigned_by?: string           // кем назначена (user_id)
  expires_at?: Date              // срок действия (опционально)
}

export interface UserPreferences {
  lastSelectedNetwork?: string     // последняя выбранная сеть
  lastSelectedTradingPoint?: string // последняя выбранная торговая точка
  theme?: 'light' | 'dark' | 'auto' // тема интерфейса
  language?: 'ru' | 'en'           // язык интерфейса
  dashboardLayout?: string          // настройки дашборда
  [key: string]: any                // дополнительные настройки
}

export interface User {
  id: string
  tenant_id: string
  email: string
  name: string
  phone?: string
  status: UserStatus
  roles: UserRole[]               // множественные роли
  direct_permissions?: Permission[] // прямые разрешения (override ролей)
  preferences?: UserPreferences   // пользовательские настройки
  pwd_salt: string
  pwd_hash: string
  last_login?: Date
  created_at: Date
  updated_at: Date
  deleted_at?: Date               // soft delete
}

export interface Session {
  id: string                      // session ID
  user_id: string
  tenant_id: string
  issued_at: Date
  expires_at: Date
  refresh_expires_at: Date
  user_agent?: string
  ip_address?: string
  is_active: boolean
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id?: string
  action: string                  // Auth.Login.Success, User.Created, Role.Updated, etc.
  entity_type: string             // User, Role, Session, etc.
  entity_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: Date
}

// Input типы для создания/обновления
export interface CreateRoleInput {
  tenant_id?: string
  code: string
  name: string
  description: string
  permissions: Permission[]
  scope: RoleScope
  scope_values?: string[]
  is_system?: boolean
  is_active?: boolean
}

export interface UpdateRoleInput {
  name?: string
  description?: string
  permissions?: Permission[]
  scope?: RoleScope
  scope_values?: string[]
  is_active?: boolean
}

export interface CreateUserInput {
  email: string
  name: string
  phone?: string
  password: string
  status?: UserStatus
  roles?: string[]                // массив role_id для назначения
}

export interface UpdateUserInput {
  email?: string
  name?: string
  phone?: string
  status?: UserStatus
}

export interface AssignRoleInput {
  user_id: string
  role_id: string
  scope_value?: string
  expires_at?: Date
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface ChangePasswordInput {
  user_id: string
  old_password: string
  new_password: string
}

// Context типы
export interface AuthContextValue {
  user: User | null
  session: Session | null
  tenant_id: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (section: string, resource: string, action: PermissionAction, context?: any) => boolean
  hasAnyPermission: (permissions: Array<{section: string, resource: string, action: PermissionAction}>) => boolean
  refreshSession: () => Promise<void>
  isLoading: boolean
}

export interface TenantContextValue {
  current_tenant: string | null
  active_network: string | null
  active_trading_point: string | null
  setActiveNetwork: (networkId: string | null) => void
  setActiveTradingPoint: (pointId: string | null) => void
}