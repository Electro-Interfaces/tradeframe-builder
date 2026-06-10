/**
 * AuthContext — единый источник авторизации.
 * Все операции с токенами через authStorage.
 */

import React, { createContext, useCallback, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { authService, type AppUser, type UserRole } from '../services/auth/authService';
import { permissionService, type MenuVisibility } from '../services/auth/permissionService';
import { auditLogService } from '../services/auditLogService';
import { queryClient } from '../lib/query/queryClient';
import { teardownChat } from '../services/chatBackend';
import {
  saveRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials
} from '../utils/secureStorage';
import { jsonToBase64 } from '../utils/base64';
import * as authStorage from '../utils/authStorage';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  updateUserName: (newName: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  canManageTanks: () => boolean;
  canCalibrate: () => boolean;
  canManagePrices: () => boolean;
  canManageUsers: () => boolean;
  canViewReports: () => boolean;
  getMenuVisibility: () => MenuVisibility;
  getRoleDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function getInitialUserFromStorage(): AppUser | null {
  try {
    const token = authStorage.getToken();
    const savedUser = authStorage.getUser<AppUser>();
    if (!token || !savedUser) return null;
    if (authStorage.isTokenExpired()) return null;
    if (savedUser.id && savedUser.email) return savedUser;
  } catch { /* ignore */ }
  return null;
}

export function NewAuthProvider({ children }: AuthProviderProps) {
  const initialUser = useMemo(() => getInitialUserFromStorage(), []);
  const [user, setUser] = useState<AppUser | null>(initialUser);
  const [loading, setLoading] = useState(true);

  const syncUserFromStorage = useCallback(() => {
    const nextUser = getInitialUserFromStorage();

    if (!nextUser) {
      setUser(null);
      queryClient.clear();
      return;
    }

    setUser((prev) => {
      if (
        prev?.id === nextUser.id &&
        prev?.email === nextUser.email &&
        prev?.name === nextUser.name &&
        prev?.role === nextUser.role
      ) {
        return prev;
      }

      return nextUser;
    });
  }, []);

  const generateAuthToken = (u: AppUser): string => {
    return jsonToBase64({ userId: u.id, email: u.email, role: u.role, timestamp: Date.now() });
  };

  // ─── Инициализация ─────────────────────────────────────

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (initialUser) {
          authStorage.setSessionInfo(initialUser.email);

          try {
            const freshUser = await authService.getCurrentUser();
            if (freshUser) {
              setUser(freshUser);
              authStorage.setUser(freshUser);
            } else {
              setUser(null);
              authStorage.clearAll();
            }
          } catch {
            // Транзитная ошибка — оставляем из localStorage
          }
          setLoading(false);
          return;
        }

        // Проверяем sessionStorage
        const sessionEmail = authStorage.getSessionEmail();
        if (sessionEmail) {
          try {
            const freshUser = await authService.getCurrentUser();
            if (freshUser) {
              setUser(freshUser);
              const token = authStorage.getToken() || generateAuthToken(freshUser);
              authStorage.setToken(token);
              authStorage.setUser(freshUser);
              authStorage.setSessionInfo(freshUser.email);
              return;
            }
          } catch { /* ignore */ }
          authStorage.clearAll();
        }

        // Проверяем "Запомнить меня" в IndexedDB
        try {
          const rememberedCreds = await getRememberedCredentials();
          if (rememberedCreds) {
            await login(rememberedCreds.email, rememberedCreds.password, true);
            return;
          }
        } catch { /* ignore */ }

      } catch {
        authStorage.clearAll();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [initialUser]);

  // ─── Login ─────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string, rememberMe = false): Promise<void> => {
    setLoading(true);

    try {
      const authResult = await authService.authenticate(email, password);
      if (!authResult) throw new Error('Неверный email или пароль');

      const authenticatedUser = authResult.user;
      const token = authResult.token || generateAuthToken(authenticatedUser);
      const expiresAt = authResult.expiresAt || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

      // Сохраняем через единый storage
      authStorage.setToken(token, expiresAt);
      authStorage.setUser(authenticatedUser);
      authStorage.setLoginEmail(email);
      authStorage.setSessionInfo(email);

      queryClient.clear();
      setUser(authenticatedUser);

      if (rememberMe) {
        await saveRememberedCredentials(email, password, 30);
      } else {
        await clearRememberedCredentials();
      }
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа в систему');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Logout ────────────────────────────────────────────

  const logout = useCallback(async () => {
    const currentUser = user;

    try {
      await authService.logout();
      if (currentUser?.email) {
        await auditLogService.logAuthentication('logout', currentUser.email, {
          user_id: currentUser.id, user_name: currentUser.name, success: true,
        });
      }
    } catch { /* не прерываем logout */ }

    setUser(null);
    authStorage.clearAll();
    await clearRememberedCredentials();
    queryClient.clear();
    // Чат: остановить Matrix-клиента и забыть токен/кэш — иначе на общем терминале
    // следующий пользователь увидит переписку предыдущего.
    teardownChat();
  }, [user]);

  // ─── Update user / Change password ────────────────────

  const updateUserName = useCallback(async (newName: string): Promise<void> => {
    if (!user) throw new Error('Нет авторизованного пользователя');
    await authService.updateUserName(user.id, newName);
    setUser((prev) => prev ? { ...prev, name: newName.trim() } : null);
  }, [user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!user) throw new Error('Нет авторизованного пользователя');
    await authService.changePassword(user.id, user.email, currentPassword, newPassword);
    const creds = await getRememberedCredentials();
    if (creds) {
      await saveRememberedCredentials(user.email, newPassword, 30);
    }
  }, [user]);

  // ─── Permissions ───────────────────────────────────────

  const hasPermission = useCallback((permission: string) => !!user && permissionService.hasPermission(user, permission), [user]);
  const isAdmin = useCallback(() => !!user && permissionService.isAdmin(user), [user]);
  const isSuperAdmin = useCallback(() => !!user && permissionService.isSuperAdmin(user), [user]);
  const canManageTanks = useCallback(() => !!user && permissionService.canManageTanks(user), [user]);
  const canCalibrate = useCallback(() => !!user && permissionService.canCalibrate(user), [user]);
  const canManagePrices = useCallback(() => !!user && permissionService.canManagePrices(user), [user]);
  const canManageUsers = useCallback(() => !!user && permissionService.canManageUsers(user), [user]);
  const canViewReports = useCallback(() => !!user && permissionService.canViewReports(user), [user]);
  const getMenuVisibility = useCallback((): MenuVisibility => {
    if (!user) return { admin: false, networks: false, tradingPoint: false, settings: false, reports: false };
    return permissionService.getMenuVisibility(user);
  }, [user]);
  const getRoleDisplayName = useCallback(() => user ? permissionService.getRoleDisplayName(user.role) : 'Гость', [user]);

  // ─── Token refresh ─────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const scheduleRefresh = () => {
      const expiry = authStorage.getExpiry();
      // Если нет expiry — ставим refresh через 15 минут (на случай если сервер не отдал)
      const refreshIn = expiry
        ? expiry - Date.now() - 15 * 60 * 1000
        : 15 * 60 * 1000;

      if (refreshIn <= 0) {
        doTokenRefresh();
      } else {
        timerId = window.setTimeout(doTokenRefresh, refreshIn);
      }
    };

    const doTokenRefresh = async () => {
      if (!mounted) return;
      const token = authStorage.getToken();
      if (!token) return;

      try {
        const backendOrigin = (await import('@/utils/backendUrl')).getBackendOrigin();
        const resp = await fetch(`${backendOrigin}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });

        if (!mounted) return;

        if (!resp.ok) {
          if (resp.status === 401) return; // Токен невалиден — не ретраим
          retryCount++;
          if (retryCount < MAX_RETRIES && mounted) {
            timerId = window.setTimeout(doTokenRefresh, 5 * 60 * 1000);
          }
          return;
        }

        const data = await resp.json();
        authStorage.setToken(data.token, data.expires_at);
        retryCount = 0;
        if (mounted) scheduleRefresh();
      } catch {
        retryCount++;
        if (retryCount < MAX_RETRIES && mounted) {
          timerId = window.setTimeout(doTokenRefresh, 5 * 60 * 1000);
        }
      }
    };

    scheduleRefresh();
    return () => { mounted = false; if (timerId) clearTimeout(timerId); };
  }, [user]);

  // ─── Cross-tab sync ────────────────────────────────────

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === null ||
        e.key === authStorage.AUTH_KEYS.TOKEN ||
        e.key === authStorage.AUTH_KEYS.USER ||
        e.key === authStorage.AUTH_KEYS.EXPIRY
      ) {
        syncUserFromStorage();
      }
    };

    const handleAuthStateChanged = () => {
      syncUserFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(authStorage.AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(authStorage.AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, [syncUserFromStorage]);

  // ─── Context value ─────────────────────────────────────

  const value = useMemo<AuthContextType>(() => ({
    user, loading, login, logout, updateUserName, changePassword,
    hasPermission, isAdmin, isSuperAdmin,
    canManageTanks, canCalibrate, canManagePrices, canManageUsers, canViewReports,
    getMenuVisibility, getRoleDisplayName,
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
