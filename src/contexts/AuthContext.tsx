import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseAuthService, type AuthUser } from '../services/supabaseAuthService';
import { testServiceConnection } from '../services/supabaseServiceClient';
import { currentUserService } from '../services/currentUserService';
import { type User as DBUser } from '../services/usersService';

// Типы пользователей и ролей
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
  permissions: string[];
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

  // Инициализация пользователя при загрузке приложения
  // Проверяем, есть ли сохраненная сессия
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Проверяем есть ли сохраненная сессия
          const savedUser = localStorage.getItem('currentUser');
          const authToken = localStorage.getItem('auth_token');
          
          if (savedUser && authToken) {
            try {
              // Проверяем, что savedUser является валидным JSON
              if (savedUser.startsWith('[object Object]') || savedUser === '[object Object]') {
                console.warn('🚫 Corrupted localStorage data detected, clearing...');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('auth_token');
                setUser(null);
                return;
              }
              
              // Восстанавливаем пользователя из сохраненной сессии
              const parsedUser = JSON.parse(savedUser);
              console.log('🔄 Restoring user from localStorage:', parsedUser);
              setUser(parsedUser);
            } catch (error) {
              console.error('❌ Error parsing saved user data:', error);
              console.log('🧹 Clearing corrupted localStorage data');
              localStorage.removeItem('currentUser');
              localStorage.removeItem('auth_token');
              setUser(null);
            }
          } else {
            // Нет сохраненной сессии - пользователь должен войти
            setUser(null);
            console.log('❌ No saved session - user needs to login');
          }
        } else {
          // На сервере пользователь не авторизован
          setUser(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        // Очищаем поврежденные данные
        if (typeof window !== 'undefined') {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('auth_token');
        }
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

  // Вход в систему через Supabase
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      console.log('🔐 Starting login process for:', email);
      
      // Сначала попробуем найти пользователя в нашей базе данных
      const dbUser = await currentUserService.authenticateUser(email, password);
      
      if (dbUser) {
        console.log('✅ User found in database:', dbUser);
        
        // Преобразуем пользователя из БД в формат для AuthContext
        const contextUser: User = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: `${dbUser.firstName} ${dbUser.lastName}`.trim(),
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          phone: dbUser.phone,
          role: 'user',
          networkId: undefined,
          tradingPointIds: [],
          permissions: dbUser.permissions || ['basic'],
          roles: dbUser.roles || [],
          status: dbUser.status,
          lastLogin: new Date().toISOString()
        };
        
        console.log('✅ Created user object from DB:', contextUser);
        setUser(contextUser);
        
        // Устанавливаем ID текущего пользователя в сервисе
        currentUserService.setCurrentUserId(dbUser.id);
        
        // Сохраняем пользователя в localStorage
        if (typeof window !== 'undefined') {
          try {
            const userJson = JSON.stringify(contextUser);
            localStorage.setItem('currentUser', userJson);
            localStorage.setItem('auth_token', 'database_session');
            console.log('✅ Successfully saved DB user to localStorage');
          } catch (error) {
            console.error('❌ Error saving user to localStorage:', error);
          }
        }
      } else {
        // Если пользователя нет в БД, пробуем Supabase (fallback)
        console.log('🔄 User not found in DB, trying Supabase...');
        const authUser = await SupabaseAuthService.login(email, password);
        console.log('✅ AuthUser from Supabase:', authUser);
        
        // Конвертируем AuthUser в User для контекста
        const contextUser: User = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name, // Это должно быть "Системный администратор"
          role: authUser.role,
          networkId: authUser.networkId,
          tradingPointIds: authUser.tradingPointIds,
          permissions: authUser.permissions,
          status: 'active',
          lastLogin: new Date().toISOString()
        };

        console.log('🎯 Context user being set:', contextUser);
        setUser(contextUser);
        
        // Сохраняем пользователя в localStorage
        if (typeof window !== 'undefined') {
          try {
            const userJson = JSON.stringify(contextUser);
            localStorage.setItem('currentUser', userJson);
            localStorage.setItem('auth_token', 'supabase_session');
            console.log('✅ Successfully saved Supabase user to localStorage');
          } catch (error) {
            console.error('❌ Error saving user to localStorage:', error);
          }
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const logout = async (): Promise<void> => {
    try {
      console.log('🚪 Starting logout process');
      await SupabaseAuthService.logout();
      setUser(null);
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('auth_token');
        console.log('🧹 Cleared localStorage on logout');
      }
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      // Даже если ошибка, очищаем локальные данные
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('auth_token');
        console.log('🧹 Force cleared localStorage after error');
      }
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
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        } else {
          // Fallback: просто обновляем lastLogin
          const updatedUser = { ...user, lastLogin: new Date().toISOString() };
          setUser(updatedUser);
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
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