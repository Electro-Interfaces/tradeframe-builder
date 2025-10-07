/**
 * Сервис для работы с инструкциями во внешней базе данных Supabase
 */

import type {
  InstructionTopic,
  InstructionVersion,
  InstructionStats,
  CreateInstructionTopicRequest,
  CreateInstructionVersionRequest,
  UpdateInstructionVersionRequest,
  InstructionForUser,
  InstructionFilters,
  InstructionView
} from '@/types/instructions';

interface ExternalDatabaseConfig {
  url: string;
  apiKey: string;
}

// Маппинг старых типов в новую структуру БД
interface PageHelpRecord {
  id: string;
  route: string;
  section?: string;
  title: string;
  content: string;
  content_type: 'markdown' | 'html';
  help_type: 'tooltip' | 'modal' | 'sidebar' | 'inline';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class ExternalInstructionsService {
  private config: ExternalDatabaseConfig | null = null;
  private lastConfigUpdate: number = 0;

  private getConfig(): ExternalDatabaseConfig {
    const now = Date.now();
    if (this.config && (now - this.lastConfigUpdate) < 1000) {
      return this.config;
    }

    
    const savedSettings = localStorage.getItem('externalDatabase');
    if (!savedSettings) {
      console.error('❌ ExternalInstructionsService: Настройки подключения не найдены');
      throw new Error('Настройки подключения к внешней базе данных не найдены');
    }

    try {
      const parsed = JSON.parse(savedSettings);
      if (!parsed.url || !parsed.apiKey) {
        console.error('❌ ExternalInstructionsService: Неполные настройки:', parsed);
        throw new Error('Неполные настройки подключения к базе данных');
      }
      
      this.config = {
        url: parsed.url,
        apiKey: parsed.apiKey
      };
      this.lastConfigUpdate = now;
      
      return this.config;
    } catch (error) {
      console.error('❌ ExternalInstructionsService: Ошибка парсинга настроек:', error);
      throw new Error('Ошибка чтения настроек подключения к базе данных');
    }
  }

  public clearConfigCache(): void {
    this.config = null;
    this.lastConfigUpdate = 0;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig();
    const fullUrl = `${config.url}/rest/v1/${endpoint}`;
    

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
        console.error(`❌ ExternalInstructionsService: Ошибка ${response.status}:`, errorText);
        
        if (response.status === 401 || response.status === 403) {
          this.clearConfigCache();
        }
        
        throw new Error(`Database error: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`💥 ExternalInstructionsService: Ошибка запроса:`, error);
      throw error;
    }
  }

  // Преобразование записи БД в тему инструкции
  private transformToTopic(record: PageHelpRecord): InstructionTopic {
    return {
      id: record.id,
      key: this.routeToKey(record.route),
      route: record.route,
      title: record.title,
      description: record.section || '',
      is_active: record.is_active,
      views_total: 0,
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }

  // Преобразование записи БД в версию инструкции
  private transformToVersion(record: PageHelpRecord): InstructionVersion {
    return {
      id: `${record.id}_v1`,
      topic_id: record.id,
      version: 1,
      status: record.is_active ? 'published' : 'draft',
      locale: 'ru',
      title: record.title,
      content_md: record.content_type === 'markdown' ? record.content : this.htmlToMarkdown(record.content),
      content_html: record.content_type === 'html' ? record.content : this.markdownToHtml(record.content),
      changelog: 'Автоматически созданная версия',
      editor_id: 'system',
      editor_name: 'Система',
      views_count: 0,
      created_at: record.created_at,
      updated_at: record.updated_at,
      published_at: record.is_active ? record.created_at : undefined
    };
  }

  private routeToKey(route: string): string {
    return route.replace(/^\//, '').replace(/\//g, '-');
  }

  private markdownToHtml(markdown: string): string {
    // Упрощенная конвертация Markdown в HTML
    return markdown
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|u|l])/gm, '<p>')
      .replace(/$/gm, '</p>')
      .replace(/<p[^>]*><\/p>/g, '');
  }

  private htmlToMarkdown(html: string): string {
    // Упрощенная конвертация HTML в Markdown
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
      .replace(/<ul[^>]*>|<\/ul>/gi, '')
      .replace(/<p[^>]*>|<\/p>/gi, '\n\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  async getTopics(): Promise<InstructionTopic[]> {
    try {
      const response = await this.makeRequest(
        'page_help?deleted_at=is.null&order=created_at.desc'
      );

      return response.map((record: any) => this.transformToTopic(record));
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  }

  async getTopicByKey(key: string): Promise<InstructionTopic | null> {
    try {
      const route = key.startsWith('/') ? key : `/${key.replace('-', '/')}`;
      const response = await this.makeRequest(
        `page_help?route=eq.${encodeURIComponent(route)}&deleted_at=is.null&limit=1`
      );

      if (response.length === 0) return null;
      
      return this.transformToTopic(response[0]);
    } catch (error) {
      console.error('Error fetching topic by key:', error);
      return null;
    }
  }

  async getInstructionForUser(routeOrKey: string): Promise<InstructionForUser | null> {
    try {
      
      const route = routeOrKey.startsWith('/') ? routeOrKey : `/${routeOrKey}`;
      const response = await this.makeRequest(
        `page_help?route=like.*${encodeURIComponent(route)}*&deleted_at=is.null&is_active=eq.true&order=created_at.desc&limit=1`
      );

      if (response.length === 0) {
        console.log('❌ Инструкция не найдена для:', routeOrKey);
        return null;
      }

      const record = response[0];
      const topic = this.transformToTopic(record);
      const version = this.transformToVersion(record);

      
      return {
        topic,
        version,
        has_newer_version: false
      };
    } catch (error) {
      console.error('Error getting instruction for user:', error);
      return null;
    }
  }

  async createTopic(request: CreateInstructionTopicRequest): Promise<InstructionTopic> {
    try {
      const response = await this.makeRequest('page_help', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: '00000000-0000-0000-0000-000000000001',
          route: request.route,
          section: null,
          title: request.title,
          content: `## ${request.title}\n\n${request.description || 'Описание будет добавлено позже.'}`,
          content_type: 'markdown',
          help_type: 'sidebar',
          is_active: request.is_active ?? true,
          sort_order: 0
        })
      });

      return this.transformToTopic(response[0]);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }

  async getVersions(topicId: string): Promise<InstructionVersion[]> {
    try {
      const response = await this.makeRequest(
        `page_help?id=eq.${topicId}&deleted_at=is.null`
      );

      if (response.length === 0) return [];
      
      return [this.transformToVersion(response[0])];
    } catch (error) {
      console.error('Error fetching versions:', error);
      return [];
    }
  }

  async createVersion(request: CreateInstructionVersionRequest): Promise<InstructionVersion> {
    try {
      // Обновляем существующую запись вместо создания новой версии
      const response = await this.makeRequest(`page_help?id=eq.${request.topic_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: request.title,
          content: request.content_md,
          content_type: 'markdown',
          updated_at: new Date().toISOString()
        })
      });

      return this.transformToVersion(response[0]);
    } catch (error) {
      console.error('Error creating version:', error);
      throw error;
    }
  }

  async updateVersion(versionId: string, request: UpdateInstructionVersionRequest): Promise<InstructionVersion> {
    try {
      const topicId = versionId.replace('_v1', '');
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.title) updateData.title = request.title;
      if (request.content_md) {
        updateData.content = request.content_md;
        updateData.content_type = 'markdown';
      }

      const response = await this.makeRequest(`page_help?id=eq.${topicId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      return this.transformToVersion(response[0]);
    } catch (error) {
      console.error('Error updating version:', error);
      throw error;
    }
  }

  async publishVersion(versionId: string): Promise<InstructionVersion> {
    try {
      const topicId = versionId.replace('_v1', '');
      
      const response = await this.makeRequest(`page_help?id=eq.${topicId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: true,
          updated_at: new Date().toISOString()
        })
      });

      const version = this.transformToVersion(response[0]);
      version.status = 'published';
      version.published_at = new Date().toISOString();

      return version;
    } catch (error) {
      console.error('Error publishing version:', error);
      throw error;
    }
  }

  async logView(topicId: string, versionId: string, userId: string = 'anonymous'): Promise<void> {
    // В упрощенной версии не логируем просмотры в БД
  }

  async getStats(): Promise<InstructionStats> {
    try {
      const topics = await this.getTopics();
      const activeTopics = topics.filter(t => t.is_active);
      
      return {
        total_topics: topics.length,
        total_versions: topics.length,
        total_views: 0,
        active_topics: activeTopics.length,
        published_versions: activeTopics.length,
        most_viewed_topics: activeTopics.slice(0, 5).map(topic => ({
          topic,
          views: topic.views_total
        })),
        recent_views: []
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_topics: 0,
        total_versions: 0,
        total_views: 0,
        active_topics: 0,
        published_versions: 0,
        most_viewed_topics: [],
        recent_views: []
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('page_help?limit=1');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Метод для миграции данных из mock-сервиса
  async migrateMockData(mockTopics: InstructionTopic[], mockVersions: InstructionVersion[]): Promise<void> {
    try {
      
      for (const topic of mockTopics) {
        const version = mockVersions.find(v => v.topic_id === topic.id && v.status === 'published');
        
        if (version) {
          try {
            await this.makeRequest('page_help', {
              method: 'POST',
              body: JSON.stringify({
                tenant_id: '00000000-0000-0000-0000-000000000001',
                route: topic.route,
                section: null,
                title: topic.title,
                content: version.content_md,
                content_type: 'markdown',
                help_type: 'sidebar',
                is_active: topic.is_active,
                sort_order: 0
              })
            });
            
          } catch (error) {
            console.error('❌ Ошибка миграции темы:', topic.title, error);
          }
        }
      }
      
    } catch (error) {
      console.error('💥 Ошибка миграции:', error);
      throw error;
    }
  }
}

export const externalInstructionsService = new ExternalInstructionsService();