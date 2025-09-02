import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Типы пользователей и ролей
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
}

// Системные роли (временно отключена защита для тестирования)
export const SYSTEM_ROLES: Role[] = [
  {
    id: 1,
    name: "Супер Администратор",
    code: "super_admin",
    scope: "Global",
    description: "Полные права доступа ко всей системе",
    isSystem: false, // Временно отключено для тестирования
    permissions: ["all"]
  },
  {
    id: 2,
    name: "Администратор Сети",
    code: "network_admin", 
    scope: "Network",
    description: "Администрирование конкретной сети АЗС",
    isSystem: false, // Временно отключено для тестирования
    permissions: [
      "network.manage", "points.manage", "users.manage", "roles.assign",
      "tanks.manage", "calibration.perform", "prices.manage", "reports.view",
      "audit.view", "workflows.manage"
    ]
  },
  {
    id: 3,
    name: "Менеджер Точки",
    code: "point_manager",
    scope: "Trading Point", 
    description: "Управление конкретной торговой точкой",
    isSystem: false, // Временно отключено для тестирования
    permissions: [
      "point.manage", "tanks.view", "tanks.calibrate", "tanks.settings",
      "prices.edit", "reports.view", "drains.approve", "operations.manage"
    ]
  },
  {
    id: 4,
    name: "Оператор / Кассир",
    code: "operator",
    scope: "Trading Point",
    description: "Операционная деятельность на торговой точке", 
    isSystem: false, // Временно отключено для тестирования
    permissions: [
      "transactions.create", "shifts.manage", "reports.view",
      "tanks.view", "drains.view", "prices.view"
    ]
  },
  {
    id: 5,
    name: "Водитель Экспедитор", 
    code: "driver",
    scope: "Assigned",
    description: "Регистрация сливов и транспортные операции",
    isSystem: false, // Временно отключено для тестирования
    permissions: [
      "deliveries.register", "fuel.unload", "drains.create", "tanks.view"
    ]
  }
];

// Мокированный текущий пользователь
const MOCK_CURRENT_USER: User = {
  id: 1,
  email: "admin@example.com", 
  firstName: "Администратор",
  lastName: "Системы",
  phone: "+7 (999) 123-45-67",
  status: 'active',
  lastLogin: "16.12.2024 14:30",
  roles: [
    {
      roleId: 2,
      roleName: "Администратор Сети", 
      roleCode: "network_admin",
      scope: "Network",
      scopeValue: "Сеть Центр",
      permissions: [
        "network.manage", "points.manage", "users.manage", "roles.assign",
        "tanks.manage", "calibration.perform", "prices.manage", "reports.view",
        "audit.view", "workflows.manage"
      ]
    }
  ],
  permissions: [
    "network.manage", "points.manage", "users.manage", "roles.assign",
    "tanks.manage", "calibration.perform", "prices.manage", "reports.view", 
    "audit.view", "workflows.manage"
  ]
};

interface AuthContextType {
  user: User | null;
  roles: Role[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleCode: string) => boolean;
  canManageTanks: () => boolean;
  canCalibrate: () => boolean;
  canManagePrices: () => boolean;
  canManageUsers: () => boolean;
  canViewReports: () => boolean;
  canApproveDrains: () => boolean;
  getUserRole: () => string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>(SYSTEM_ROLES);
  const [loading, setLoading] = useState(true);

  // Инициализация пользователя при загрузке приложения
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Симуляция загрузки пользователя из localStorage или API
          const savedUser = localStorage.getItem('currentUser');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            // Устанавливаем мокированного пользователя для демо
            setUser(MOCK_CURRENT_USER);
            localStorage.setItem('currentUser', JSON.stringify(MOCK_CURRENT_USER));
          }
        } else {
          // На сервере устанавливаем мокированного пользователя
          setUser(MOCK_CURRENT_USER);
        }
      } catch (error) {
        console.error('Ошибка инициализации аутентификации:', error);
        setUser(MOCK_CURRENT_USER);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Проверка наличия разрешения
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Супер админ имеет все разрешения
    if (user.permissions.includes('all')) return true;
    
    return user.permissions.includes(permission);
  };

  // Проверка наличия роли
  const hasRole = (roleCode: string): boolean => {
    if (!user) return false;
    
    return user.roles.some(role => role.roleCode === roleCode);
  };

  // Специфичные проверки для разных функций
  const canManageTanks = (): boolean => {
    return hasPermission('tanks.manage') || hasRole('network_admin') || hasRole('super_admin');
  };

  const canCalibrate = (): boolean => {
    return hasPermission('calibration.perform') || hasPermission('tanks.calibrate') || 
           hasRole('network_admin') || hasRole('point_manager') || hasRole('super_admin');
  };

  const canManagePrices = (): boolean => {
    return hasPermission('prices.manage') || hasPermission('prices.edit') ||
           hasRole('network_admin') || hasRole('point_manager') || hasRole('super_admin');
  };

  const canManageUsers = (): boolean => {
    return hasPermission('users.manage') || hasRole('network_admin') || hasRole('super_admin');
  };

  const canViewReports = (): boolean => {
    return hasPermission('reports.view') || hasRole('operator') || 
           hasRole('point_manager') || hasRole('network_admin') || hasRole('super_admin');
  };

  const canApproveDrains = (): boolean => {
    return hasPermission('drains.approve') || hasRole('point_manager') || 
           hasRole('network_admin') || hasRole('super_admin');
  };

  // Получение основной роли пользователя (для обратной совместимости)
  const getUserRole = (): string => {
    if (!user || user.roles.length === 0) return 'driver';
    
    const primaryRole = user.roles[0];
    
    switch (primaryRole.roleCode) {
      case 'super_admin':
      case 'network_admin':
        return 'admin';
      case 'point_manager':
        return 'manager';
      case 'operator':
        return 'operator';
      case 'driver':
      default:
        return 'driver';
    }
  };

  // Симуляция входа в систему
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      // Симуляция API вызова
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // В реальном приложении здесь будет API вызов
      setUser(MOCK_CURRENT_USER);
      if (typeof window !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(MOCK_CURRENT_USER));
      }
    } catch (error) {
      throw new Error('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const logout = (): void => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  };

  // Обновление данных пользователя
  const refreshUser = async (): Promise<void> => {
    setLoading(true);
    try {
      // Симуляция обновления данных пользователя
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // В реальном приложении здесь будет API вызов
      if (user) {
        const updatedUser = { ...user };
        setUser(updatedUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    roles,
    loading,
    hasPermission,
    hasRole,
    canManageTanks,
    canCalibrate,
    canManagePrices,
    canManageUsers,
    canViewReports,
    canApproveDrains,
    getUserRole,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Хук для проверки разрешений
export function usePermissions() {
  const { hasPermission, hasRole, canManageTanks, canCalibrate, canManagePrices, canManageUsers, canViewReports, canApproveDrains } = useAuth();
  
  return {
    hasPermission,
    hasRole,
    canManageTanks,
    canCalibrate,
    canManagePrices,
    canManageUsers,
    canViewReports,
    canApproveDrains
  };
}