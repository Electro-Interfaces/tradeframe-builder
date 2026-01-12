/**
 * Новый чистый AuthContext с использованием authService и permissionService
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, type AppUser, type UserRole } from '../services/auth/authService';
import { permissionService, type MenuVisibility } from '../services/auth/permissionService';
import { auditLogService } from '../services/auditLogService';
import {
  saveRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials
} from '../utils/secureStorage';
import { jsonToBase64 } from '../utils/base64';

interface AuthContextType {
  // Состояние
  user: AppUser | null;
  loading: boolean;

  // Основные методы
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  updateUserName: (newName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Проверки разрешений
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;

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

/**
 * Синхронно получает пользователя из localStorage при инициализации
 * Это предотвращает "мигание" на страницу логина при обновлении
 */
function getInitialUserFromStorage(): AppUser | null {
  try {
    // Проверяем новые ключи
    let savedUserJson = localStorage.getItem(STORAGE_KEYS.USER);
    let savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

    // Fallback на старые ключи
    if (!savedUserJson || !savedToken) {
      savedUserJson = localStorage.getItem('tradeframe_user');
      savedToken = localStorage.getItem('authToken');
    }

    if (savedUserJson && savedToken) {
      const savedUser = JSON.parse(savedUserJson) as AppUser;
      if (savedUser && savedUser.id && savedUser.email) {
        return savedUser;
      }
    }
  } catch {
    // Игнорируем ошибки парсинга
  }
  return null;
}

export function NewAuthProvider({ children }: AuthProviderProps) {
  // Синхронная инициализация из localStorage - предотвращает logout при обновлении
  const initialUser = getInitialUserFromStorage();
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser); // Если есть пользователь - не показываем загрузку

  /**
   * Очищает все данные авторизации
   */
  const clearAuthData = async () => {
    // Новые ключи
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    // Старые ключи для совместимости
    localStorage.removeItem('tradeframe_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');

    // Ключи для httpClient
    localStorage.removeItem('auth_login');
    localStorage.removeItem('auth_password');
    localStorage.removeItem('auth_token_expiry');
    localStorage.removeItem('auth_user');

    // Очищаем IndexedDB
    await clearRememberedCredentials();
  };

  /**
   * Генерирует простой токен авторизации
   */
  const generateAuthToken = (user: AppUser): string => {
    const tokenData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      timestamp: Date.now()
    };
    return jsonToBase64(tokenData);
  };

  /**
   * Сохраняет данные авторизации в localStorage и sessionStorage
   */
  const saveAuthSession = (user: AppUser, token: string) => {
    try {
      // Сохраняем в localStorage для постоянного хранения
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      // Также сохраняем в старые ключи для обратной совместимости
      localStorage.setItem('tradeframe_user', JSON.stringify(user));
      localStorage.setItem('authToken', token);

      // Сохраняем email в sessionStorage для повторной аутентификации
      sessionStorage.setItem('current_user_email', user.email);
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

      // Получаем роли из новой схемы БД
      const userRoles = (dbUser as any).user_roles || [];
      const primaryRole = userRoles[0]?.role;

      let userRole = 'user';
      let roleId = 0;
      let permissions: string[] = [];

      // Маппинг имен ролей на коды для совместимости
      const roleNameToCode: Record<string, string> = {
        'Суперадминистратор': 'super_admin',
        'Администратор сети': 'network_admin',
        'Менеджер': 'manager',
        'Оператор': 'operator',
        'Менеджер БТО': 'bto_manager'
      };

      if (primaryRole) {
        // Используем код роли или имя для маппинга
        userRole = primaryRole.code || roleNameToCode[primaryRole.name] || primaryRole.name;
        roleId = primaryRole.id;
        permissions = primaryRole.permissions || [];
      }

      // Формируем массив ролей для отображения в профиле
      const roles: UserRole[] = userRoles
        .filter((ur: any) => ur.role)
        .map((ur: any) => {
          const role = ur.role;
          // ИСПРАВЛЕНО: берем scope_value из user_roles (персональные ограничения),
          // а не scope_values из roles (дефолтные значения роли)
          let userScopeValues: string[] = [];
          if (ur.scope_value) {
            try {
              // scope_value хранится как JSON строка в user_roles
              userScopeValues = typeof ur.scope_value === 'string'
                ? JSON.parse(ur.scope_value)
                : ur.scope_value;
            } catch {
              userScopeValues = [];
            }
          }
          // Fallback на scope_values из roles если нет персональных
          if (userScopeValues.length === 0 && role.scope_values) {
            userScopeValues = role.scope_values;
          }

          return {
            roleId: String(role.id),
            roleName: role.name,
            roleCode: role.code || roleNameToCode[role.name] || role.name,
            scope: role.scope,
            scopeValues: userScopeValues,
            permissions: role.permissions || []
          };
        });

      const userData: AppUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        status: dbUser.status,
        role: userRole,
        roleId: roleId,
        permissions: permissions,
        roles: roles
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
        // Если пользователь уже загружен синхронно из localStorage - пропускаем
        if (initialUser) {
          // Только обновляем sessionStorage для текущего сеанса
          sessionStorage.setItem('current_user_email', initialUser.email);
          sessionStorage.setItem('auth_timestamp', Date.now().toString());
          return;
        }

        // 1. Проверяем sessionStorage (для того же сеанса браузера)
        const sessionEmail = getSessionEmail();
        if (sessionEmail) {
          const freshUser = await loadFreshUserData(sessionEmail);
          if (freshUser) {
            setUser(freshUser);
            saveAuthSession(freshUser, generateAuthToken(freshUser));
            return; // Успешно восстановили сессию
          } else {
            await clearAuthData();
          }
        }

        // 2. Проверяем "Запомнить меня" в IndexedDB
        try {
          const rememberedCreds = await getRememberedCredentials();
          if (rememberedCreds) {
            // Автоматически входим с сохраненными учетными данными
            await login(rememberedCreds.email, rememberedCreds.password, true);
            return; // Успешно вошли автоматически
          }
        } catch (error) {
          // Игнорируем ошибки IndexedDB - просто не делаем автовход
        }

        // Нет ни сессии, ни сохраненных данных
      } catch (error) {
        await clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [initialUser]);

  /**
   * Вход в систему
   */
  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<void> => {
    setLoading(true);

    try {

      const authenticatedUser = await authService.authenticate(email, password);

      if (!authenticatedUser) {
        throw new Error('Неверный email или пароль');
      }

      // Генерируем токен
      const token = generateAuthToken(authenticatedUser);

      // Сохраняем пользователя и токен
      setUser(authenticatedUser);
      saveAuthSession(authenticatedUser, token);

      // Сохраняем credentials для httpClient (нужны для автоматического обновления токена)
      localStorage.setItem('auth_login', email);
      localStorage.setItem('auth_password', password);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_token_expiry', new Date(Date.now() + 60 * 60 * 1000).toISOString());
      localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));

      // Если выбрано "Запомнить меня", сохраняем в IndexedDB
      if (rememberMe) {
        await saveRememberedCredentials(email, password, 30); // 30 дней
      } else {
        // Если не выбрано, удаляем старые данные
        await clearRememberedCredentials();
      }

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
    try {
      // Логируем выход перед очисткой данных
      if (user?.email) {
        await auditLogService.logAuthentication('logout', user.email, {
          user_id: user.id,
          user_name: user.name,
          success: true
        });
      }
    } catch (error) {
      // Не прерываем logout при ошибке логирования
      if (import.meta.env.DEV) {
        console.error('Ошибка при логировании logout:', error);
      }
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
   * Изменение пароля пользователя
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user) {
      throw new Error('Нет авторизованного пользователя');
    }

    try {
      // Вызываем метод authService для смены пароля
      await authService.changePassword(user.id, user.email, currentPassword, newPassword);
    } catch (error: any) {
      throw new Error(error.message || 'Не удалось изменить пароль');
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
   * Проверка суперадминских прав
   */
  const isSuperAdmin = (): boolean => {
    if (!user) return false;
    return permissionService.isSuperAdmin(user);
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
    changePassword,
    hasPermission,
    isAdmin,
    isSuperAdmin,
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