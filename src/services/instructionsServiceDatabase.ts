/**
 * Сервис для работы с инструкциями через Supabase
 * Использует service role client для прямого доступа к базе данных
 */

import { supabaseService as supabase } from './supabaseServiceClient';
import type {
  InstructionTopic,
  InstructionVersion,
  InstructionView,
  CreateInstructionTopicRequest,
  CreateInstructionVersionRequest,
  UpdateInstructionVersionRequest,
  InstructionForUser,
  InstructionStats,
  InstructionFilters,
  InstructionSearchResult,
  InstructionStatus,
  InstructionLocale
} from '@/types/instructions';

// Типы для работы с базой данных
interface PageHelpRecord {
  id: string;
  tenant_id: string;
  route: string;
  section?: string;
  title: string;
  content: string;
  content_type: string;
  help_type: string;
  sort_order: number;
  version: number;
  status: string;
  parent_id?: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export class InstructionsService {
  /**
   * Получить все темы инструкций
   */
  static async getAllTopics(includeDeleted = false): Promise<InstructionTopic[]> {
    try {
      let query = supabase
        .from('page_help')
        .select('*')
        .order('route');

      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching topics:', error);
        throw error;
      }

      // Группируем по маршруту и берем последнюю версию
      const topicsMap = new Map<string, PageHelpRecord>();
      
      data?.forEach(record => {
        const existing = topicsMap.get(record.route);
        if (!existing || record.version > existing.version) {
          topicsMap.set(record.route, record);
        }
      });

      return Array.from(topicsMap.values()).map(this.mapRecordToTopic);
    } catch (error) {
      console.error('Error in getAllTopics:', error);
      return [];
    }
  }

  /**
   * Получить тему по ID
   */
  static async getTopicById(id: string): Promise<InstructionTopic | null> {
    try {
      const { data, error } = await supabase
        .from('page_help')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        console.error('Error fetching topic by ID:', error);
        return null;
      }

      return data ? this.mapRecordToTopic(data) : null;
    } catch (error) {
      console.error(`Failed to get topic by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Получить темы с фильтрами
   */
  static async getTopics(filters?: InstructionFilters): Promise<InstructionTopic[]> {
    try {
      let query = supabase
        .from('page_help')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('route');

      if (filters?.route) {
        query = query.ilike('route', `%${filters.route}%`);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching topics with filters:', error);
        throw error;
      }

      // Группируем по маршруту и берем последнюю версию
      const topicsMap = new Map<string, PageHelpRecord>();
      
      data?.forEach(record => {
        const existing = topicsMap.get(record.route);
        if (!existing || record.version > existing.version) {
          topicsMap.set(record.route, record);
        }
      });

      return Array.from(topicsMap.values()).map(this.mapRecordToTopic);
    } catch (error) {
      console.error('Error in getTopics:', error);
      return [];
    }
  }

  /**
   * Получить тему по ключу или маршруту
   */
  static async getTopicByKey(key: string): Promise<InstructionTopic | null> {
    try {
      const route = key.startsWith('/') ? key : `/${key.replace(/-/g, '/')}`;
      
      const { data, error } = await supabase
        .from('page_help')
        .select('*')
        .eq('route', route)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching topic by key:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      return this.mapRecordToTopic(data[0]);
    } catch (error) {
      console.error('Error in getTopicByKey:', error);
      return null;
    }
  }

  /**
   * Получить инструкцию для пользователя
   */
  static async getInstructionForUser(routeOrKey: string): Promise<InstructionForUser | null> {
    try {
      console.log('🔍 Ищем инструкцию для:', routeOrKey);
      
      const route = routeOrKey.startsWith('/') ? routeOrKey : `/${routeOrKey.replace(/-/g, '/')}`;
      
      const { data, error } = await supabase
        .from('page_help')
        .select('*')
        .eq('route', route)
        .eq('status', 'published')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching instruction for user:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('❌ Инструкция не найдена для:', route);
        return null;
      }

      const record = data[0];
      const topic = this.mapRecordToTopic(record);
      const version = this.mapRecordToVersion(record);

      // Проверяем есть ли новая версия в черновике
      const { data: newerData } = await supabase
        .from('page_help')
        .select('version')
        .eq('route', route)
        .eq('status', 'draft')
        .gt('version', record.version)
        .limit(1);

      const hasNewerVersion = newerData && newerData.length > 0;

      console.log('✅ Найдена инструкция:', { title: topic.title, version: version.version });

      return {
        topic,
        version,
        has_newer_version: hasNewerVersion
      };
    } catch (error) {
      console.error('Error in getInstructionForUser:', error);
      throw error;
    }
  }

  /**
   * Создать новую тему
   */
  static async createTopic(input: CreateInstructionTopicRequest): Promise<InstructionTopic> {
    try {
      const { data, error } = await supabase
        .from('page_help')
        .insert({
          tenant_id: '00000000-0000-0000-0000-000000000001',
          route: input.route,
          title: input.title,
          content: input.description || 'Новая инструкция',
          content_type: 'markdown',
          help_type: 'modal',
          status: 'draft',
          is_active: input.is_active ?? true,
          version: 1,
          sort_order: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating topic:', error);
        throw error;
      }

      return this.mapRecordToTopic(data);
    } catch (error) {
      console.error('Error in createTopic:', error);
      throw error;
    }
  }

  /**
   * Получить версии темы
   */
  static async getVersions(topicId: string): Promise<InstructionVersion[]> {
    try {
      // Сначала получаем маршрут темы
      const { data: topicData, error: topicError } = await supabase
        .from('page_help')
        .select('route')
        .eq('id', topicId)
        .single();

      if (topicError || !topicData) {
        return [];
      }

      const { data, error } = await supabase
        .from('page_help')
        .select('*')
        .eq('route', topicData.route)
        .is('deleted_at', null)
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching versions:', error);
        throw error;
      }

      return data?.map(this.mapRecordToVersion) || [];
    } catch (error) {
      console.error('Error in getVersions:', error);
      return [];
    }
  }

  /**
   * Создать новую версию
   */
  static async createVersion(input: CreateInstructionVersionRequest): Promise<InstructionVersion> {
    try {
      // Получаем информацию о теме
      const { data: topicData, error: topicError } = await supabase
        .from('page_help')
        .select('route')
        .eq('id', input.topic_id)
        .single();

      if (topicError || !topicData) {
        throw new Error('Topic not found');
      }

      // Получаем максимальную версию для данного маршрута
      const { data: maxVersionData } = await supabase
        .from('page_help')
        .select('version')
        .eq('route', topicData.route)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const newVersion = (maxVersionData?.version || 0) + 1;

      const { data, error } = await supabase
        .from('page_help')
        .insert({
          tenant_id: '00000000-0000-0000-0000-000000000001',
          route: topicData.route,
          title: input.title,
          content: input.content_md,
          content_type: 'markdown',
          help_type: 'modal',
          status: 'draft',
          is_active: true,
          version: newVersion,
          parent_id: input.topic_id,
          sort_order: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating version:', error);
        throw error;
      }

      return this.mapRecordToVersion(data);
    } catch (error) {
      console.error('Error in createVersion:', error);
      throw error;
    }
  }

  /**
   * Обновить версию
   */
  static async updateVersion(versionId: string, input: UpdateInstructionVersionRequest): Promise<InstructionVersion> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (input.title) updateData.title = input.title;
      if (input.content_md) updateData.content = input.content_md;
      if (input.status) updateData.status = input.status;

      const { data, error } = await supabase
        .from('page_help')
        .update(updateData)
        .eq('id', versionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating version:', error);
        throw error;
      }

      return this.mapRecordToVersion(data);
    } catch (error) {
      console.error('Error in updateVersion:', error);
      throw error;
    }
  }

  /**
   * Опубликовать версию
   */
  static async publishVersion(versionId: string): Promise<InstructionVersion> {
    try {
      // Получаем информацию о версии
      const { data: versionData, error: versionError } = await supabase
        .from('page_help')
        .select('route, version')
        .eq('id', versionId)
        .single();

      if (versionError || !versionData) {
        throw new Error('Version not found');
      }

      // Архивируем предыдущие опубликованные версии
      await supabase
        .from('page_help')
        .update({ status: 'archived' })
        .eq('route', versionData.route)
        .eq('status', 'published');

      // Публикуем новую версию
      const { data, error } = await supabase
        .from('page_help')
        .update({ 
          status: 'published', 
          published_at: new Date().toISOString() 
        })
        .eq('id', versionId)
        .select()
        .single();

      if (error) {
        console.error('Error publishing version:', error);
        throw error;
      }

      return this.mapRecordToVersion(data);
    } catch (error) {
      console.error('Error in publishVersion:', error);
      throw error;
    }
  }

  /**
   * Получить статистику
   */
  static async getStats(): Promise<InstructionStats> {
    try {
      const { data, error } = await supabase
        .from('page_help')
        .select('route, status, is_active')
        .is('deleted_at', null);

      if (error) {
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

      const topics = new Set();
      let activeTopics = 0;
      let publishedVersions = 0;

      data?.forEach(record => {
        topics.add(record.route);
        if (record.is_active) activeTopics++;
        if (record.status === 'published') publishedVersions++;
      });

      return {
        total_topics: topics.size,
        total_versions: data?.length || 0,
        total_views: 0, // TODO: Подсчитывать из логов
        active_topics: activeTopics,
        published_versions: publishedVersions,
        most_viewed_topics: [], // TODO: Реализовать
        recent_views: [] // TODO: Реализовать
      };
    } catch (error) {
      console.error('Error in getStats:', error);
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

  /**
   * Миграция данных из localStorage
   */
  static async migrateMockData(mockTopics: InstructionTopic[], mockVersions: InstructionVersion[]): Promise<void> {
    try {
      console.log('🚀 Начинаем миграцию данных в page_help...');
      
      for (const version of mockVersions) {
        if (version.status !== 'published') continue;
        
        const topic = mockTopics.find(t => t.id === version.topic_id);
        if (!topic) continue;

        console.log(`📄 Мигрируем: ${topic.title} (${topic.route})`);

        // Проверяем, существует ли уже запись для этого маршрута
        const { data: existing } = await supabase
          .from('page_help')
          .select('id')
          .eq('route', topic.route)
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️ Пропускаем ${topic.route} - уже существует`);
          continue;
        }

        // Создаем новую запись
        const { error } = await supabase
          .from('page_help')
          .insert({
            tenant_id: '00000000-0000-0000-0000-000000000001',
            route: topic.route,
            title: version.title,
            content: version.content_md,
            content_type: 'markdown',
            help_type: 'modal',
            status: 'published',
            is_active: true,
            version: version.version,
            sort_order: 0,
            published_at: version.published_at || new Date().toISOString()
          });

        if (error) {
          console.error(`❌ Ошибка при создании записи для ${topic.route}:`, error);
        } else {
          console.log(`✅ Создано: ${topic.route}`);
        }
      }

      console.log('🎉 Миграция завершена!');
    } catch (error) {
      console.error('💥 Ошибка миграции:', error);
      throw error;
    }
  }

  /**
   * Преобразование записи БД в InstructionTopic
   */
  private static mapRecordToTopic(record: PageHelpRecord): InstructionTopic {
    return {
      id: record.id,
      key: record.route.replace(/^\//, '').replace(/\//g, '-'),
      route: record.route,
      title: record.title,
      description: record.content.substring(0, 200) + '...',
      is_active: record.is_active,
      views_total: 0, // Будем получать отдельно
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }

  /**
   * Преобразование записи БД в InstructionVersion
   */
  private static mapRecordToVersion(record: PageHelpRecord): InstructionVersion {
    return {
      id: record.id,
      topic_id: record.parent_id || record.id,
      version: record.version,
      status: record.status as InstructionStatus,
      locale: 'ru' as InstructionLocale,
      title: record.title,
      content_md: record.content,
      content_html: '', // Будем генерировать при необходимости
      changelog: '',
      editor_id: record.created_by || 'system',
      editor_name: 'Система',
      published_at: record.published_at,
      views_count: 0, // Будем получать отдельно
      created_at: record.created_at,
      updated_at: record.updated_at
    };
  }
}