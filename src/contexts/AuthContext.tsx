import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseAuthService, type AuthUser } from '../services/supabaseAuthService';
import { testServiceConnection } from '../services/supabaseServiceClient';
import { currentUserService } from '../services/currentUserService';
import { type User as DBUser } from '../services/usersService';
import '../types/window';


// Типы пользователей и ролей
export interface Permission {
  section: string;
  resource: string;
  actions: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  networkId?: string;
  tradingPointIds: string[];
  permissions: (string | Permission)[];
  roles?: UserRole[];
  status?: 'active' | 'inactive' | 'blocked';
  lastLogin?: string;
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
  },
  {
    id: 6,
    name: "Менеджер БТО",
    code: "bto_manager",
    scope: "Network",
    description: "Менеджер сети БТО с ограниченным доступом",
    isSystem: false,
    permissions: [
      "networks.read", "trading_points.read", "networks.view_bto", "points.view_bto"
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

  // Функция для полной очистки данных авторизации
  const clearAllAuthData = () => {
    if (typeof window !== 'undefined') {
      // Единые ключи (основные)
      localStorage.removeItem('tradeframe_user');
      localStorage.removeItem('authToken');
      // Старые ключи (для совместимости)
      localStorage.removeItem('currentUser');
      localStorage.removeItem('auth_token');
    }
  };


  // Инициализация пользователя при загрузке приложения
  // Проверяем, есть ли сохраненная сессия
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          const savedUser = localStorage.getItem('tradeframe_user');
          const authToken = localStorage.getItem('authToken');

          if (savedUser && authToken) {
            try {
              if (savedUser.startsWith('[object Object]') || savedUser === '[object Object]') {
                clearAllAuthData();
                setUser(null);
                return;
              }

              const parsedUser = JSON.parse(savedUser);
              setUser(parsedUser);
            } catch (error) {
              clearAllAuthData();
              setUser(null);
            }
          } else {
            // Нет сохраненной сессии - пользователь должен войти
            setUser(null);
          }
        } else {
          // На сервере пользователь не авторизован
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        // Очищаем поврежденные данные
        clearAllAuthData();
      } finally {
        setLoading(false);
        // Убираем индикатор загрузки index.html когда авторизация завершена
        if (typeof window !== 'undefined' && window.removeInitialLoading) {
          window.removeInitialLoading();
        }
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
    if (!user || !user.roles || !Array.isArray(user.roles)) return false;
    
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
    if (!user || !user.roles || !Array.isArray(user.roles) || user.roles.length === 0) return 'driver';
    
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

  // Вход в систему через базу данных с улучшенной обработкой ошибок
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {

      // Авторизация только через реальную базу данных
      const dbUser = await currentUserService.authenticateUser(email, password);

      if (dbUser) {
        
        // Определяем основную роль пользователя
        let primaryRole = 'user';
        if (dbUser.roles && dbUser.roles.length > 0) {
          // Используем код первой активной роли
          primaryRole = dbUser.roles[0].role_code || 'user';
        }

        // Преобразуем пользователя из БД в формат для AuthContext
        const contextUser: User = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name || `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          phone: dbUser.phone,
          role: primaryRole, // Используем код роли из user_roles
          networkId: undefined,
          tradingPointIds: [],
          permissions: dbUser.roles ? dbUser.roles.flatMap(r => r.permissions || []) : ['basic'],
          roles: dbUser.roles || [],
          status: dbUser.status,
          lastLogin: new Date().toISOString()
        };
        
        setUser(contextUser);
        
        // Устанавливаем ID текущего пользователя в сервисе
        currentUserService.setCurrentUserId(dbUser.id);
        
        // Сохраняем пользователя в localStorage (используем тот же ключ что и при восстановлении)
        if (typeof window !== 'undefined') {
          try {
            const userJson = JSON.stringify(contextUser);
            localStorage.setItem('tradeframe_user', userJson);
            localStorage.setItem('authToken', 'database_session');
          } catch (error) {
            console.error('❌ Error saving user to localStorage:', error);
          }
        }
      } else {
        // ТОЛЬКО реальные пользователи из базы данных - никаких демо пользователей
        throw new Error('Пользователь не найден или неверный пароль');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
      // Убираем индикатор загрузки index.html после попытки входа
      if (typeof window !== 'undefined' && window.removeInitialLoading) {
        window.removeInitialLoading();
      }
    }
  };

  // Выход из системы
  const logout = async (): Promise<void> => {
    try {
      await SupabaseAuthService.logout();
      setUser(null);
      clearAllAuthData();
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      // Даже если ошибка, очищаем локальные данные
      setUser(null);
      clearAllAuthData();
    }
  };

  // Обновление данных пользователя
  const refreshUser = async (): Promise<void> => {
    setLoading(true);
    try {
      if (user) {
        // Загружаем обновленные данные пользователя из БД
        const dbUser = await currentUserService.getCurrentUserProfile();
        
        if (dbUser) {
          const updatedUser: User = {
            id: dbUser.id.toString(),
            email: dbUser.email,
            name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            phone: dbUser.phone,
            role: user.role, // Сохраняем текущую роль
            networkId: user.networkId,
            tradingPointIds: user.tradingPointIds,
            permissions: dbUser.permissions || user.permissions,
            roles: dbUser.roles || user.roles,
            status: dbUser.status,
            lastLogin: new Date().toISOString()
          };
          
          setUser(updatedUser);
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('tradeframe_user', JSON.stringify(updatedUser));
            localStorage.setItem('authToken', 'database_session');
          }
        } else {
          // Fallback: просто обновляем lastLogin
          const updatedUser = { ...user, lastLogin: new Date().toISOString() };
          setUser(updatedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('tradeframe_user', JSON.stringify(updatedUser));
            localStorage.setItem('authToken', 'database_session');
          }
        }
      }
    } catch (error) {
      console.error('Ошибка обновления пользователя:', error);
      // В случае ошибки просто обновляем lastLogin
      if (user) {
        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        setUser(updatedUser);
      }
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