/**
 * Instructions Service - Прямое подключение к Supabase
 * УПРОЩЕН: Убраны все fallback и executeSupabaseOperation обертки
 * Прямые вызовы Supabase с четкими ошибками
 */

import { supabaseService } from './supabaseServiceClient';
import type {
  InstructionTopic,
  InstructionVersion,
  InstructionView,
  CreateInstructionTopicRequest,
  CreateInstructionVersionRequest,
  UpdateInstructionVersionRequest,
  InstructionForUser,
  InstructionStats,
  InstructionAnalytics,
  InstructionFilters,
  InstructionSearchResult,
  InstructionStatus,
  InstructionLocale
} from '@/types/instructions';

// Утилита для преобразования Markdown в HTML
const markdownToHtml = (markdown: string): string => {
  return markdown
    // Заголовки
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-slate-200 mb-3 mt-6 flex items-center gap-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-blue-300 mb-5 mt-8 flex items-center gap-2 relative pl-6 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-500 before:rounded-full">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-white mb-6 pb-3 border-b border-slate-600">$1</h1>')
    
    // Блоки кода с подсветкой
    .replace(/```([^`]+)```/gs, '<div class="bg-slate-900/80 border border-slate-700 rounded-lg p-4 my-4 font-mono text-sm overflow-x-auto"><pre class="text-green-300 whitespace-pre">$1</pre></div>')
    
    // Инлайн код
    .replace(/`([^`]+)`/g, '<code class="bg-slate-900/70 text-blue-300 px-2 py-1 rounded border border-slate-600 font-mono text-sm">$1</code>')
    
    // Цитаты
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 bg-blue-900/20 pl-4 py-2 my-4 italic text-slate-200 rounded-r-lg">$1</blockquote>')
    
    // Горизонтальные линии  
    .replace(/^---$/gm, '<hr class="border-slate-600 my-8 border-t-2">')
    
    // Жирный текст с подсветкой
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white bg-blue-900/30 px-1.5 py-0.5 rounded">$1</strong>')
    
    // Курсив
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-300">$1</em>')
    
    // Нумерованные списки
    .replace(/^(\d+)\. (.+)$/gm, '<li class="text-slate-200 mb-2 pl-2 relative"><span class="font-bold text-blue-400 mr-2">$1.</span>$2</li>')
    
    // Обычные списки с эмодзи
    .replace(/^- (.+)$/gm, '<li class="text-slate-200 mb-2 pl-6 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-blue-400 before:rounded-full">$1</li>')
    
    // Обертка списков
    .replace(/(<li[^>]*>.*<\/li>)/gs, '<ul class="space-y-2 my-4 ml-4">$1</ul>')
    
    // Параграфы
    .replace(/\n\n/g, '</p><p class="text-slate-200 leading-relaxed mb-4">')
    .replace(/^(?!<[h|u|l|b|d|p])/gm, '<p class="text-slate-200 leading-relaxed mb-4">')
    .replace(/$/gm, '</p>')
    
    // Очистка пустых параграфов
    .replace(/<p[^>]*><\/p>/g, '')
    .replace(/<p[^>]*>\s*<\/p>/g, '');
};

class InstructionsSupabaseService {
  private topicsTable = 'instruction_topics';
  private versionsTable = 'instruction_versions';
  private viewsTable = 'instruction_views';

  /**
   * Получить список тем инструкций
   */
  async getTopics(filters?: InstructionFilters): Promise<InstructionTopic[]> {
    console.log('🔍 Загрузка тем инструкций');
    
    let query = supabaseService
      .from(this.topicsTable)
      .select('*, current_version:instruction_versions(*)')
      .order('title');

    // Применяем фильтры
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Database error loading instruction topics:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Loaded instruction topics:', data?.length || 0);
    return data || [];
  }


  /**
   * Получить тему по ключу
   */
  async getTopicByKey(key: string): Promise<InstructionTopic | null> {
    console.log(`🔍 Загрузка темы инструкции по ключу ${key}`);
    
    const { data, error } = await supabaseService
      .from(this.topicsTable)
      .select('*, current_version:instruction_versions(*)')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('❌ Database error loading topic by key:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log(`✅ Loaded topic by key ${key}:`, data?.title || 'not found');
    return data;
  }

  /**
   * Получить инструкцию для пользователя
   */
  async getInstructionForUser(routeOrKey: string): Promise<InstructionForUser | null> {
    console.log(`🔍 Загрузка инструкции для пользователя ${routeOrKey}`);
    
    // Сначала ищем по ключу, потом по маршруту
    let topic = await this.getTopicByKey(routeOrKey);
    
    if (!topic) {
      const { data, error } = await supabaseService
        .from(this.topicsTable)
        .select('*, current_version:instruction_versions(*)')
        .eq('route', routeOrKey)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ Database error loading topic by route:', error);
        throw new Error(`Database unavailable: ${error.message}`);
      }
      
      topic = data;
    }

    if (!topic || !topic.current_version) {
      return null;
    }

    // Получаем последнюю опубликованную версию
    const { data: publishedVersion, error: versionError } = await supabaseService
      .from(this.versionsTable)
      .select('*')
      .eq('topic_id', topic.id)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (versionError) {
      if (versionError.code === 'PGRST116') {
        return null;
      }
      console.error('❌ Database error loading published version:', versionError);
      throw new Error(`Database unavailable: ${versionError.message}`);
    }

    if (!publishedVersion) {
      return null;
    }

    // Проверяем, есть ли более новая версия
    const { data: newerVersions, error: newerError } = await supabaseService
      .from(this.versionsTable)
      .select('id')
      .eq('topic_id', topic.id)
      .eq('status', 'published')
      .gt('version', publishedVersion.version);

    if (newerError) {
      console.error('❌ Database error checking newer versions:', newerError);
      throw new Error(`Database unavailable: ${newerError.message}`);
    }

    console.log(`✅ Loaded instruction for user ${routeOrKey}:`, topic.title);
    return {
      topic,
      version: publishedVersion,
      has_newer_version: (newerVersions || []).length > 0
    };
  }

  /**
   * Создать новую тему
   */
  async createTopic(request: CreateInstructionTopicRequest): Promise<InstructionTopic> {
    console.log('📝 Создание новой темы инструкции');
    
    const newTopic = {
      ...request,
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      is_active: request.is_active ?? true,
      views_total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseService
      .from(this.topicsTable)
      .insert([newTopic])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating topic:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Created topic:', data.title);
    return data;
  }

  /**
   * Получить версии темы
   */
  async getVersions(topicId: string): Promise<InstructionVersion[]> {
    console.log(`🔍 Загрузка версий инструкции ${topicId}`);
    
    const { data, error } = await supabaseService
      .from(this.versionsTable)
      .select('*')
      .eq('topic_id', topicId)
      .order('version', { ascending: false });

    if (error) {
      console.error('❌ Database error loading versions:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log(`✅ Loaded versions for topic ${topicId}:`, data?.length || 0);
    return data || [];
  }

  /**
   * Создать новую версию
   */
  async createVersion(request: CreateInstructionVersionRequest): Promise<InstructionVersion> {
    console.log(`📝 Создание новой версии инструкции ${request.topic_id}`);
    
    // Получаем следующий номер версии
    const { data: lastVersion, error: lastVersionError } = await supabaseService
      .from(this.versionsTable)
      .select('version')
      .eq('topic_id', request.topic_id)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Игнорируем ошибку "not found" для первой версии
    if (lastVersionError && lastVersionError.code !== 'PGRST116') {
      console.error('❌ Database error getting last version:', lastVersionError);
      throw new Error(`Database unavailable: ${lastVersionError.message}`);
    }

    const nextVersion = (lastVersion?.version || 0) + 1;

    const newVersion = {
      ...request,
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: nextVersion,
      status: 'draft' as InstructionStatus,
      locale: request.locale || 'ru' as InstructionLocale,
      content_html: markdownToHtml(request.content_md),
      editor_id: 'current_user', // TODO: получать из контекста
      editor_name: 'Текущий пользователь',
      views_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseService
      .from(this.versionsTable)
      .insert([newVersion])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error creating version:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Created version:', data.version, 'for topic', request.topic_id);
    return data;
  }

  /**
   * Обновить версию
   */
  async updateVersion(versionId: string, request: UpdateInstructionVersionRequest): Promise<InstructionVersion> {
    console.log(`📝 Обновление версии инструкции ${versionId}`);
    
    const updateData = {
      ...request,
      updated_at: new Date().toISOString()
    };

    // Если обновляется контент, пересоздаем HTML
    if (request.content_md) {
      updateData.content_html = markdownToHtml(request.content_md);
    }

    const { data, error } = await supabaseService
      .from(this.versionsTable)
      .update(updateData)
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error updating version:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    console.log('✅ Updated version:', versionId);
    return data;
  }

  /**
   * Опубликовать версию
   */
  async publishVersion(versionId: string): Promise<InstructionVersion> {
    console.log(`📝 Публикация версии инструкции ${versionId}`);
    
    // Обновляем статус на "published"
    const { data, error } = await supabaseService
      .from(this.versionsTable)
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', versionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error publishing version:', error);
      throw new Error(`Database unavailable: ${error.message}`);
    }

    // Обновляем current_version_id в теме
    const { error: updateError } = await supabaseService
      .from(this.topicsTable)
      .update({ current_version_id: versionId })
      .eq('id', data.topic_id);

    if (updateError) {
      console.error('❌ Database error updating topic current version:', updateError);
      throw new Error(`Database unavailable: ${updateError.message}`);
    }

    console.log('✅ Published version:', versionId);
    return data;
  }

  /**
   * Записать просмотр инструкции
   */
  async logView(topicId: string, versionId: string, userId: string = 'anonymous'): Promise<void> {
    try {
      const view = {
        id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        topic_id: topicId,
        version_id: versionId,
        user_id: userId,
        user_name: userId === 'anonymous' ? 'Гость' : 'Пользователь',
        opened_at: new Date().toISOString(),
        session_id: `session_${Date.now()}`,
        ip_address: '127.0.0.1' // TODO: получать реальный IP
      };

      const { error } = await supabaseService
        .from(this.viewsTable)
        .insert([view]);

      if (error) {
        console.error('⚠️ Failed to log view:', error);
        // Не прерываем основную операцию при ошибке логирования
      }

      // Обновляем счетчики
      await this.updateViewCounters(topicId, versionId);
    } catch (error) {
      console.error('⚠️ Error logging view:', error);
      // Не прерываем основную операцию при ошибке логирования
    }
  }

  /**
   * Обновить счетчики просмотров
   */
  private async updateViewCounters(topicId: string, versionId: string): Promise<void> {
    try {
      // Обновляем счетчик версии
      await supabaseService.rpc('increment_view_count', {
        table_name: this.versionsTable,
        record_id: versionId,
        column_name: 'views_count'
      });

      // Обновляем счетчик темы
      await supabaseService.rpc('increment_view_count', {
        table_name: this.topicsTable,
        record_id: topicId,
        column_name: 'views_total'
      });
    } catch (error) {
      console.error('⚠️ Error updating view counters:', error);
    }
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<InstructionStats> {
    try {
      const [topicsData, versionsData, viewsData] = await Promise.all([
        supabaseService
          .from(this.topicsTable)
          .select('*', { count: 'exact' }),
        supabaseService
          .from(this.versionsTable)
          .select('*', { count: 'exact' }),
        supabaseService
          .from(this.viewsTable)
          .select('*', { count: 'exact' })
      ]);
      
      // Если таблицы не существуют, выбрасываем ошибку
      if (topicsData.error) {
        console.error('❌ Database error loading stats:', topicsData.error);
        throw new Error(`Database unavailable: ${topicsData.error.message}`);
      }

      const activeTopicsData = await supabaseService
        .from(this.topicsTable)
        .select('*', { count: 'exact' })
        .eq('is_active', true);

      const publishedVersionsData = await supabaseService
        .from(this.versionsTable)
        .select('*', { count: 'exact' })
        .eq('status', 'published');

      const mostViewedData = await supabaseService
        .from(this.topicsTable)
        .select('*, current_version:instruction_versions(*)')
        .order('views_total', { ascending: false })
        .limit(5);

      return {
        total_topics: topicsData.count || 0,
        total_versions: versionsData.count || 0,
        total_views: viewsData.count || 0,
        active_topics: activeTopicsData.count || 0,
        published_versions: publishedVersionsData.count || 0,
        most_viewed_topics: (mostViewedData.data || []).map(topic => ({
          topic,
          views: topic.views_total
        }))
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Поиск инструкций
   */
  async search(filters: InstructionFilters, page: number = 1, perPage: number = 20): Promise<InstructionSearchResult> {
    try {
      let query = supabaseService
        .from(this.topicsTable)
        .select('*, current_version:instruction_versions(*)', { count: 'exact' });

      // Применяем фильтры поиска
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      // Пагинация
      const offset = (page - 1) * perPage;
      query = query.range(offset, offset + perPage - 1);

      // Сортировка
      query = query.order('views_total', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Failed to search instructions:', error);
        throw new Error(`Search failed: ${error.message}`);
      }

      return {
        topics: data || [],
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage)
      };
    } catch (error) {
      console.error('❌ Error in search:', error);
      throw error;
    }
  }

}

// Экспортируем singleton экземпляр сервиса
export const instructionsSupabaseService = new InstructionsSupabaseService();

// Экспорт для обратной совместимости
export const instructionsService = {
  getTopics: (filters?: InstructionFilters) => instructionsSupabaseService.getTopics(filters),
  getTopicByKey: (key: string) => instructionsSupabaseService.getTopicByKey(key),
  getInstructionForUser: (routeOrKey: string) => instructionsSupabaseService.getInstructionForUser(routeOrKey),
  createTopic: (request: CreateInstructionTopicRequest) => instructionsSupabaseService.createTopic(request),
  getVersions: (topicId: string) => instructionsSupabaseService.getVersions(topicId),
  createVersion: (request: CreateInstructionVersionRequest) => instructionsSupabaseService.createVersion(request),
  updateVersion: (versionId: string, request: UpdateInstructionVersionRequest) => 
    instructionsSupabaseService.updateVersion(versionId, request),
  publishVersion: (versionId: string) => instructionsSupabaseService.publishVersion(versionId),
  logView: (topicId: string, versionId: string, userId?: string) => 
    instructionsSupabaseService.logView(topicId, versionId, userId),
  getStats: () => instructionsSupabaseService.getStats(),
  search: (filters: InstructionFilters, page?: number, perPage?: number) => 
    instructionsSupabaseService.search(filters, page, perPage)
};