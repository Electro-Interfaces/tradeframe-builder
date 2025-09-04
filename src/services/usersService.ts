/**
 * Сервис для работы с пользователями и ролями
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';

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

// API сервис пользователей с персистентным хранением
export const usersService = {
  // ПОЛЬЗОВАТЕЛИ
  
  // Получить всех пользователей
  async getAllUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...usersData].sort((a, b) => a.firstName.localeCompare(b.firstName));
  },

  // Получить пользователя по ID
  async getUserById(id: number): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return usersData.find(u => u.id === id) || null;
  },

  // Получить пользователя по email
  async getUserByEmail(email: string): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return usersData.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // Создать пользователя
  async createUser(input: UserInput): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Проверяем уникальность email
    const existingUser = usersData.find(u => u.email.toLowerCase() === input.email.toLowerCase());
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }
    
    // Получаем роли и разрешения
    const userRoles: UserRole[] = [];
    const permissions: string[] = [];
    
    if (input.roles && input.roles.length > 0) {
      for (const roleId of input.roles) {
        const role = rolesData.find(r => r.id === roleId);
        if (role) {
          userRoles.push({
            roleId: role.id,
            roleName: role.name,
            roleCode: role.code,
            scope: role.scope,
            permissions: role.permissions
          });
          permissions.push(...role.permissions);
        }
      }
    }
    
    const newUser: User = {
      id: nextUserId++,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: input.status || 'active',
      roles: userRoles,
      permissions: Array.from(new Set(permissions)), // убираем дубли
      createdAt: new Date(),
      updatedAt: new Date()
    };

    usersData.push(newUser);
    saveUsers();
    
    return newUser;
  },

  // Обновить пользователя
  async updateUser(id: number, updates: Partial<UserInput>): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const index = usersData.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    // Проверяем уникальность email при изменении
    if (updates.email) {
      const existingUser = usersData.find(u => u.id !== id && u.email.toLowerCase() === updates.email!.toLowerCase());
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }
    }
    
    const currentUser = usersData[index];
    
    // Обновляем роли если они переданы
    let userRoles = currentUser.roles;
    let permissions = currentUser.permissions;
    
    if (updates.roles !== undefined) {
      userRoles = [];
      permissions = [];
      
      for (const roleId of updates.roles) {
        const role = rolesData.find(r => r.id === roleId);
        if (role) {
          userRoles.push({
            roleId: role.id,
            roleName: role.name,
            roleCode: role.code,
            scope: role.scope,
            permissions: role.permissions
          });
          permissions.push(...role.permissions);
        }
      }
      permissions = Array.from(new Set(permissions));
    }
    
    const updatedUser: User = {
      ...currentUser,
      email: updates.email || currentUser.email,
      firstName: updates.firstName || currentUser.firstName,
      lastName: updates.lastName || currentUser.lastName,
      phone: updates.phone !== undefined ? updates.phone : currentUser.phone,
      status: updates.status || currentUser.status,
      roles: userRoles,
      permissions,
      updatedAt: new Date()
    };

    usersData[index] = updatedUser;
    saveUsers();
    
    return updatedUser;
  },

  // Удалить пользователя
  async deleteUser(id: number): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = usersData.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    // Нельзя удалить супер администратора
    const user = usersData[index];
    if (user.roles.some(role => role.roleCode === 'super_admin')) {
      throw new Error('Нельзя удалить супер администратора');
    }
    
    usersData.splice(index, 1);
    saveUsers();
    
    return true;
  },

  // Обновить статус пользователя
  async updateUserStatus(id: number, status: 'active' | 'inactive' | 'blocked'): Promise<User | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const user = usersData.find(u => u.id === id);
    if (!user) return null;
    
    user.status = status;
    user.updatedAt = new Date();
    
    saveUsers();
    return user;
  },

  // Поиск пользователей
  async searchUsers(query: string, filters?: {
    status?: 'active' | 'inactive' | 'blocked';
    roleCode?: string;
  }): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    let filteredUsers = usersData;
    
    // Фильтры
    if (filters) {
      if (filters.status) {
        filteredUsers = filteredUsers.filter(u => u.status === filters.status);
      }
      if (filters.roleCode) {
        filteredUsers = filteredUsers.filter(u => 
          u.roles.some(role => role.roleCode === filters.roleCode)
        );
      }
    }
    
    // Поиск по запросу
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.phone?.includes(searchLower)
      );
    }
    
    return filteredUsers.sort((a, b) => a.firstName.localeCompare(b.firstName));
  },

  // РОЛИ

  // Получить все роли
  async getAllRoles(): Promise<Role[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return [...rolesData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить роль по ID
  async getRoleById(id: number): Promise<Role | null> {
    await new Promise(resolve => setTimeout(resolve, 80));
    return rolesData.find(r => r.id === id) || null;
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