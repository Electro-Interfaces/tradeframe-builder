/**
 * 🔄 СЕРВИС АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ ТОКЕНОВ
 * 
 * Автоматически обновляет Bearer токены при истечении срока действия
 * Поддерживает Basic Auth для получения новых токенов
 * Интегрирован с universalHttpClient и tradingNetworkConfigService
 */

import { tradingNetworkConfigService, TradingNetworkConfig } from './tradingNetworkConfigService';
import { httpClient } from './universalHttpClient';

export interface TokenInfo {
  token: string;
  expiresAt: number;
  isValid: boolean;
  timeUntilExpiry: number;
}

export interface TokenRefreshResult {
  success: boolean;
  newToken?: string;
  expiresAt?: number;
  error?: string;
}

class TokenRefreshService {
  private refreshPromise: Promise<TokenRefreshResult> | null = null;
  private readonly REFRESH_BUFFER_MINUTES = 5; // Обновляем за 5 минут до истечения

  /**
   * 📝 Декодировать JWT токен для получения информации об истечении
   */
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('❌ Ошибка декодирования JWT:', error);
      return null;
    }
  }

  /**
   * 🔍 Проверить информацию о токене
   */
  public analyzeToken(token: string): TokenInfo {
    const decoded = this.decodeJWT(token);
    
    if (!decoded || !decoded.exp) {
      return {
        token,
        expiresAt: 0,
        isValid: false,
        timeUntilExpiry: 0
      };
    }

    const expiresAt = decoded.exp * 1000; // Конвертируем в миллисекунды
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const isValid = timeUntilExpiry > 0;

    return {
      token,
      expiresAt,
      isValid,
      timeUntilExpiry
    };
  }

  /**
   * 🔄 Получить новый токен через Basic Auth
   */
  private async refreshTokenWithBasicAuth(config: TradingNetworkConfig): Promise<TokenRefreshResult> {
    if (!config.username || !config.password) {
      return {
        success: false,
        error: 'Для обновления токена требуются логин и пароль в настройках Basic Auth'
      };
    }

    try {
      console.log('🔄 Обновляем токен через Basic Auth...');
      
      const credentials = btoa(`${config.username}:${config.password}`);
      const response = await httpClient.post('/v1/auth', null, {
        destination: 'external-api',
        useAuth: false,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.success) {
        throw new Error(`HTTP ${response.status}: ${response.error}`);
      }

      const newToken = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      const cleanToken = newToken.replace(/^"|"$/g, ''); // Убираем кавычки если есть
      
      // Анализируем новый токен
      const tokenInfo = this.analyzeToken(cleanToken);
      
      if (!tokenInfo.isValid) {
        throw new Error('Получен недействительный токен');
      }

      console.log('✅ Токен успешно обновлен:', {
        expiresAt: new Date(tokenInfo.expiresAt).toLocaleString(),
        timeUntilExpiry: Math.round(tokenInfo.timeUntilExpiry / 1000 / 60) + ' минут'
      });

      return {
        success: true,
        newToken: cleanToken,
        expiresAt: tokenInfo.expiresAt
      };

    } catch (error: any) {
      console.error('❌ Ошибка обновления токена:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка при обновлении токена'
      };
    }
  }

  /**
   * 🔄 Автоматически обновить токен если нужно
   */
  public async ensureValidToken(): Promise<TokenRefreshResult> {
    // Если уже идет процесс обновления, ждем его завершения
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    try {
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.apiKey) {
        return {
          success: false,
          error: 'API ключ не настроен'
        };
      }

      const tokenInfo = this.analyzeToken(config.apiKey);
      
      // Если токен валидный и не требует обновления
      const bufferTime = this.REFRESH_BUFFER_MINUTES * 60 * 1000;
      if (tokenInfo.isValid && tokenInfo.timeUntilExpiry > bufferTime) {
        return {
          success: true,
          newToken: config.apiKey,
          expiresAt: tokenInfo.expiresAt
        };
      }

      console.log('⚠️ Токен требует обновления:', {
        isValid: tokenInfo.isValid,
        timeUntilExpiry: Math.round(tokenInfo.timeUntilExpiry / 1000 / 60) + ' минут'
      });

      // Запускаем обновление токена
      this.refreshPromise = this.refreshTokenWithBasicAuth(config);
      const result = await this.refreshPromise;

      // Если обновление прошло успешно, сохраняем новый токен
      if (result.success && result.newToken) {
        const updatedConfig: TradingNetworkConfig = {
          ...config,
          apiKey: result.newToken
        };
        
        await tradingNetworkConfigService.saveConfig(updatedConfig);
        console.log('💾 Новый токен сохранен в конфигурации');
      }

      this.refreshPromise = null;
      return result;

    } catch (error: any) {
      this.refreshPromise = null;
      return {
        success: false,
        error: error.message || 'Ошибка при проверке токена'
      };
    }
  }

  /**
   * 🔍 Проверить нужно ли обновлять токен
   */
  public async shouldRefreshToken(): Promise<boolean> {
    try {
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.apiKey) {
        return false;
      }

      const tokenInfo = this.analyzeToken(config.apiKey);
      const bufferTime = this.REFRESH_BUFFER_MINUTES * 60 * 1000;
      
      return !tokenInfo.isValid || tokenInfo.timeUntilExpiry <= bufferTime;
    } catch (error) {
      console.error('❌ Ошибка проверки токена:', error);
      return false;
    }
  }

  /**
   * 📊 Получить информацию о текущем токене
   */
  public async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const config = await tradingNetworkConfigService.getConfig();
      
      if (!config.apiKey) {
        return null;
      }

      return this.analyzeToken(config.apiKey);
    } catch (error) {
      console.error('❌ Ошибка получения информации о токене:', error);
      return null;
    }
  }

  /**
   * ⏰ Запустить периодическую проверку токена
   */
  public startTokenMonitoring(intervalMinutes: number = 10): void {
    const interval = setInterval(async () => {
      try {
        if (await this.shouldRefreshToken()) {
          console.log('🔄 Запуск планового обновления токена...');
          const result = await this.ensureValidToken();
          
          if (result.success) {
            console.log('✅ Плановое обновление токена завершено');
          } else {
            console.warn('⚠️ Плановое обновление токена не удалось:', result.error);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка в мониторинге токена:', error);
      }
    }, intervalMinutes * 60 * 1000);

    // Сохраняем ссылку на интервал для возможности остановки
    (window as any).__tokenMonitoringInterval = interval;
  }

  /**
   * 🛑 Остановить мониторинг токена
   */
  public stopTokenMonitoring(): void {
    const interval = (window as any).__tokenMonitoringInterval;
    if (interval) {
      clearInterval(interval);
      delete (window as any).__tokenMonitoringInterval;
      console.log('🛑 Мониторинг токена остановлен');
    }
  }
}

// Создаем singleton экземпляр
export const tokenRefreshService = new TokenRefreshService();

export default tokenRefreshService;