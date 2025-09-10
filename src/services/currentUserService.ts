/**
 * Сервис для работы с профилем текущего пользователя
 */

import { usersService, type User } from './usersService';

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
      return await usersService.getUserByEmail(email);
    } catch (error) {
      console.error('Ошибка получения пользователя по email:', error);
      throw error;
    }
  }

  /**
   * Проверяет существование пользователя с данным email и паролем
   * В реальной системе пароль должен быть хешированным
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        return null;
      }

      // Простая проверка пароля (в реальной системе нужна хеш-проверка)
      // Для демо - принимаем любой пароль для существующих пользователей
      if (password && password.length >= 3) {
        return user;
      }

      return null;
    } catch (error) {
      console.error('Ошибка аутентификации:', error);
      throw error;
    }
  }
}

export const currentUserService = new CurrentUserService();