/**
 * Новый чистый AuthContext с использованием authService и permissionService
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, type AppUser } from '../services/auth/authService';
import { permissionService, type MenuVisibility } from '../services/auth/permissionService';

interface AuthContextType {
  // Состояние
  user: AppUser | null;
  loading: boolean;

  // Основные методы
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;

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
   * Сохраняет данные пользователя в localStorage
   */
  const saveUserData = (userData: AppUser) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.TOKEN, 'authenticated');
    } catch (error) {
      console.error('❌ NewAuthContext: Failed to save user data:', error);
    }
  };

  /**
   * Загружает данные пользователя из localStorage
   */
  const loadUserData = (): AppUser | null => {
    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

      if (!savedUser || !savedToken) {
        return null;
      }

      // Проверка на поврежденные данные
      if (savedUser.startsWith('[object Object]') || savedUser === '[object Object]') {
        clearAuthData();
        return null;
      }

      const userData = JSON.parse(savedUser);

      // Базовая валидация данных
      if (!userData.id || !userData.email) {
        clearAuthData();
        return null;
      }

      return userData;
    } catch (error) {
      console.error('❌ NewAuthContext: Failed to load user data:', error);
      clearAuthData();
      return null;
    }
  };

  /**
   * Инициализация при загрузке приложения
   */
  useEffect(() => {
    const initializeAuth = () => {
      try {
        console.log('🔄 NewAuthContext: Initializing authentication...');
        console.log('🔄 NewAuthContext: Device info:', {
          userAgent: navigator.userAgent,
          isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
          url: window.location.href,
          host: window.location.host,
          protocol: window.location.protocol
        });

        const savedUser = loadUserData();
        if (savedUser) {
          setUser(savedUser);
          console.log('✅ NewAuthContext: User restored from storage:', savedUser.email);
          console.log('✅ NewAuthContext: User data keys present in localStorage:', Object.keys(localStorage).filter(key => key.includes('tradeframe')));
        } else {
          console.log('ℹ️ NewAuthContext: No saved user found');
          console.log('ℹ️ NewAuthContext: Available localStorage keys:', Object.keys(localStorage).filter(key => key.includes('tradeframe')));
        }
      } catch (error) {
        console.error('❌ NewAuthContext: Initialization error:', error);
        console.error('❌ NewAuthContext: Error stack:', error.stack);
        clearAuthData();
      } finally {
        console.log('🔄 NewAuthContext: Setting loading to false');
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
      console.log('🔐 NewAuthContext: Attempting login for:', email);

      const authenticatedUser = await authService.authenticate(email, password);

      if (!authenticatedUser) {
        throw new Error('Неверный email или пароль');
      }

      setUser(authenticatedUser);
      saveUserData(authenticatedUser);

      console.log('✅ NewAuthContext: Login successful for:', authenticatedUser.email);
    } catch (error: any) {
      console.error('❌ NewAuthContext: Login failed:', error);
      throw new Error(error.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Выход из системы
   */
  const logout = () => {
    console.log('🔐 NewAuthContext: Logging out user');
    setUser(null);
    clearAuthData();
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