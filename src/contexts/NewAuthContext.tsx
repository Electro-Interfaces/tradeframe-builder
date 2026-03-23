/**
 * Новый чистый AuthContext с использованием authService и permissionService
 */

import React, { createContext, useCallback, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { authService, type AppUser, type UserRole } from '../services/auth/authService';
import { permissionService, type MenuVisibility } from '../services/auth/permissionService';
import { auditLogService } from '../services/auditLogService';
import { queryClient } from '../lib/supabase/queryClient';
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
function isTokenExpired(): boolean {
  const expiry = localStorage.getItem('auth_token_expiry');
  if (!expiry) return false; // Нет данных — проверим на сервере
  try {
    return new Date(expiry).getTime() < Date.now();
  } catch {
    return false;
  }
}

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
      // Проверяем, не истёк ли токен
      if (isTokenExpired()) {
        return null;
      }
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
  // useMemo с [] — вычисляем ОДИН раз, иначе JSON.parse создаёт новый объект каждый рендер
  // и useEffect([initialUser]) зацикливается в backend-режиме
  const initialUser = useMemo(() => getInitialUserFromStorage(), []);
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [loading, setLoading] = useState(true); // Всегда начинаем с loading — предотвращает запросы API до проверки токена

  /**
   * Очищает все данные авторизации
   */
  const clearAuthData = async (clearRemembered: boolean = false) => {
    // Новые ключи
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);

    // Старые ключи для совместимости
    localStorage.removeItem('tradeframe_user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');

    // Ключи для httpClient
    localStorage.removeItem('auth_login');
    localStorage.removeItem('auth_token_expiry');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token_expiry');
    sessionStorage.removeItem('auth_user');

    // IndexedDB чистим только по явному запросу (смена пароля, блокировка)
    // При обычном logout — сохраняем для автовхода при следующем открытии
    if (clearRemembered) {
      await clearRememberedCredentials();
    }
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
  const saveAuthSession = (user: AppUser, token: string, expiresAt?: string) => {
    try {
      // Сохраняем в localStorage для постоянного хранения
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      // Также сохраняем в старые ключи для обратной совместимости
      localStorage.setItem('tradeframe_user', JSON.stringify(user));
      localStorage.setItem('authToken', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));

      if (expiresAt) {
        localStorage.setItem('auth_token_expiry', expiresAt);
      } else {
        localStorage.removeItem('auth_token_expiry');
      }

      // Сохраняем email в sessionStorage для повторной аутентификации
      sessionStorage.setItem('current_user_email', user.email);
      sessionStorage.setItem('auth_timestamp', Date.now().toString());
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      if (expiresAt) {
        sessionStorage.setItem('auth_token_expiry', expiresAt);
      } else {
        sessionStorage.removeItem('auth_token_expiry');
      }
    } catch (error) {
      void error;
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
      if (authService.isBackendMode()) {
        return await authService.getCurrentUser();
      }

      const dbUser = await authService.getUserByEmail(email);
      if (!dbUser) {
        return null;
      }

      const userRoles = dbUser.user_roles || [];
      const primaryRole = userRoles[0]?.role;
      const roleNameToCode: Record<string, string> = {
        'Суперадминистратор': 'super_admin',
        'Администратор сети': 'network_admin',
        'Менеджер': 'manager',
        'Оператор': 'operator',
        'Менеджер БТО': 'bto_manager',
        'Менеджер Энтиком': 'enticom_manager',
        'Менеджер двух станций': 'bto_station_manager',
        'Менеджер станций БТО': 'bto_station_manager',
      };

      const roles: UserRole[] = userRoles
        .filter(ur => ur.role)
        .map(ur => {
          const role = ur.role;
          let userScopeValues: string[] = [];
          if (ur.scope_value) {
            try {
              userScopeValues = typeof ur.scope_value === 'string'
                ? JSON.parse(ur.scope_value)
                : ur.scope_value;
            } catch {
              userScopeValues = [];
            }
          }
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

      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        phone: dbUser.phone,
        status: dbUser.status,
        role: primaryRole?.code || roleNameToCode[primaryRole?.name || ''] || dbUser.role || 'user',
        roleId: primaryRole?.id || 0,
        permissions: primaryRole?.permissions || [],
        roles,
      };
    } catch (err: any) {
      // 401/403 — реальная невалидность, null → logout
      if (err.status === 401 || err.status === 403) {
        return null;
      }
      // Транзитные ошибки — пробрасываем, чтобы вызывающий код не разлогинивал
      throw err;
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

          if (authService.isBackendMode()) {
            try {
              const freshUser = await authService.getCurrentUser();
              if (freshUser) {
                setUser(freshUser);
                const currentToken =
                  localStorage.getItem('auth_token')
                  || localStorage.getItem(STORAGE_KEYS.TOKEN)
                  || '';
                const currentExpiry =
                  localStorage.getItem('auth_token_expiry')
                  || undefined;
                if (currentToken) {
                  saveAuthSession(freshUser, currentToken, currentExpiry);
                }
              } else {
                // getCurrentUser вернул null → 401/403 или нет токена — реальный logout
                setUser(null);
                await clearAuthData();
              }
            } catch {
              // Транзитная ошибка (429, 500, сеть) — оставляем пользователя из localStorage
              // Не разлогиниваем, данные обновятся при следующем успешном запросе
            }
          }
          setLoading(false);
          return;
        }

        // 1. Проверяем sessionStorage (для того же сеанса браузера)
        const sessionEmail = getSessionEmail();
        if (sessionEmail) {
          const freshUser = await loadFreshUserData(sessionEmail);
          if (freshUser) {
            setUser(freshUser);
            const token = localStorage.getItem('auth_token')
              || sessionStorage.getItem('auth_token')
              || generateAuthToken(freshUser);
            const expiresAt = localStorage.getItem('auth_token_expiry') || undefined;
            saveAuthSession(freshUser, token, expiresAt);
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
  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<void> => {
    setLoading(true);

    try {

      const authResult = await authService.authenticate(email, password);

      if (!authResult) {
        throw new Error('Неверный email или пароль');
      }

      const authenticatedUser = authResult.user;
      const token = authResult.token || generateAuthToken(authenticatedUser);
      const expiresAt = authResult.expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

      // Сохраняем токен ДО очистки кэша и установки user,
      // чтобы при перезапросе данных токен уже был доступен httpClient
      localStorage.setItem('auth_login', email);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_token_expiry', expiresAt);
      localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));

      // Очищаем react-query кэш — до логина запросы фейлились (нет токена),
      // закэшированные ошибки помешали бы корректной загрузке данных
      queryClient.clear();

      // Сохраняем пользователя — триггерит ре-рендер ProtectedRoute,
      // маунт страниц и запуск хуков с чистым кэшем
      setUser(authenticatedUser);
      saveAuthSession(authenticatedUser, token, expiresAt);

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
  }, []);

  /**
   * Выход из системы
   */
  const logout = useCallback(async () => {
    // Сохраняем данные пользователя для логирования ДО очистки состояния
    const currentUser = user;

    try {
      await authService.logout();

      // Логируем выход перед очисткой данных
      if (currentUser?.email) {
        await auditLogService.logAuthentication('logout', currentUser.email, {
          user_id: currentUser.id,
          user_name: currentUser.name,
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
    await clearAuthData();
    // Очищаем кэш данных предыдущего пользователя
    queryClient.clear();
    // Очищаем также сессионные данные
    sessionStorage.removeItem('current_user_email');
    sessionStorage.removeItem('auth_timestamp');
  }, [user]);

  /**
   * Обновление имени пользователя
   */
  const updateUserName = useCallback(async (newName: string): Promise<void> => {
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
  }, [user]);

  /**
   * Изменение пароля пользователя
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user) {
      throw new Error('Нет авторизованного пользователя');
    }

    try {
      await authService.changePassword(user.id, user.email, currentPassword, newPassword);
      // Обновляем сохранённые credentials с новым паролем
      const creds = await getRememberedCredentials();
      if (creds) {
        await saveRememberedCredentials(user.email, newPassword, 30);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Не удалось изменить пароль');
    }
  }, [user]);

  /**
   * Проверка разрешения
   */
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return permissionService.hasPermission(user, permission);
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.isAdmin(user);
  }, [user]);

  const isSuperAdmin = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.isSuperAdmin(user);
  }, [user]);

  /**
   * Видимость меню
   */
  const getMenuVisibility = useCallback((): MenuVisibility => {
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
  }, [user]);

  const getRoleDisplayName = useCallback((): string => {
    if (!user) return 'Гость';
    return permissionService.getRoleDisplayName(user.role);
  }, [user]);

  const canManageTanks = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.canManageTanks(user);
  }, [user]);

  const canCalibrate = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.canCalibrate(user);
  }, [user]);

  const canManagePrices = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.canManagePrices(user);
  }, [user]);

  const canManageUsers = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.canManageUsers(user);
  }, [user]);

  const canViewReports = useCallback((): boolean => {
    if (!user) return false;
    return permissionService.canViewReports(user);
  }, [user]);

  // Фоновое обновление токена за 15 минут до истечения
  useEffect(() => {
    if (!user) return;

    const scheduleRefresh = () => {
      const expiry = localStorage.getItem('auth_token_expiry');
      if (!expiry) return undefined;

      const expiresAt = new Date(expiry).getTime();
      const now = Date.now();
      // Обновляем за 15 минут до истечения
      const refreshIn = expiresAt - now - 15 * 60 * 1000;

      if (refreshIn <= 0) {
        // Токен уже близок к истечению — обновить сейчас
        doTokenRefresh();
        return undefined;
      }

      return window.setTimeout(doTokenRefresh, refreshIn);
    };

    const doTokenRefresh = async () => {
      const token = localStorage.getItem('auth_token')
        || localStorage.getItem('tradeframe_token_v2');
      if (!token) return;

      try {
        const backendOrigin = (await import('@/utils/backendUrl')).getBackendOrigin();
        const resp = await fetch(`${backendOrigin}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!resp.ok) return;

        const data = await resp.json();
        const newToken = data.token;
        const expiresAt = data.expires_at;

        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('tradeframe_token_v2', newToken);
        sessionStorage.setItem('auth_token', newToken);
        if (expiresAt) {
          localStorage.setItem('auth_token_expiry', expiresAt);
          sessionStorage.setItem('auth_token_expiry', expiresAt);
        }

        // Запланировать следующее обновление
        timerId = scheduleRefresh();
      } catch {
        // Сеть недоступна — попробуем при следующем scheduleRefresh
      }
    };

    let timerId = scheduleRefresh();
    return () => { if (timerId) clearTimeout(timerId); };
  }, [user]);

  // Cross-tab sync: если пользователь разлогинился в другой вкладке — синхронизируем
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Ключ авторизации удалён в другой вкладке → logout
      if (e.key === STORAGE_KEYS.TOKEN && !e.newValue && user) {
        setUser(null);
        queryClient.clear();
      }
      // Ключ авторизации появился в другой вкладке → перезагрузить для init
      if (e.key === STORAGE_KEYS.TOKEN && e.newValue && !user) {
        window.location.reload();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  const value = useMemo<AuthContextType>(() => ({
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
    getRoleDisplayName,
  }), [user, loading, login, logout, updateUserName, changePassword, hasPermission, isAdmin, isSuperAdmin, canManageTanks, canCalibrate, canManagePrices, canManageUsers, canViewReports, getMenuVisibility, getRoleDisplayName]);

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
