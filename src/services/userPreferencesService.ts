/**
 * Сервис для работы с пользовательскими предпочтениями в Supabase
 * Использует динамическую конфигурацию
 */

import { supabaseClientBrowser as supabase } from './supabaseClientBrowser';
import { AuthService } from '@/services/authService';

export interface UserPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  selected_network?: string;
  selected_trading_point?: string;
  dashboard_layout?: string;
  theme?: string;
  language?: string;
  [key: string]: string | undefined;
}

class UserPreferencesService {
  
  /**
   * Получить все предпочтения текущего пользователя
   */
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user?.id) {
        console.warn('⚠️ Пользователь не авторизован, возвращаем пустые предпочтения');
        return {};
      }

      // Пробуем загрузить из базы данных
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('preference_key, preference_value')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        // Преобразуем массив в объект
        const preferences: UserPreferences = {};
        if (data) {
          data.forEach(pref => {
            preferences[pref.preference_key] = pref.preference_value;
          });
        }

        console.log('✅ Загружены предпочтения пользователя из базы данных:', preferences);
        return preferences;

      } catch (dbError) {
        console.error('❌ Таблица user_preferences недоступна или произошла ошибка базы данных:', dbError);
        throw new Error(`База данных недоступна: ${dbError.message}`);
      }

    } catch (error) {
      console.error('💥 Критическая ошибка при загрузке предпочтений:', error);
      return {};
    }
  }

  /**
   * Получить конкретное предпочтение по ключу
   */
  async getPreference(key: string): Promise<string | null> {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      throw new Error('Пользователь не авторизован');
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', user.id)
      .eq('preference_key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Запись не найдена - это нормально для новых пользователей
        return null;
      }
      throw new Error(`Ошибка при получении предпочтения ${key}: ${error.message}`);
    }

    return data?.preference_value || null;
  }

  /**
   * Установить/обновить предпочтение
   */
  async setPreference(key: string, value: string): Promise<boolean> {
    const user = await AuthService.getCurrentUser();
    if (!user?.id) {
      throw new Error('Пользователь не авторизован');
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preference_key: key,
        preference_value: value
      }, {
        onConflict: 'user_id,preference_key'
      });

    if (error) {
      throw new Error(`Ошибка при сохранении предпочтения ${key}: ${error.message}`);
    }

    console.log(`✅ Предпочтение ${key} сохранено в базу данных:`, value);
    return true;
  }

  /**
   * Установить несколько предпочтений одновременно
   */
  async setPreferences(preferences: Record<string, string>): Promise<boolean> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user?.id) {
        console.warn('⚠️ Пользователь не авторизован, не можем сохранить предпочтения');
        return false;
      }

      const records = Object.entries(preferences).map(([key, value]) => ({
        user_id: user.id,
        preference_key: key,
        preference_value: value
      }));

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(records, {
          onConflict: 'user_id,preference_key'
        });

      if (error) {
        console.error('❌ Ошибка при массовом сохранении предпочтений:', error);
        return false;
      }

      console.log('✅ Предпочтения сохранены:', preferences);
      return true;

    } catch (error) {
      console.error('💥 Критическая ошибка при массовом сохранении предпочтений:', error);
      return false;
    }
  }

  /**
   * Удалить предпочтение
   */
  async removePreference(key: string): Promise<boolean> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user?.id) {
        return false;
      }

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('preference_key', key);

      if (error) {
        console.error(`❌ Ошибка при удалении предпочтения ${key}:`, error);
        return false;
      }

      console.log(`✅ Предпочтение ${key} удалено`);
      return true;

    } catch (error) {
      console.error(`💥 Критическая ошибка при удалении предпочтения ${key}:`, error);
      return false;
    }
  }

  /**
   * Очистить все предпочтения пользователя
   */
  async clearAllPreferences(): Promise<boolean> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user?.id) {
        return false;
      }

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Ошибка при очистке всех предпочтений:', error);
        return false;
      }

      console.log('✅ Все предпочтения пользователя очищены');
      return true;

    } catch (error) {
      console.error('💥 Критическая ошибка при очистке всех предпочтений:', error);
      return false;
    }
  }

  // Специфичные методы для выбора сети и торговых точек
  
  /**
   * Получить выбранную сеть пользователя
   */
  async getSelectedNetwork(): Promise<string | null> {
    return await this.getPreference('selected_network');
  }

  /**
   * Установить выбранную сеть пользователя
   */
  async setSelectedNetwork(networkId: string): Promise<boolean> {
    return await this.setPreference('selected_network', networkId);
  }

  /**
   * Получить выбранную торговую точку пользователя
   */
  async getSelectedTradingPoint(): Promise<string | null> {
    const value = await this.getPreference('selected_trading_point');
    return value || 'all'; // По умолчанию "all"
  }

  /**
   * Установить выбранную торговую точку пользователя
   */
  async setSelectedTradingPoint(tradingPointId: string): Promise<boolean> {
    return await this.setPreference('selected_trading_point', tradingPointId);
  }

  /**
   * Установить выбор сети и торговой точки одновременно
   */
  async setNetworkSelection(networkId: string, tradingPointId: string = 'all'): Promise<boolean> {
    return await this.setPreferences({
      selected_network: networkId,
      selected_trading_point: tradingPointId
    });
  }
}

// Экспортируем singleton
export const userPreferencesService = new UserPreferencesService();