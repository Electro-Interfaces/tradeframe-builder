/**
 * Сервис для работы с профилем текущего пользователя
 */

import { usersService, type User } from './usersService';
import { externalUsersService } from './externalUsersService';

interface CurrentUserProfileData {
  firstName: string;
  lastName: string;
  phone?: string;
}

class CurrentUserService {
  private currentUserId: number | null = null;

  /**
   * Устанавливает ID текущего пользователя
   */
  setCurrentUserId(userId: number) {
    this.currentUserId = userId;
  }

  /**
   * Получает ID текущего пользователя из localStorage
   */
  private getCurrentUserId(): number | null {
    if (this.currentUserId) return this.currentUserId;
    
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return parsed.id || null;
      }
    } catch (error) {
      console.error('Ошибка получения ID пользователя:', error);
    }
    
    return null;
  }

  /**
   * Получает профиль текущего пользователя
   */
  async getCurrentUserProfile(): Promise<User | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('ID пользователя не найден');
    }

    try {
      return await usersService.getUserById(userId);
    } catch (error) {
      console.error('Ошибка получения профиля пользователя:', error);
      throw error;
    }
  }

  /**
   * Обновляет профиль текущего пользователя
   */
  async updateCurrentUserProfile(profileData: CurrentUserProfileData): Promise<User | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('ID пользователя не найден');
    }

    try {
      const updatedUser = await usersService.updateUser(userId, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone
      });

      // Обновляем данные в localStorage
      if (updatedUser) {
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      return updatedUser;
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      throw error;
    }
  }

  /**
   * Получает пользователя по email (для авторизации)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Оптимизированный поиск: сначала пробуем найти конкретного пользователя
      try {
        console.log('🔍 Searching for user by email in database:', email);

        // Пробуем целенаправленный поиск конкретного пользователя с ролями
        const specificUser = await externalUsersService.getUserByEmailWithRoles(email);
        if (specificUser) {
          console.log('✅ Пользователь найден оптимизированным поиском:', specificUser);
          return specificUser;
        }

        console.log('🔄 Optimized search failed, trying full dataset fallback...');

        // Если оптимизированный поиск не сработал, загружаем всех (fallback)
        const usersWithRoles = await externalUsersService.getUsersWithRoles();
        const userWithRoles = usersWithRoles.find(u => u.email === email);
        if (userWithRoles) {
          console.log('✅ Пользователь найден в полном датасете (fallback):', userWithRoles);
          return userWithRoles;
        }
      } catch (dbError) {
        console.warn('⚠️ Ошибка поиска в реальной БД:', dbError);
      }

      // ИСПРАВЛЕНО: Удален fallback к моковым данным для безопасности
      // Только реальные пользователи из базы данных разрешены
      console.log('❌ Пользователь не найден в базе данных:', email);
      return null;
    } catch (error) {
      console.error('Ошибка получения пользователя по email:', error);
      throw error;
    }
  }

  /**
   * Проверяет существование пользователя с данным email и паролем
   * Улучшенная проверка с обратной совместимостью
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(email);

      if (!user) {
        return null;
      }

      // Проверка пароля с использованием реальных хешей из БД
      if (await this.isValidPassword(user, password)) {
        console.log('✅ Authentication successful for:', email);
        return user;
      }

      console.log('❌ Authentication failed for:', email);
      return null;
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      throw error;
    }
  }

  /**
   * Проверка пароля с использованием реальных хешей из базы данных
   * ТОЛЬКО реальная проверка паролей - никаких демо данных
   */
  private async isValidPassword(user: User, password: string): Promise<boolean> {
    // Минимальная длина пароля
    if (!password || password.length < 3) {
      return false;
    }

    // Проверяем есть ли сохраненные данные пароля в пользователе
    if (!user.pwd_salt || !user.pwd_hash) {
      console.log('❌ User password data missing - cannot authenticate');
      return false;
    }

    try {
      // Используем тот же алгоритм хеширования что и в externalUsersService
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const saltBytes = this.base64ToArrayBuffer(user.pwd_salt);

      // Импортируем пароль как ключ для PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      // Выполняем PBKDF2 хеширование (такие же параметры как в externalUsersService)
      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        32 * 8  // 32 байта в битах
      );

      const computedHash = this.arrayBufferToBase64(hashBuffer);
      return computedHash === user.pwd_hash;
    } catch (error) {
      console.error('❌ Password verification error:', error);
      return false;
    }
  }

  // Вспомогательные методы для работы с Base64 (копия из externalUsersService)
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const currentUserService = new CurrentUserService();