/**
 * Сервис для работы с пользователями и ролями
 * ОБНОВЛЕН: Использует централизованную конфигурацию из раздела "Обмен данными"
 * Поддерживает переключение между localStorage (mock) и Supabase (database)
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { UserSupabaseService } from './usersSupabaseService';
import { errorLogService } from './errorLogService';

// Создаем экземпляр Supabase сервиса
const usersSupabaseService = new UserSupabaseService();

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'active' | 'inactive' | 'blocked';
  lastLogin?: string;
  roles: UserRole[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  roleId: number;
  roleName: string;
  roleCode: string;
  scope: 'Global' | 'Network' | 'Trading Point' | 'Assigned';
  scopeValue?: string | null;
  permissions: string[];
}

export interface Role {
  id: number;
  name: string;
  code: string;
  scope: 'Global' | 'Network' | 'Trading Point' | 'Assigned';
  description: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'blocked';
  roles?: number[];
}

export interface RoleInput {
  name: string;
  code: string;
  scope: 'Global' | 'Network' | 'Trading Point' | 'Assigned';
  description: string;
  permissions: string[];
}

// Системные роли
const systemRoles: Role[] = [
  {
    id: 1,
    name: "Супер Администратор",
    code: "super_admin",
    scope: "Global",
    description: "Полные права доступа ко всей системе",
    isSystem: true,
    permissions: ["all"],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 2,
    name: "Администратор Сети",
    code: "network_admin", 
    scope: "Network",
    description: "Администрирование конкретной сети АЗС",
    isSystem: true,
    permissions: [
      "network.manage", "points.manage", "users.manage", "roles.assign",
      "tanks.manage", "calibration.perform", "prices.manage", "reports.view",
      "audit.view", "workflows.manage"
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 3,
    name: "Менеджер Точки",
    code: "point_manager",
    scope: "Trading Point", 
    description: "Управление конкретной торговой точкой",
    isSystem: true,
    permissions: [
      "point.manage", "tanks.view", "tanks.calibrate", "tanks.settings",
      "prices.edit", "reports.view", "drains.approve", "operations.manage"
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 4,
    name: "Оператор / Кассир",
    code: "operator",
    scope: "Trading Point",
    description: "Операционная деятельность на торговой точке", 
    isSystem: true,
    permissions: [
      "transactions.create", "shifts.manage", "reports.view",
      "tanks.view", "drains.view", "prices.view"
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 5,
    name: "Водитель Экспедитор", 
    code: "driver",
    scope: "Assigned",
    description: "Регистрация сливов и транспортные операции",
    isSystem: true,
    permissions: [
      "deliveries.register", "fuel.unload", "drains.create", "tanks.view"
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

// Начальные данные пользователей
const initialUsers: User[] = [
  {
    id: 1,
    email: "admin@tradeframe.ru",
    firstName: "Максим",
    lastName: "Администраторов",
    phone: "+7 (495) 123-45-67",
    status: "active",
    lastLogin: new Date().toISOString(),
    roles: [{
      roleId: 1,
      roleName: "Супер Администратор",
      roleCode: "super_admin",
      scope: "Global",
      permissions: ["all"]
    }],
    permissions: ["all"],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date()
  },
  {
    id: 2,
    email: "manager@nordline.ru",
    firstName: "Елена",
    lastName: "Петрова",
    phone: "+7 (812) 987-65-43",
    status: "active",
    lastLogin: "2024-08-30T09:15:00Z",
    roles: [{
      roleId: 2,
      roleName: "Администратор Сети",
      roleCode: "network_admin",
      scope: "Network",
      scopeValue: "2",
      permissions: [
        "network.manage", "points.manage", "users.manage", "roles.assign",
        "tanks.manage", "calibration.perform", "prices.manage", "reports.view",
        "audit.view", "workflows.manage"
      ]
    }],
    permissions: [
      "network.manage", "points.manage", "users.manage", "roles.assign",
      "tanks.manage", "calibration.perform", "prices.manage", "reports.view",
      "audit.view", "workflows.manage"
    ],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-08-30')
  },
  {
    id: 3,
    email: "manager.point1@demo-azs.ru",
    firstName: "Иван",
    lastName: "Сидоров",
    phone: "+7 (812) 123-45-67",
    status: "active",
    lastLogin: "2024-08-30T14:30:00Z",
    roles: [{
      roleId: 3,
      roleName: "Менеджер Точки",
      roleCode: "point_manager",
      scope: "Trading Point",
      scopeValue: "point1",
      permissions: [
        "point.manage", "tanks.view", "tanks.calibrate", "tanks.settings",
        "prices.edit", "reports.view", "drains.approve", "operations.manage"
      ]
    }],
    permissions: [
      "point.manage", "tanks.view", "tanks.calibrate", "tanks.settings",
      "prices.edit", "reports.view", "drains.approve", "operations.manage"
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-08-30')
  },
  {
    id: 4,
    email: "operator1@demo-azs.ru",
    firstName: "Мария",
    lastName: "Козлова",
    phone: "+7 (812) 234-56-78",
    status: "active",
    lastLogin: "2024-08-30T16:45:00Z",
    roles: [{
      roleId: 4,
      roleName: "Оператор / Кассир",
      roleCode: "operator",
      scope: "Trading Point",
      scopeValue: "point1",
      permissions: [
        "transactions.create", "shifts.manage", "reports.view",
        "tanks.view", "drains.view", "prices.view"
      ]
    }],
    permissions: [
      "transactions.create", "shifts.manage", "reports.view",
      "tanks.view", "drains.view", "prices.view"
    ],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-08-30')
  },
  {
    id: 5,
    email: "driver.petrov@logistics.ru",
    firstName: "Алексей",
    lastName: "Петров",
    phone: "+7 (921) 345-67-89",
    status: "active",
    lastLogin: "2024-08-30T08:00:00Z",
    roles: [{
      roleId: 5,
      roleName: "Водитель Экспедитор",
      roleCode: "driver",
      scope: "Assigned",
      scopeValue: "region_spb",
      permissions: [
        "deliveries.register", "fuel.unload", "drains.create", "tanks.view"
      ]
    }],
    permissions: [
      "deliveries.register", "fuel.unload", "drains.create", "tanks.view"
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-08-30')
  },
  {
    id: 6,
    email: "operator2@demo-azs.ru",
    firstName: "Анна",
    lastName: "Морозова",
    phone: "+7 (812) 345-67-89",
    status: "inactive",
    lastLogin: "2024-08-25T18:30:00Z",
    roles: [{
      roleId: 4,
      roleName: "Оператор / Кассир",
      roleCode: "operator",
      scope: "Trading Point",
      scopeValue: "point2",
      permissions: [
        "transactions.create", "shifts.manage", "reports.view",
        "tanks.view", "drains.view", "prices.view"
      ]
    }],
    permissions: [
      "transactions.create", "shifts.manage", "reports.view",
      "tanks.view", "drains.view", "prices.view"
    ],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-08-25')
  }
];

// Загружаем данные из localStorage
const usersData: User[] = PersistentStorage.load<User>('users', initialUsers);
const rolesData: Role[] = PersistentStorage.load<Role>('roles', systemRoles);
let nextUserId = Math.max(...usersData.map(u => u.id || 0)) + 1;
let nextRoleId = Math.max(...rolesData.map(r => r.id || 0)) + 1;

// Функция для сохранения изменений
const saveUsers = () => {
  PersistentStorage.save('users', usersData);
};

const saveRoles = () => {
  PersistentStorage.save('roles', rolesData);
};

// API сервис пользователей с централизованной конфигурацией
export const usersService = {
  
  /**
   * Инициализация сервиса пользователей
   */
  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ UsersService инициализирован с централизованной конфигурацией');
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Инициализация пользовательского сервиса неудачна
      console.error('❌ КРИТИЧНО: Ошибка инициализации UsersService:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'initialize',
        error instanceof Error ? error : new Error(String(error))
      );
      // ✅ FAIL-SECURE: При ошибках инициализации блокируем сервис
      throw new Error('Сервис управления пользователями недоступен. Система заблокирована.');
    }
  },

  /**
   * ❌ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ БЕЗОПАСНОСТИ: MOCK РЕЖИМ ЗАБЛОКИРОВАН
   */
  async isMockMode(): Promise<boolean> {
    // ✅ FAIL-SECURE: Mock режим пользователей навсегда заблокирован
    console.log('🔒 Mock режим пользователей заблокирован политикой безопасности');
    return false;
  },

  // ПОЛЬЗОВАТЕЛИ
  
  // Получить всех пользователей
  async getAllUsers(): Promise<User[]> {
    try {
      const isMock = await this.isMockMode();
      
      if (isMock) {
        console.log('🔄 UsersService: Используется localStorage режим');
        await new Promise(resolve => setTimeout(resolve, 150));
        return [...usersData].sort((a, b) => a.firstName.localeCompare(b.firstName));
      } else {
        console.log('🔄 UsersService: Используется Supabase режим');
        try {
          return await usersSupabaseService.getAllUsers();
        } catch (error) {
          // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается загрузить пользователей из базы данных
          console.error('❌ КРИТИЧНО: Ошибка загрузки пользователей из Supabase:', error);
          await errorLogService.logCriticalError(
            'UsersService',
            'getAllUsers',
            error instanceof Error ? error : new Error(String(error)),
            {
              metadata: { securityEvent: 'USER_DATA_RETRIEVAL_FAILURE' }
            }
          );
          
          // ✅ FAIL-SECURE: При ошибках загрузки пользователей блокируем доступ
          throw new Error('Не удается загрузить список пользователей. Система заблокирована из соображений безопасности.');
        }
      }
    } catch (error) {
      console.error('❌ КРИТИЧНО: Ошибка получения всех пользователей:', error);
      // ❌ БЕЗ FALLBACK - перебрасываем ошибку выше
      throw error;
    }
  },

  // Получить пользователя по ID
  async getUserById(id: number): Promise<User | null> {
    try {
      console.log('🔄 UsersService: Получение пользователя по ID через Supabase');
      return await usersSupabaseService.getUserById(id);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается получить пользователя из базы данных
      console.error('❌ КРИТИЧНО: Ошибка получения пользователя из Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'getUserById',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId: id, securityEvent: 'SINGLE_USER_RETRIEVAL_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках получения пользователя блокируем доступ
      throw new Error(`Не удается получить данные пользователя ID:${id}. Доступ заблокирован.`);
    }
  },

  // Получить пользователя по email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      console.log('🔄 UsersService: Получение пользователя по email через Supabase');
      return await usersSupabaseService.getUserByEmail(email);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается получить пользователя из базы данных
      console.error('❌ КРИТИЧНО: Ошибка получения пользователя по email из Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'getUserByEmail',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { email, securityEvent: 'USER_EMAIL_RETRIEVAL_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках получения пользователя блокируем доступ
      throw new Error(`Не удается получить данные пользователя по email. Доступ заблокирован.`);
    }
  },

  // Создать пользователя
  async createUser(input: UserInput): Promise<User> {
    try {
      console.log('🔄 UsersService: Создание пользователя через Supabase');
      return await usersSupabaseService.createUser(input);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается создать пользователя в базе данных
      console.error('❌ КРИТИЧНО: Ошибка создания пользователя в Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'createUser',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { email: input.email, securityEvent: 'USER_CREATION_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках создания пользователя блокируем операцию
      throw new Error(`Не удается создать пользователя. Система заблокирована.`);
    }
  },

  // Обновить пользователя
  async updateUser(id: number, updates: Partial<UserInput>): Promise<User | null> {
    try {
      console.log('🔄 UsersService: Обновление пользователя через Supabase');
      return await usersSupabaseService.updateUser(id, updates);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается обновить пользователя в базе данных
      console.error('❌ КРИТИЧНО: Ошибка обновления пользователя в Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'updateUser',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId: id, securityEvent: 'USER_UPDATE_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках обновления пользователя блокируем операцию
      throw new Error(`Не удается обновить пользователя ID:${id}. Система заблокирована.`);
    }
  },

  // Удалить пользователя
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log('🔄 UsersService: Удаление пользователя через Supabase');
      return await usersSupabaseService.deleteUser(id);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается удалить пользователя из базы данных
      console.error('❌ КРИТИЧНО: Ошибка удаления пользователя из Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'deleteUser',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId: id, securityEvent: 'USER_DELETION_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках удаления пользователя блокируем операцию
      throw new Error(`Не удается удалить пользователя ID:${id}. Система заблокирована.`);
    }
  },

  // Обновить статус пользователя
  async updateUserStatus(id: number, status: 'active' | 'inactive' | 'blocked'): Promise<User | null> {
    try {
      console.log('🔄 UsersService: Обновление статуса пользователя через Supabase');
      return await usersSupabaseService.updateUserStatus(id, status);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается обновить статус пользователя в базе данных
      console.error('❌ КРИТИЧНО: Ошибка обновления статуса пользователя в Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'updateUserStatus',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { userId: id, status, securityEvent: 'USER_STATUS_UPDATE_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках обновления статуса блокируем операцию
      throw new Error(`Не удается обновить статус пользователя ID:${id}. Система заблокирована.`);
    }
  },

  // Поиск пользователей
  async searchUsers(query: string, filters?: {
    status?: 'active' | 'inactive' | 'blocked';
    roleCode?: string;
  }): Promise<User[]> {
    try {
      console.log('🔄 UsersService: Поиск пользователей через Supabase');
      return await usersSupabaseService.searchUsers(query, filters);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается выполнить поиск пользователей
      console.error('❌ КРИТИЧНО: Ошибка поиска пользователей в Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'searchUsers',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { query, filters, securityEvent: 'USER_SEARCH_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках поиска блокируем операцию
      throw new Error('Не удается выполнить поиск пользователей. Система заблокирована.');
    }
  },

  // РОЛИ

  // Получить все роли
  async getAllRoles(): Promise<Role[]> {
    try {
      console.log('🔄 UsersService: Получение всех ролей через Supabase');
      return await usersSupabaseService.getAllRoles();
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается загрузить роли из базы данных
      console.error('❌ КРИТИЧНО: Ошибка загрузки ролей из Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'getAllRoles',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { securityEvent: 'ROLES_RETRIEVAL_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках загрузки ролей блокируем доступ
      throw new Error('Не удается загрузить список ролей. Система заблокирована.');
    }
  },

  // Получить роль по ID
  async getRoleById(id: number): Promise<Role | null> {
    try {
      console.log('🔄 UsersService: Получение роли по ID через Supabase');
      return await usersSupabaseService.getRoleById(id);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удается получить роль из базы данных
      console.error('❌ КРИТИЧНО: Ошибка получения роли из Supabase:', error);
      await errorLogService.logCriticalError(
        'UsersService',
        'getRoleById',
        error instanceof Error ? error : new Error(String(error)),
        {
          metadata: { roleId: id, securityEvent: 'SINGLE_ROLE_RETRIEVAL_FAILURE' }
        }
      );
      
      // ✅ FAIL-SECURE: При ошибках получения роли блокируем доступ
      throw new Error(`Не удается получить данные роли ID:${id}. Доступ заблокирован.`);
    }
  },

  // Создать роль
  async createRole(input: RoleInput): Promise<Role> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Проверяем уникальность кода
    const existingRole = rolesData.find(r => r.code.toLowerCase() === input.code.toLowerCase());
    if (existingRole) {
      throw new Error('Роль с таким кодом уже существует');
    }
    
    const newRole: Role = {
      id: nextRoleId++,
      name: input.name,
      code: input.code,
      scope: input.scope,
      description: input.description,
      isSystem: false,
      permissions: input.permissions,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    rolesData.push(newRole);
    saveRoles();
    
    return newRole;
  },

  // Обновить роль
  async updateRole(id: number, updates: Partial<RoleInput>): Promise<Role | null> {
    await new Promise(resolve => setTimeout(resolve, 220));
    
    const index = rolesData.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    const role = rolesData[index];
    
    // Нельзя изменять системные роли
    if (role.isSystem) {
      throw new Error('Нельзя изменять системные роли');
    }
    
    // Проверяем уникальность кода при изменении
    if (updates.code) {
      const existingRole = rolesData.find(r => r.id !== id && r.code.toLowerCase() === updates.code!.toLowerCase());
      if (existingRole) {
        throw new Error('Роль с таким кодом уже существует');
      }
    }
    
    const updatedRole: Role = {
      ...role,
      name: updates.name || role.name,
      code: updates.code || role.code,
      scope: updates.scope || role.scope,
      description: updates.description || role.description,
      permissions: updates.permissions || role.permissions,
      updatedAt: new Date()
    };

    rolesData[index] = updatedRole;
    saveRoles();
    
    return updatedRole;
  },

  // Удалить роль
  async deleteRole(id: number): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    const index = rolesData.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    const role = rolesData[index];
    
    // Нельзя удалить системную роль
    if (role.isSystem) {
      throw new Error('Нельзя удалить системную роль');
    }
    
    // Проверяем, не используется ли роль
    const usersWithRole = usersData.filter(u => u.roles.some(ur => ur.roleId === id));
    if (usersWithRole.length > 0) {
      throw new Error(`Роль используется ${usersWithRole.length} пользователями и не может быть удалена`);
    }
    
    rolesData.splice(index, 1);
    saveRoles();
    
    return true;
  },

  // Получить статистику
  async getStatistics(): Promise<{
    totalUsers: number;
    usersByStatus: Record<string, number>;
    usersByRole: Record<string, number>;
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const totalUsers = usersData.length;
    
    // Статистика по статусам
    const usersByStatus = usersData.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Статистика по ролям
    const usersByRole = usersData.reduce((acc, user) => {
      user.roles.forEach(role => {
        acc[role.roleName] = (acc[role.roleName] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    const totalRoles = rolesData.length;
    const systemRoles = rolesData.filter(r => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    
    return {
      totalUsers,
      usersByStatus,
      usersByRole,
      totalRoles,
      systemRoles,
      customRoles
    };
  }
};

// Экспорт store для обратной совместимости
export const usersStore = {
  getAllUsers: (): User[] => [...usersData],
  
  getUserById: (id: number): User | undefined => 
    usersData.find(u => u.id === id),
    
  getUserByEmail: (email: string): User | undefined =>
    usersData.find(u => u.email.toLowerCase() === email.toLowerCase()),
    
  getAllRoles: (): Role[] => [...rolesData],
  
  getRoleById: (id: number): Role | undefined =>
    rolesData.find(r => r.id === id),
    
  updateUser: (id: number, updates: Partial<User>): User | null => {
    const index = usersData.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    usersData[index] = {
      ...usersData[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveUsers();
    return usersData[index];
  }
};