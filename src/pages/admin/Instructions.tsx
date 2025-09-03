/**
 * Страница администрирования инструкций
 */

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Book, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  History, 
  CheckCircle,
  Clock,
  Archive,
  BarChart3,
  Download,
  Save,
  X
} from 'lucide-react';

import { instructionsService } from '@/services/instructionsService';
import type { 
  InstructionTopic, 
  InstructionVersion, 
  InstructionStats,
  CreateInstructionTopicRequest,
  CreateInstructionVersionRequest,
  InstructionStatus
} from '@/types/instructions';

export default function Instructions() {
  const [activeTab, setActiveTab] = useState('topics');
  const [topics, setTopics] = useState<InstructionTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<InstructionTopic | null>(null);
  const [versions, setVersions] = useState<InstructionVersion[]>([]);
  const [stats, setStats] = useState<InstructionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InstructionStatus | 'all'>('all');
  
  // Состояния модальных окон
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [isEditVersionOpen, setIsEditVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<InstructionVersion | null>(null);
  
  // Формы
  const [topicForm, setTopicForm] = useState<CreateInstructionTopicRequest>({
    key: '',
    route: '',
    title: '',
    description: ''
  });
  
  const [versionForm, setVersionForm] = useState<CreateInstructionVersionRequest>({
    topic_id: '',
    title: '',
    content_md: '',
    changelog: ''
  });

  // Загрузка данных
  useEffect(() => {
    loadTopics();
    loadStats();
  }, []);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const data = await instructionsService.getTopics();
      setTopics(data);
    } catch (error) {
      console.error('Ошибка загрузки тем:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (topicId: string) => {
    setLoading(true);
    try {
      const data = await instructionsService.getVersions(topicId);
      setVersions(data);
    } catch (error) {
      console.error('Ошибка загрузки версий:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await instructionsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  // Обработчики форм
  const handleCreateTopic = async () => {
    try {
      await instructionsService.createTopic(topicForm);
      setIsCreateTopicOpen(false);
      setTopicForm({ key: '', route: '', title: '', description: '' });
      loadTopics();
    } catch (error) {
      console.error('Ошибка создания темы:', error);
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedTopic) return;
    
    try {
      await instructionsService.createVersion({
        ...versionForm,
        topic_id: selectedTopic.id
      });
      setIsCreateVersionOpen(false);
      setVersionForm({ topic_id: '', title: '', content_md: '', changelog: '' });
      loadVersions(selectedTopic.id);
    } catch (error) {
      console.error('Ошибка создания версии:', error);
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    try {
      await instructionsService.publishVersion(versionId);
      if (selectedTopic) {
        loadVersions(selectedTopic.id);
      }
      loadTopics();
    } catch (error) {
      console.error('Ошибка публикации версии:', error);
    }
  };

  const handleTopicSelect = (topic: InstructionTopic) => {
    setSelectedTopic(topic);
    loadVersions(topic.id);
  };

  const getStatusBadge = (status: InstructionStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Опубликовано</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Черновик</Badge>;
      case 'archived':
        return <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" />Архив</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = !searchQuery || 
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.route.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const filteredVersions = versions.filter(version => {
    const matchesStatus = statusFilter === 'all' || version.status === statusFilter;
    return matchesStatus;
  });

  return (
    <MainLayout>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Управление инструкциями</h1>
              <p className="text-slate-400 mt-2">
                Создание и редактирование справочной информации для страниц системы
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateTopicOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Создать тему
              </Button>
            </div>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-white">{stats.total_topics}</div>
                <div className="text-sm text-slate-400">Всего тем</div>
              </CardContent>
            </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{stats.active_topics}</div>
              <div className="text-sm text-slate-400">Активных тем</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-400">{stats.published_versions}</div>
              <div className="text-sm text-slate-400">Опубликованных</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-400">{stats.total_views}</div>
              <div className="text-sm text-slate-400">Просмотров</div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-400">{stats.total_versions}</div>
              <div className="text-sm text-slate-400">Версий</div>
            </CardContent>
          </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="topics">Темы инструкций</TabsTrigger>
            <TabsTrigger value="versions">Версии и редактор</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>

        {/* Вкладка: Темы */}
        <TabsContent value="topics" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Темы инструкций</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Поиск по названию или маршруту..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-700 border-slate-600 text-white w-80"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Тема</TableHead>
                      <TableHead className="text-slate-300">Маршрут</TableHead>
                      <TableHead className="text-slate-300">Текущая версия</TableHead>
                      <TableHead className="text-slate-300">Просмотры</TableHead>
                      <TableHead className="text-slate-300">Статус</TableHead>
                      <TableHead className="text-slate-300">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTopics.map((topic) => (
                      <TableRow 
                        key={topic.id} 
                        className="border-slate-700 hover:bg-slate-750 cursor-pointer"
                        onClick={() => handleTopicSelect(topic)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{topic.title}</div>
                            <div className="text-sm text-slate-400">{topic.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-blue-400 bg-slate-900 px-2 py-1 rounded text-sm">
                            {topic.route}
                          </code>
                        </TableCell>
                        <TableCell>
                          {topic.current_version ? (
                            <div className="text-sm">
                              <div className="text-white">v{topic.current_version.version}</div>
                              <div className="text-slate-400">{topic.current_version.title}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500">Нет версий</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-white">{topic.views_total}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={topic.is_active ? "default" : "secondary"}>
                            {topic.is_active ? 'Активна' : 'Неактивна'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTopicSelect(topic);
                                setActiveTab('versions');
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Версии и редактор */}
        <TabsContent value="versions" className="space-y-4">
          {selectedTopic ? (
            <>
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{selectedTopic.title}</CardTitle>
                      <p className="text-slate-400">{selectedTopic.route}</p>
                    </div>
                    <div className="flex gap-2">
                      <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                        <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все статусы</SelectItem>
                          <SelectItem value="published">Опубликованные</SelectItem>
                          <SelectItem value="draft">Черновики</SelectItem>
                          <SelectItem value="archived">Архивные</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button onClick={() => setIsCreateVersionOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Новая версия
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {filteredVersions.map((version) => (
                      <Card key={version.id} className="bg-slate-900 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-lg font-semibold text-white">
                                  Версия {version.version}
                                </span>
                                {getStatusBadge(version.status)}
                                <span className="text-slate-400 text-sm">
                                  {version.views_count} просмотров
                                </span>
                              </div>
                              
                              <h3 className="font-medium text-white mb-2">{version.title}</h3>
                              
                              <div className="text-sm text-slate-400 space-y-1">
                                <div>Автор: {version.editor_name}</div>
                                <div>Создано: {new Date(version.created_at).toLocaleDateString('ru-RU')}</div>
                                {version.published_at && (
                                  <div>Опубликовано: {new Date(version.published_at).toLocaleDateString('ru-RU')}</div>
                                )}
                                {version.changelog && (
                                  <div>Изменения: {version.changelog}</div>
                                )}
                              </div>
                              
                              <div className="mt-3 p-3 bg-slate-800 rounded border text-sm text-slate-300">
                                <div className="max-h-20 overflow-hidden">
                                  {version.content_md.slice(0, 200)}
                                  {version.content_md.length > 200 && '...'}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              {version.status === 'draft' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handlePublishVersion(version.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-12 text-center">
                <Book className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Выберите тему</h3>
                <p className="text-slate-400">
                  Выберите тему из списка слева для просмотра и редактирования версий
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Вкладка: Аналитика */}
        <TabsContent value="analytics" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Статистика просмотров
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {stats && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Самые популярные темы</h3>
                    <div className="space-y-2">
                      {stats.most_viewed_topics.map((item, index) => (
                        <div key={item.topic.id} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium text-white">{item.topic.title}</div>
                              <div className="text-sm text-slate-400">{item.topic.route}</div>
                            </div>
                          </div>
                          <div className="text-lg font-semibold text-blue-400">
                            {item.views} просмотров
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Последние просмотры</h3>
                    <div className="space-y-2">
                      {stats.recent_views.map((view) => {
                        const topic = topics.find(t => t.id === view.topic_id);
                        return (
                          <div key={view.id} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                            <div>
                              <div className="font-medium text-white">{topic?.title || 'Неизвестная тема'}</div>
                              <div className="text-sm text-slate-400">Пользователь: {view.user_name}</div>
                            </div>
                            <div className="text-sm text-slate-400">
                              {new Date(view.opened_at).toLocaleString('ru-RU')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>

        {/* Диалог создания темы */}
        <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Создать тему инструкции</DialogTitle>
            <DialogDescription className="text-slate-400">
              Создайте новую тему для страницы системы
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Ключ привязки</label>
              <Input
                value={topicForm.key}
                onChange={(e) => setTopicForm({...topicForm, key: e.target.value})}
                placeholder="dashboard, equipment, fuel-stocks"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300">Маршрут страницы</label>
              <Input
                value={topicForm.route}
                onChange={(e) => setTopicForm({...topicForm, route: e.target.value})}
                placeholder="/dashboard, /equipment"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300">Название темы</label>
              <Input
                value={topicForm.title}
                onChange={(e) => setTopicForm({...topicForm, title: e.target.value})}
                placeholder="Главная панель"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300">Описание</label>
              <Textarea
                value={topicForm.description}
                onChange={(e) => setTopicForm({...topicForm, description: e.target.value})}
                placeholder="Краткое описание назначения страницы"
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateTopicOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateTopic}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог создания версии */}
      <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Создать новую версию</DialogTitle>
            <DialogDescription className="text-slate-400">
              Создайте новую версию инструкции для темы: {selectedTopic?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Заголовок версии</label>
              <Input
                value={versionForm.title}
                onChange={(e) => setVersionForm({...versionForm, title: e.target.value})}
                placeholder="Краткий заголовок версии"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300">Содержание (Markdown)</label>
              <Textarea
                value={versionForm.content_md}
                onChange={(e) => setVersionForm({...versionForm, content_md: e.target.value})}
                placeholder="## Назначение страницы&#10;&#10;Описание страницы и её функций..."
                className="bg-slate-700 border-slate-600 text-white font-mono"
                rows={12}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-300">Описание изменений</label>
              <Input
                value={versionForm.changelog}
                onChange={(e) => setVersionForm({...versionForm, changelog: e.target.value})}
                placeholder="Первая версия инструкции"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateVersionOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateVersion}>
              <Save className="w-4 h-4 mr-2" />
              Сохранить черновик
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}