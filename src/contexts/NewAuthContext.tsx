/**
 * Новый чистый AuthContext с использованием authService и permissionService
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, type AppUser } from '../services/auth/authService';
import { permissionService, type MenuVisibility } from '../services/auth/permissionService';
import { auditLogService } from '../services/auditLogService';

interface AuthContextType {
  // Состояние
  user: AppUser | null;
  loading: boolean;

  // Основные методы
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserName: (newName: string) => Promise<void>;

  // Проверки разрешений
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;

  // Специфические проверки (обратная совместимость)
  canManageTanks: () => boolean;
  canCalibrate: () => boolean;
  canManagePrices: () => boolean;
  canManageUsers: () => boolean;
  canViewReports: () => boolean;

  // Видимость меню
  getMenuVisibility: () => MenuVisibility;

  // Утилиты
  getRoleDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Ключи для localStorage
const STORAGE_KEYS = {
  USER: 'tradeframe_user_v2',
  TOKEN: 'tradeframe_token_v2'
} as const;

export function NewAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Очищает все данные авторизации
   */
  const clearAuthData = () => {
    // Новые ключи
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    // Старые ключи для совместимости
    localStorage.removeItem('tradeframe_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
  };

  /**
   * Сохраняет только email для повторной аутентификации
   */
  const saveAuthSession = (email: string) => {
    try {
      sessionStorage.setItem('current_user_email', email);
      sessionStorage.setItem('auth_timestamp', Date.now().toString());
    } catch (error) {
    }
  };

  /**
   * Получает email из сессии для повторной аутентификации
   */
  const getSessionEmail = (): string | null => {
    try {
      const email = sessionStorage.getItem('current_user_email');
      const timestamp = sessionStorage.getItem('auth_timestamp');

      if (!email || !timestamp) {
        return null;
      }

      // Проверяем, что сессия не старше 8 часов
      const sessionAge = Date.now() - parseInt(timestamp);
      const maxAge = 8 * 60 * 60 * 1000; // 8 часов

      if (sessionAge > maxAge) {
        clearAuthData();
        return null;
      }

      return email;
    } catch (error) {
      return null;
    }
  };

  /**
   * Загружает актуальные данные пользователя из базы данных
   */
  const loadFreshUserData = async (email: string): Promise<AppUser | null> => {
    try {

      const dbUser = await authService.getUserByEmail(email);
      if (!dbUser) {
        return null;
      }

      // Получаем роль из новой схемы БД
      const userRoles = (dbUser as any).user_roles || [];
      const primaryRole = userRoles[0]?.role;

      let userRole = 'user';
      let roleId = 0;
      let permissions: string[] = [];

      if (primaryRole) {

        // Используем код роли или имя для маппинга
        userRole = primaryRole.code || primaryRole.name;
        roleId = primaryRole.id;
        permissions = primaryRole.permissions || [];

        // Маппинг имен ролей на коды (если код не задан)
        if (!primaryRole.code) {
          const roleNameToCode: Record<string, string> = {
            'Суперадминистратор': 'super_admin',
            'Администратор сети': 'network_admin',
            'Менеджер': 'manager',
            'Оператор': 'operator',
            'Менеджер БТО': 'bto_manager'
          };

          if (roleNameToCode[primaryRole.name]) {
            userRole = roleNameToCode[primaryRole.name];
          }
        }
      } else {
      }

      const userData: AppUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        status: dbUser.status,
        role: userRole,
        roleId: roleId,
        permissions: permissions
      };

      return userData;
    } catch (error) {
      return null;
    }
  };

  /**
   * Инициализация при загрузке приложения
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const sessionEmail = getSessionEmail();
        if (sessionEmail) {

          const freshUser = await loadFreshUserData(sessionEmail);
          if (freshUser) {
            setUser(freshUser);
          } else {
            clearAuthData();
          }
        } else {
        }
      } catch (error) {
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Вход в систему
   */
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);

    try {

      const authenticatedUser = await authService.authenticate(email, password);

      if (!authenticatedUser) {
        throw new Error('Неверный email или пароль');
      }

      setUser(authenticatedUser);
      saveAuthSession(email); // Сохраняем только email в сессии

    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Выход из системы
   */
  const logout = async () => {
    // Логируем выход перед очисткой данных
    if (user) {
      await auditLogService.logAuthentication('logout', user.email, {
        user_id: user.id,
        user_name: user.name,
        success: true
      });
    }

    setUser(null);
    clearAuthData();
    // Очищаем также сессионные данные
    sessionStorage.removeItem('current_user_email');
    sessionStorage.removeItem('auth_timestamp');
  };

  /**
   * Обновление имени пользователя
   */
  const updateUserName = async (newName: string): Promise<void> => {
    if (!user) {
      throw new Error('Нет авторизованного пользователя');
    }

    try {

      // Обновляем в базе данных
      await authService.updateUserName(user.id, newName);

      // Обновляем локальное состояние
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          name: newName.trim()
        };
      });

    } catch (error: any) {
      throw new Error(error.message || 'Не удалось обновить имя пользователя');
    }
  };

  /**
   * Проверка разрешения
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return permissionService.hasPermission(user, permission);
  };

  /**
   * Проверка админских прав
   */
  const isAdmin = (): boolean => {
    if (!user) return false;
    return permissionService.isAdmin(user);
  };

  /**
   * Видимость меню
   */
  const getMenuVisibility = (): MenuVisibility => {
    if (!user) {
      return {
        admin: false,
        networks: false,
        tradingPoint: false,
        settings: false,
        reports: false
      };
    }
    return permissionService.getMenuVisibility(user);
  };

  /**
   * Получение отображаемого имени роли
   */
  const getRoleDisplayName = (): string => {
    if (!user) return 'Гость';
    return permissionService.getRoleDisplayName(user.role);
  };

  // Специфические проверки для обратной совместимости
  const canManageTanks = (): boolean => {
    if (!user) return false;
    return permissionService.canManageTanks(user);
  };

  const canCalibrate = (): boolean => {
    if (!user) return false;
    return permissionService.canCalibrate(user);
  };

  const canManagePrices = (): boolean => {
    if (!user) return false;
    return permissionService.canManagePrices(user);
  };

  const canManageUsers = (): boolean => {
    if (!user) return false;
    return permissionService.canManageUsers(user);
  };

  const canViewReports = (): boolean => {
    if (!user) return false;
    return permissionService.canViewReports(user);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUserName,
    hasPermission,
    isAdmin,
    canManageTanks,
    canCalibrate,
    canManagePrices,
    canManageUsers,
    canViewReports,
    getMenuVisibility,
    getRoleDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useNewAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useNewAuth must be used within a NewAuthProvider');
  }
  return context;
}