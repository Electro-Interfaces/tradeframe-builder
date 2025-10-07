/**
 * Сервис для работы с помощью на страницах приложения
 */

interface PageHelpItem {
  id: string;
  route: string;
  section?: string;
  title: string;
  content: string;
  help_type: 'tooltip' | 'modal' | 'sidebar' | 'inline';
  is_active: boolean;
}

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

class PageHelpService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate: number = 0;

  private getConfig(): ExternalDatabaseConfig {
    // Используем хардкодинг вместо localStorage
    if (!this.config) {
      this.config = {
        url: 'https://ssvazdgnmatbdynkhkqo.supabase.co',
        apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0'
      };
    }
    
    return this.config;
  }

  // Публичный метод для принудительного сброса кэша
  public clearConfigCache(): void {
    this.config = null;
    this.lastConfigUpdate = 0;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    const fullUrl = `${config.url}/rest/v1/${endpoint}`;
    
    console.log(`🌐 PageHelpService: Запрос к ${fullUrl}`, {
      method: options.method || 'GET',
      hasBody: !!options.body
    });

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'apikey': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.headers
        }
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ PageHelpService: Ошибка ${response.status}:`, errorText);
        
        // Если 401/403 - проблема с авторизацией, сбрасываем кэш
        if (response.status === 401 || response.status === 403) {
          this.clearConfigCache();
        }
        
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      }
      
      const textData = await response.text();
      return textData;
      
    } catch (error) {
      console.error(`💥 PageHelpService: Критическая ошибка запроса к ${endpoint}:`, error);
      
      // При сетевых ошибках сбрасываем кэш - возможно изменился URL
      if (error instanceof TypeError || error.message.includes('fetch')) {
        this.clearConfigCache();
      }
      
      throw error;
    }
  }

  async getAllHelp(): Promise<PageHelpItem[]> {
    try {
      console.log('PageHelpService: Загружаем помощь из БД...');
      const response = await this.makeRequest(
        'page_help?deleted_at=is.null&is_active=eq.true&order=sort_order.asc',
        { method: 'GET' }
      );

      console.log('PageHelpService: Получен ответ от БД:', response);
      return response.map((item: any) => ({
        id: item.id,
        route: item.route,
        section: item.section,
        title: item.title,
        content: item.content,
        help_type: item.help_type,
        is_active: item.is_active
      }));
    } catch (error) {
      console.error('Error fetching help:', error);
      throw error;
    }
  }

  async getHelpForRoute(route: string): Promise<PageHelpItem[]> {
    try {
      const response = await this.makeRequest(
        `page_help?route=eq.${encodeURIComponent(route)}&deleted_at=is.null&is_active=eq.true&order=sort_order.asc`,
        { method: 'GET' }
      );

      return response.map((item: any) => ({
        id: item.id,
        route: item.route,
        section: item.section,
        title: item.title,
        content: item.content,
        help_type: item.help_type,
        is_active: item.is_active
      }));
    } catch (error) {
      console.error('Error fetching help for route:', error);
      return [];
    }
  }

  async createHelp(helpData: Omit<PageHelpItem, 'id'>): Promise<PageHelpItem> {
    try {
      const response = await this.makeRequest('page_help', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '00000000-0000-0000-0000-000000000001',
          route: helpData.route,
          section: helpData.section,
          title: helpData.title,
          content: helpData.content,
          content_type: 'markdown',
          help_type: helpData.help_type,
          is_active: helpData.is_active,
          sort_order: 0
        })
      });

      return {
        id: response[0].id,
        route: response[0].route,
        section: response[0].section,
        title: response[0].title,
        content: response[0].content,
        help_type: response[0].help_type,
        is_active: response[0].is_active
      };
    } catch (error) {
      console.error('Error creating help:', error);
      throw error;
    }
  }

  async updateHelp(id: string, helpData: Partial<Omit<PageHelpItem, 'id'>>): Promise<PageHelpItem> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (helpData.title !== undefined) updateData.title = helpData.title;
      if (helpData.content !== undefined) updateData.content = helpData.content;
      if (helpData.help_type !== undefined) updateData.help_type = helpData.help_type;
      if (helpData.is_active !== undefined) updateData.is_active = helpData.is_active;
      if (helpData.section !== undefined) updateData.section = helpData.section;

      const response = await this.makeRequest(`page_help?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return {
        id: response[0].id,
        route: response[0].route,
        section: response[0].section,
        title: response[0].title,
        content: response[0].content,
        help_type: response[0].help_type,
        is_active: response[0].is_active
      };
    } catch (error) {
      console.error('Error updating help:', error);
      throw error;
    }
  }

  async deleteHelp(id: string): Promise<void> {
    try {
      // Soft delete
      await this.makeRequest(`page_help?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: false
        })
      });
    } catch (error) {
      console.error('Error deleting help:', error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('page_help?limit=1', { method: 'GET' });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Метод для получения статистики
  async getHelpStats(): Promise<{
    total: number;
    active: number;
    by_route: { route: string; count: number }[];
  }> {
    try {
      const allHelp = await this.getAllHelp();
      
      const byRoute = allHelp.reduce((acc, item) => {
        acc[item.route] = (acc[item.route] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        total: allHelp.length,
        active: allHelp.filter(h => h.is_active).length,
        by_route: Object.entries(byRoute).map(([route, count]) => ({ route, count }))
      };
    } catch (error) {
      console.error('Error fetching help stats:', error);
      return { total: 0, active: 0, by_route: [] };
    }
  }
}

export const pageHelpService = new PageHelpService();