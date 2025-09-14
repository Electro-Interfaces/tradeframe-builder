/**
 * Сервис для работы с инструкциями пользователя
 * Упрощенная версия с 5 основными разделами
 */

import { PersistentStorage } from '@/utils/persistentStorage';

export interface InstructionTopic {
  id: string;
  key: string;
  route: string;
  title: string;
  description: string;
  is_active: boolean;
  views_total: number;
  created_at: string;
  updated_at: string;
}

export interface InstructionVersion {
  id: string;
  topic_id: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  locale: string;
  title: string;
  content_md: string;
  content_html: string;
  changelog: string;
  editor_id: string;
  editor_name: string;
  published_at: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface InstructionView {
  id: string;
  version_id: string;
  user_id: string;
  user_email: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}

// Функция для преобразования Markdown в HTML
const markdownToHtml = (markdown: string): string => {
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-white mb-3 mt-6">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mb-4 mt-8">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-6 mt-10">$1</h1>')
    .replace(/^\*\*(.*)\*\*/gm, '<strong class="font-semibold text-blue-200">$1</strong>')
    .replace(/^\*(.*)\*/gm, '<em class="italic text-slate-300">$1</em>')
    .replace(/^- (.*$)/gim, '<li class="text-slate-200 mb-2">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="text-slate-200 mb-2 list-decimal">$2</li>')
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-blue-200 my-4">$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-700 text-green-300 px-2 py-1 rounded text-sm">$1</code>')
    .replace(/^(?!<[h|u|l|b|d|p])/gm, '<p class="text-slate-200 leading-relaxed mb-4">')
    .replace(/$/gm, '</p>')
    .replace(/<p[^>]*><\/p>/g, '')
    .replace(/<p[^>]*>\s*<\/p>/g, '');
};

// Упрощенные темы инструкций - только 5 основных разделов
const initialTopics: InstructionTopic[] = [
  {
    id: 'topic_1',
    key: 'network-overview',
    route: '/network/overview',
    title: 'Обзор',
    description: 'Обзор состояния сети АЗС и основных показателей',
    is_active: true,
    views_total: 245,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'topic_2',
    key: 'operations-transactions',
    route: '/network/operations-transactions',
    title: 'Операции',
    description: 'Журнал операций и транзакций по сети АЗС',
    is_active: true,
    views_total: 189,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'topic_3',
    key: 'point-prices',
    route: '/point/prices',
    title: 'Цены',
    description: 'Управление ценами торговых точек',
    is_active: true,
    views_total: 156,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'topic_4',
    key: 'point-tanks',
    route: '/point/tanks',
    title: 'Резервуары',
    description: 'Мониторинг резервуаров торговых точек',
    is_active: true,
    views_total: 198,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'topic_5',
    key: 'point-equipment',
    route: '/point/equipment',
    title: 'Оборудование',
    description: 'Управление оборудованием торговых точек',
    is_active: true,
    views_total: 123,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  }
];

// Упрощенные версии инструкций
const initialVersions: InstructionVersion[] = [
  {
    id: 'version_1',
    topic_id: 'topic_1',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Обзор сети АЗС',
    content_md: `## Назначение раздела

Раздел "Обзор" предоставляет общую информацию о состоянии сети АЗС и ключевые показатели работы.

## Основные возможности

- Просмотр общего состояния сети
- Мониторинг основных показателей
- Быстрый доступ к другим разделам системы

## Как использовать

1. Откройте раздел "Обзор" в главном меню
2. Просмотрите текущие показатели
3. При необходимости перейдите к детальной информации`,
    content_html: '',
    changelog: 'Первая версия инструкции',
    editor_id: 'admin',
    editor_name: 'Администратор',
    published_at: '2024-12-01T14:30:00Z',
    views_count: 245,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'version_2',
    topic_id: 'topic_2',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Операции и транзакции',
    content_md: `## Назначение раздела

Раздел "Операции" содержит журнал всех операций и транзакций по сети АЗС.

## Основные возможности

- Просмотр всех операций в системе
- Фильтрация по дате и типу операций
- Экспорт данных для анализа

## Как использовать

1. Перейдите в раздел "Операции"
2. Используйте фильтры для поиска нужных данных
3. Просматривайте детали операций`,
    content_html: '',
    changelog: 'Первая версия инструкции',
    editor_id: 'admin',
    editor_name: 'Администратор',
    published_at: '2024-12-01T14:30:00Z',
    views_count: 189,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'version_3',
    topic_id: 'topic_3',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Управление ценами',
    content_md: `## Назначение раздела

Раздел "Цены" позволяет управлять ценами на топливо в торговых точках.

## Основные возможности

- Просмотр текущих цен
- Изменение цен по точкам
- История изменений цен

## Как использовать

1. Откройте раздел "Цены"
2. Выберите торговую точку
3. Измените цены при необходимости
4. Сохраните изменения`,
    content_html: '',
    changelog: 'Первая версия инструкции',
    editor_id: 'admin',
    editor_name: 'Администратор',
    published_at: '2024-12-01T14:30:00Z',
    views_count: 156,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'version_4',
    topic_id: 'topic_4',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Мониторинг резервуаров',
    content_md: `## Назначение раздела

Раздел "Резервуары" предоставляет информацию о состоянии резервуаров на АЗС.

## Основные возможности

- Мониторинг уровня топлива
- Контроль температуры
- Отслеживание состояния оборудования

## Как использовать

1. Перейдите в раздел "Резервуары"
2. Выберите интересующую АЗС
3. Просматривайте данные по резервуарам
4. Отслеживайте критические показатели`,
    content_html: '',
    changelog: 'Первая версия инструкции',
    editor_id: 'admin',
    editor_name: 'Администратор',
    published_at: '2024-12-01T14:30:00Z',
    views_count: 198,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'version_5',
    topic_id: 'topic_5',
    version: 1,
    status: 'published',
    locale: 'ru',
    title: 'Управление оборудованием',
    content_md: `## Назначение раздела

Раздел "Оборудование" позволяет управлять оборудованием торговых точек.

## Основные возможности

- Мониторинг состояния оборудования
- Управление настройками
- Просмотр журнала событий

## Как использовать

1. Откройте раздел "Оборудование"
2. Выберите торговую точку
3. Просматривайте состояние оборудования
4. Выполняйте необходимые настройки`,
    content_html: '',
    changelog: 'Первая версия инструкции',
    editor_id: 'admin',
    editor_name: 'Администратор',
    published_at: '2024-12-01T14:30:00Z',
    views_count: 123,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  }
];

// Преобразуем Markdown в HTML для всех версий
initialVersions.forEach(version => {
  version.content_html = markdownToHtml(version.content_md);
});

// Упрощенные просмотры для статистики
const initialViews: InstructionView[] = [
  {
    id: 'view_1',
    version_id: 'version_1',
    user_id: 'user_1',
    user_email: 'admin@example.com',
    views_count: 245,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'view_2',
    version_id: 'version_2',
    user_id: 'user_1',
    user_email: 'admin@example.com',
    views_count: 189,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'view_3',
    version_id: 'version_3',
    user_id: 'user_1',
    user_email: 'admin@example.com',
    views_count: 156,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'view_4',
    version_id: 'version_4',
    user_id: 'user_1',
    user_email: 'admin@example.com',
    views_count: 198,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  },
  {
    id: 'view_5',
    version_id: 'version_5',
    user_id: 'user_1',
    user_email: 'admin@example.com',
    views_count: 123,
    created_at: '2024-12-01T14:30:00Z',
    updated_at: '2024-12-01T14:30:00Z'
  }
];

class InstructionsService {
  private topicsStorage = new PersistentStorage<InstructionTopic>('instruction_topics', initialTopics);
  private versionsStorage = new PersistentStorage<InstructionVersion>('instruction_versions', initialVersions);
  private viewsStorage = new PersistentStorage<InstructionView>('instruction_views', initialViews);

  // Методы для работы с темами
  async getTopics(): Promise<InstructionTopic[]> {
    return this.topicsStorage.getAll();
  }

  async getTopicByKey(key: string): Promise<InstructionTopic | null> {
    const topics = await this.getTopics();
    return topics.find(topic => topic.key === key) || null;
  }

  async getTopicByRoute(route: string): Promise<InstructionTopic | null> {
    const topics = await this.getTopics();
    return topics.find(topic => topic.route === route) || null;
  }

  async createTopic(topic: Omit<InstructionTopic, 'id' | 'created_at' | 'updated_at'>): Promise<InstructionTopic> {
    const newTopic: InstructionTopic = {
      ...topic,
      id: `topic_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.topicsStorage.create(newTopic);
  }

  async updateTopic(id: string, updates: Partial<InstructionTopic>): Promise<InstructionTopic | null> {
    return this.topicsStorage.update(id, {
      ...updates,
      updated_at: new Date().toISOString()
    });
  }

  async deleteTopic(id: string): Promise<boolean> {
    return this.topicsStorage.delete(id);
  }

  // Методы для работы с версиями
  async getVersionsByTopicId(topicId: string): Promise<InstructionVersion[]> {
    const versions = await this.versionsStorage.getAll();
    return versions.filter(version => version.topic_id === topicId);
  }

  async getLatestVersionByTopicId(topicId: string): Promise<InstructionVersion | null> {
    const versions = await this.getVersionsByTopicId(topicId);
    if (versions.length === 0) return null;

    return versions.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }

  async getPublishedVersionByTopicId(topicId: string): Promise<InstructionVersion | null> {
    const versions = await this.getVersionsByTopicId(topicId);
    const publishedVersions = versions.filter(v => v.status === 'published');

    if (publishedVersions.length === 0) return null;

    return publishedVersions.reduce((latest, current) =>
      current.version > latest.version ? current : latest
    );
  }

  async createVersion(version: Omit<InstructionVersion, 'id' | 'created_at' | 'updated_at'>): Promise<InstructionVersion> {
    const newVersion: InstructionVersion = {
      ...version,
      id: `version_${Date.now()}`,
      content_html: markdownToHtml(version.content_md),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.versionsStorage.create(newVersion);
  }

  async updateVersion(id: string, updates: Partial<InstructionVersion>): Promise<InstructionVersion | null> {
    const updateData: Partial<InstructionVersion> = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.content_md) {
      updateData.content_html = markdownToHtml(updates.content_md);
    }

    return this.versionsStorage.update(id, updateData);
  }

  async deleteVersion(id: string): Promise<boolean> {
    return this.versionsStorage.delete(id);
  }

  // Методы для работы с просмотрами
  async recordView(versionId: string, userId: string, userEmail: string): Promise<void> {
    const existingView = await this.getViewByVersionAndUser(versionId, userId);

    if (existingView) {
      await this.viewsStorage.update(existingView.id, {
        views_count: existingView.views_count + 1,
        updated_at: new Date().toISOString()
      });
    } else {
      const newView: InstructionView = {
        id: `view_${Date.now()}`,
        version_id: versionId,
        user_id: userId,
        user_email: userEmail,
        views_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.viewsStorage.create(newView);
    }

    // Обновляем счетчик просмотров в версии
    const version = await this.versionsStorage.getById(versionId);
    if (version) {
      await this.versionsStorage.update(versionId, {
        views_count: version.views_count + 1,
        updated_at: new Date().toISOString()
      });
    }

    // Обновляем общий счетчик просмотров в теме
    if (version) {
      const topic = await this.topicsStorage.getById(version.topic_id);
      if (topic) {
        await this.topicsStorage.update(version.topic_id, {
          views_total: topic.views_total + 1,
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  private async getViewByVersionAndUser(versionId: string, userId: string): Promise<InstructionView | null> {
    const views = await this.viewsStorage.getAll();
    return views.find(view => view.version_id === versionId && view.user_id === userId) || null;
  }

  // Вспомогательные методы
  async searchTopics(query: string): Promise<InstructionTopic[]> {
    const topics = await this.getTopics();
    const lowercaseQuery = query.toLowerCase();

    return topics.filter(topic =>
      topic.title.toLowerCase().includes(lowercaseQuery) ||
      topic.description.toLowerCase().includes(lowercaseQuery) ||
      topic.key.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getPopularTopics(limit: number = 10): Promise<InstructionTopic[]> {
    const topics = await this.getTopics();
    return topics
      .sort((a, b) => b.views_total - a.views_total)
      .slice(0, limit);
  }

  async getRecentlyUpdatedTopics(limit: number = 10): Promise<InstructionTopic[]> {
    const topics = await this.getTopics();
    return topics
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
  }
}

export const instructionsService = new InstructionsService();