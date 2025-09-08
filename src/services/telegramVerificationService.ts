/**
 * Сервис для работы с верификацией Telegram аккаунтов
 * Обеспечивает генерацию кодов, проверку статуса и привязку аккаунтов
 */

import { supabaseService } from './supabaseServiceClient';

export interface VerificationCode {
  id: string;
  userId: string;
  verificationCode: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  usedAt?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface VerificationResult {
  success: boolean;
  verificationCode?: string;
  expiresAt?: string;
  error?: string;
  errorCode?: string;
}

export interface TelegramUser {
  telegramChatId?: string;
  telegramVerifiedAt?: string;
  telegramNotificationsEnabled: boolean;
}

class TelegramVerificationService {
  private readonly EXPIRATION_MINUTES = 15;
  private readonly CODE_LENGTH = 6;
  private readonly CODE_PREFIX = 'TF';

  /**
   * Генерация кода верификации для пользователя
   */
  async generateVerificationCode(userId: string): Promise<VerificationResult> {
    try {
      console.log('🔄 Генерация кода верификации для пользователя:', userId);

      // Проверяем существование пользователя
      const { data: user, error: userError } = await supabaseService
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('❌ Пользователь не найден:', userError);
        return {
          success: false,
          error: 'Пользователь не найден',
          errorCode: 'USER_NOT_FOUND'
        };
      }

      // Удаляем старые неиспользованные коды пользователя
      const { error: deleteError } = await supabaseService
        .from('telegram_verification_codes')
        .delete()
        .eq('user_id', userId)
        .eq('is_used', false);

      if (deleteError) {
        console.warn('⚠️ Ошибка при удалении старых кодов:', deleteError);
      }

      // Генерируем новый уникальный код
      const verificationCode = await this.generateUniqueCode();
      const expiresAt = new Date(Date.now() + this.EXPIRATION_MINUTES * 60 * 1000);

      // Получаем дополнительную информацию для логирования
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : null;

      // Сохраняем код в базу данных
      const { data: codeRecord, error: insertError } = await supabaseService
        .from('telegram_verification_codes')
        .insert({
          user_id: userId,
          verification_code: verificationCode,
          expires_at: expiresAt.toISOString(),
          user_agent: userAgent
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('❌ Ошибка при сохранении кода:', insertError);
        return {
          success: false,
          error: 'Ошибка при создании кода верификации',
          errorCode: 'DATABASE_ERROR'
        };
      }

      console.log('✅ Код верификации создан:', {
        code: verificationCode,
        expires: expiresAt.toISOString(),
        userId: userId
      });

      return {
        success: true,
        verificationCode,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error: any) {
      console.error('❌ Ошибка генерации кода:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка',
        errorCode: 'GENERATION_ERROR'
      };
    }
  }

  /**
   * Проверка статуса верификации пользователя
   */
  async getVerificationStatus(userId: string): Promise<{
    isConnected: boolean;
    telegramChatId?: string;
    verifiedAt?: string;
    notificationsEnabled: boolean;
    hasActiveCode: boolean;
    activeCode?: string;
    expiresAt?: string;
  }> {
    try {
      // Получаем информацию о пользователе
      const { data: user, error: userError } = await supabaseService
        .from('users')
        .select('telegram_chat_id, telegram_verified_at, telegram_notifications_enabled')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('❌ Ошибка получения пользователя:', userError);
        return {
          isConnected: false,
          notificationsEnabled: false,
          hasActiveCode: false
        };
      }

      // Проверяем наличие активного кода
      const { data: activeCode } = await supabaseService
        .from('telegram_verification_codes')
        .select('verification_code, expires_at')
        .eq('user_id', userId)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        isConnected: !!user.telegram_chat_id,
        telegramChatId: user.telegram_chat_id || undefined,
        verifiedAt: user.telegram_verified_at || undefined,
        notificationsEnabled: user.telegram_notifications_enabled || false,
        hasActiveCode: !!activeCode,
        activeCode: activeCode?.verification_code,
        expiresAt: activeCode?.expires_at
      };

    } catch (error) {
      console.error('❌ Ошибка проверки статуса:', error);
      return {
        isConnected: false,
        notificationsEnabled: false,
        hasActiveCode: false
      };
    }
  }

  /**
   * Отключение Telegram аккаунта
   */
  async disconnectTelegram(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Отключение Telegram для пользователя:', userId);

      // Очищаем Telegram данные пользователя
      const { error: updateError } = await supabaseService
        .from('users')
        .update({
          telegram_chat_id: null,
          telegram_verified_at: null,
          telegram_notifications_enabled: false
        })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Ошибка отключения Telegram:', updateError);
        return {
          success: false,
          error: 'Ошибка при отключении Telegram'
        };
      }

      // Удаляем все коды верификации пользователя
      await supabaseService
        .from('telegram_verification_codes')
        .delete()
        .eq('user_id', userId);

      console.log('✅ Telegram успешно отключен для пользователя:', userId);

      return { success: true };

    } catch (error: any) {
      console.error('❌ Ошибка отключения Telegram:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Отправка тестового уведомления
   */
  async sendTestNotification(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Получаем Chat ID пользователя
      const { data: user, error: userError } = await supabaseService
        .from('users')
        .select('telegram_chat_id, name, email')
        .eq('id', userId)
        .single();

      if (userError || !user?.telegram_chat_id) {
        return {
          success: false,
          error: 'Telegram не подключен'
        };
      }

      // Импортируем telegramService и отправляем тестовое сообщение
      const { telegramService } = await import('./telegramService');
      
      const testMessage = 
        `🔧 <b>Тестовое уведомление TradeFrame</b>\n\n` +
        `👤 <b>Пользователь:</b> ${user.name}\n` +
        `📧 <b>Email:</b> ${user.email}\n` +
        `🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU')}\n\n` +
        `✅ Telegram уведомления работают корректно!`;

      const result = await telegramService.sendMessage(testMessage, user.telegram_chat_id);

      if (result) {
        console.log('✅ Тестовое уведомление отправлено успешно');
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Не удалось отправить сообщение'
        };
      }

    } catch (error: any) {
      console.error('❌ Ошибка отправки тестового уведомления:', error);
      return {
        success: false,
        error: error.message || 'Ошибка отправки уведомления'
      };
    }
  }

  /**
   * Обновление настроек уведомлений
   */
  async updateNotificationSettings(
    userId: string, 
    notificationsEnabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseService
        .from('users')
        .update({
          telegram_notifications_enabled: notificationsEnabled
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Ошибка обновления настроек:', error);
        return {
          success: false,
          error: 'Ошибка обновления настроек'
        };
      }

      console.log('✅ Настройки уведомлений обновлены:', { userId, notificationsEnabled });
      return { success: true };

    } catch (error: any) {
      console.error('❌ Ошибка обновления настроек:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение активных кодов (для администрирования)
   */
  async getActiveCodes(): Promise<VerificationCode[]> {
    try {
      const { data, error } = await supabaseService
        .from('telegram_verification_codes')
        .select(`
          *,
          users (name, email)
        `)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Ошибка получения активных кодов:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Ошибка получения активных кодов:', error);
      return [];
    }
  }

  /**
   * Очистка просроченных кодов
   */
  async cleanupExpiredCodes(): Promise<{ cleaned: number; error?: string }> {
    try {
      const { error, count } = await supabaseService
        .from('telegram_verification_codes')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .eq('is_used', false);

      if (error) {
        console.error('❌ Ошибка очистки просроченных кодов:', error);
        return {
          cleaned: 0,
          error: 'Ошибка очистки'
        };
      }

      console.log(`🧹 Очищено просроченных кодов: ${count || 0}`);
      return { cleaned: count || 0 };

    } catch (error: any) {
      console.error('❌ Ошибка очистки:', error);
      return {
        cleaned: 0,
        error: error.message
      };
    }
  }

  // ========== ПРИВАТНЫЕ МЕТОДЫ ==========

  /**
   * Генерация уникального кода верификации
   */
  private async generateUniqueCode(): Promise<string> {
    const charset = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Исключили O, 0 для читаемости
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Генерируем код с префиксом
      let code = this.CODE_PREFIX;
      
      for (let i = 0; i < (this.CODE_LENGTH - this.CODE_PREFIX.length); i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        code += charset[randomIndex];
      }

      // Проверяем уникальность
      const { data: existingCode } = await supabaseService
        .from('telegram_verification_codes')
        .select('id')
        .eq('verification_code', code)
        .eq('is_used', false)
        .single();

      if (!existingCode) {
        return code;
      }

      attempts++;
    }

    throw new Error(`Не удалось сгенерировать уникальный код после ${maxAttempts} попыток`);
  }

  /**
   * Валидация формата кода
   */
  static isValidCodeFormat(code: string): boolean {
    const codeRegex = /^TF[A-Z0-9]{4,8}$/;
    return codeRegex.test(code);
  }

  /**
   * Форматирование времени до истечения
   */
  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Истек';
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);

    if (diffMinutes > 0) {
      return `${diffMinutes}:${diffSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${diffSeconds} сек`;
    }
  }
}

export const telegramVerificationService = new TelegramVerificationService();
export default telegramVerificationService;