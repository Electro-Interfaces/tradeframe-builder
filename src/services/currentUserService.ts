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

      // Ищем пользователя напрямую в таблице users
      const user = await externalUsersService.getUserByEmail(email);
      if (user) {
        return user;
      }

      console.error('Пользователь не найден в базе данных:', email);
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
        return user;
      }

      console.error('Authentication failed for:', email);
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
      console.error('User password data missing - cannot authenticate');
      return false;
    }

    // Детекция мобильного устройства
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isOldBrowser = !window.crypto || !window.crypto.subtle;

    // Для мобильных устройств или старых браузеров используем упрощенную проверку
    if (isMobile || isOldBrowser) {
      return await this.simplePasswordCheck(user, password);
    }

    try {
      // Таймаут для мобильных устройств (5 секунд)
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('Password verification timeout')), 5000)
      );

      const verificationPromise = this.cryptoPasswordCheck(user, password);

      // Гонка между верификацией и таймаутом
      return await Promise.race([verificationPromise, timeoutPromise]);
    } catch (error) {
      // Crypto verification failed, falling back to simple check
      return await this.simplePasswordCheck(user, password);
    }
  }

  // Криптографическая проверка для десктопных браузеров
  private async cryptoPasswordCheck(user: User, password: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    const saltBytes = this.base64ToArrayBuffer(user.pwd_salt);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      32 * 8
    );

    const computedHash = this.arrayBufferToBase64(hashBuffer);
    return computedHash === user.pwd_hash;
  }

  // Упрощенная проверка для мобильных устройств (с реальными хешами!)
  private async simplePasswordCheck(user: User, password: string): Promise<boolean> {
    try {
      if (!crypto.subtle) {
        console.error('❌ Crypto API not available - cannot verify password securely');
        return false; // НЕ ПРОПУСКАЕМ без проверки - это небезопасно
      }

      // Упрощенный PBKDF2 с меньшим количеством итераций для мобильных
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      const saltBytes = this.base64ToArrayBuffer(user.pwd_salt);

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      // Уменьшенное количество итераций для мобильных устройств (но всё ещё безопасно)
      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 10000, // Вместо 100000 - быстрее на мобильных
          hash: 'SHA-256'
        },
        keyMaterial,
        32 * 8
      );

      const computedHash = this.arrayBufferToBase64(hashBuffer);
      // ВАЖНО: Сравниваем с РЕАЛЬНЫМ хешем пользователя
      return computedHash === user.pwd_hash;
    } catch (error) {
      console.error('❌ Mobile password check failed:', error);
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