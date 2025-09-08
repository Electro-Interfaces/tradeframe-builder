import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Copy,
  Archive,
  Settings,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Trash2,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  CommandTemplate, 
  CommandCategory, 
  CommandTemplateStatus,
  CreateCommandTemplateRequest,
  UpdateCommandTemplateRequest 
} from "@/types/commandTemplate";
import { COMMAND_CATEGORIES } from "@/utils/commandCategories";
import { currentCommandTemplatesAPI } from "@/services/apiSwitch";
import { CommandTemplateForm } from "@/components/commands/CommandTemplateForm";

export default function CommandTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<CommandTemplateStatus | "all">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<CommandTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем шаблоны при монтировании компонента
  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await currentCommandTemplatesAPI.list();
      // Supabase API возвращает data напрямую, а не в обертке
      setTemplates(response.data || response);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить шаблоны команд",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Получаем все шаблоны и фильтруем
  const filteredTemplates = useMemo(() => {
    let filteredList = [...templates];

    // Фильтр по поиску
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredList = filteredList.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.display_name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по категории
    if (selectedCategory !== "all") {
      filteredList = filteredList.filter(t => t.category === selectedCategory);
    }

    // Фильтр по статусу
    if (selectedStatus !== "all") {
      filteredList = filteredList.filter(t => t.status === selectedStatus);
    }

    return filteredList.sort((a, b) => {
      // Системные шаблоны в начале
      if (a.is_system !== b.is_system) {
        return a.is_system ? -1 : 1;
      }
      // Затем по названию
      return a.display_name.localeCompare(b.display_name);
    });
  }, [templates, searchTerm, selectedCategory, selectedStatus]);

  // Статистика по категориям
  const categoryStats = useMemo(() => {
    const stats = {};
    templates.forEach(template => {
      if (!stats[template.category]) {
        stats[template.category] = 0;
      }
      stats[template.category]++;
    });
    
    return Object.entries(COMMAND_CATEGORIES).map(([key, categoryInfo]) => ({
      category: key,
      count: stats[key] || 0,
      info: categoryInfo
    }));
  }, [templates]);

  const getStatusColor = (status: CommandTemplateStatus) => {
    switch (status) {
      case 'active': return 'text-green-400 border-green-500 bg-green-500/10';
      case 'inactive': return 'text-slate-400 border-slate-500 bg-slate-500/10';
      case 'deprecated': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      default: return 'text-gray-400 border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: CommandTemplateStatus) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'inactive': return 'Неактивен';
      case 'deprecated': return 'Устарел';
      default: return status;
    }
  };

  const handleViewTemplate = (template: CommandTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleEditTemplate = (template: CommandTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleCreateTemplate = async (data: CreateCommandTemplateRequest) => {
    setLoading(true);
    try {
      await currentCommandTemplatesAPI.create(data);
      toast({
        title: "Шаблон создан",
        description: `Шаблон "${data.display_name}" успешно создан.`,
      });
      setIsCreateDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast({
        title: "Ошибка создания",
        description: "Не удалось создать шаблон команды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async (data: UpdateCommandTemplateRequest) => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    try {
      await currentCommandTemplatesAPI.update(selectedTemplate.id, data);
      toast({
        title: "Шаблон обновлен",
        description: `Шаблон "${data.display_name || selectedTemplate.display_name}" успешно обновлен.`,
      });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
      toast({
        title: "Ошибка обновления",
        description: error instanceof Error ? error.message : "Не удалось обновить шаблон команды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTemplate = async (template: CommandTemplate) => {
    setLoading(true);
    try {
      // Используем метод clone из Supabase API
      await currentCommandTemplatesAPI.clone(template.id, `${template.name}_copy`);
      toast({
        title: "Шаблон скопирован",
        description: `Создана копия шаблона "${template.display_name}".`,
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      toast({
        title: "Ошибка копирования",
        description: "Не удалось скопировать шаблон команды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (template: CommandTemplate) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      // Обновляем статус через обычный update метод
      await currentCommandTemplatesAPI.update(template.id, { status: newStatus });
      toast({
        title: `Шаблон ${newStatus === 'active' ? 'активирован' : 'деактивирован'}`,
        description: `Шаблон "${template.display_name}" ${newStatus === 'active' ? 'активирован' : 'деактивирован'}.`,
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast({
        title: "Ошибка изменения статуса",
        description: "Не удалось изменить статус шаблона",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (template: CommandTemplate) => {
    if (template.is_system) {
      toast({
        title: "Нельзя удалить",
        description: "Системные шаблоны нельзя удалять",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await currentCommandTemplatesAPI.delete(template.id);
      toast({
        title: "Шаблон удален",
        description: `Шаблон "${template.display_name}" был удален.`,
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast({
        title: "Ошибка удаления",
        description: error instanceof Error ? error.message : "Не удалось удалить шаблон команды",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-2xl font-semibold text-white">Шаблоны команд</h1>
          <p className="text-slate-400 mt-2">
            Управление шаблонами команд для автоматизации операций в системе
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700 mx-4 md:mx-6 lg:mx-8">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Шаблоны команд</h2>
                <div className="text-sm text-slate-400">
                  Всего: {filteredTemplates.length} из {templates.length}
                </div>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать шаблон
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Создать новый шаблон команды</DialogTitle>
                  </DialogHeader>
                  <CommandTemplateForm
                    mode="create"
                    onSubmit={handleCreateTemplate}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Фильтры */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Поиск шаблонов по названию или описанию..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-48">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {Object.entries(COMMAND_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-32">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                  <SelectItem value="deprecated">Устаревшие</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mx-4 md:mx-6 lg:mx-8">
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Шаблоны</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
          </TabsList>

          {/* Список шаблонов */}
          <TabsContent value="templates" className="mt-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm || selectedCategory !== "all" ? 'Шаблоны не найдены' : 'Нет шаблонов команд'}
                </h3>
                <p className="text-slate-400">
                  {searchTerm || selectedCategory !== "all" 
                    ? 'Попробуйте изменить критерии поиска' 
                    : 'Создайте первый шаблон команды для автоматизации операций'
                  }
                </p>
              </div>
            ) : (
              <div className="w-full">
                <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                  <table className="w-full text-sm min-w-full table-fixed">
                    <thead className="bg-slate-700/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '30%'}}>НАЗВАНИЕ ШАБЛОНА</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>КАТЕГОРИЯ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>ВЕРСИЯ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>ВОЗМОЖНОСТИ</th>
                        <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {filteredTemplates.map((template) => (
                        <tr
                          key={template.id}
                          className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-600">
                                <span className="text-sm text-slate-300">
                                  {COMMAND_CATEGORIES[template.category]?.icon || '⚙️'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-base truncate">
                                  {template.display_name}
                                </div>
                                <div className="text-sm text-slate-300 truncate">
                                  {template.description}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {template.is_system && (
                                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-500">
                                      Системный
                                    </Badge>
                                  )}
                                  {template.is_dangerous && (
                                    <div className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 text-orange-400" />
                                      <span className="text-xs text-orange-300">Опасная</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm">
                                {COMMAND_CATEGORIES[template.category]?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(template.status)}`}
                            >
                              {getStatusText(template.status)}
                            </Badge>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-white text-sm">{template.version}</span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {template.supports_scheduling && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span>Планирование</span>
                                </div>
                              )}
                              {template.supports_batch_execution && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Users className="w-3 h-3" />
                                  <span>Пакетное выполнение</span>
                                </div>
                              )}
                              {template.requires_confirmation && (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Требует подтверждения</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleViewTemplate(template)}
                                title="Просмотр"
                                disabled={loading}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {!template.is_system && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                  onClick={() => handleEditTemplate(template)}
                                  title="Редактировать"
                                  disabled={loading}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleDuplicateTemplate(template)}
                                title="Дублировать"
                                disabled={loading}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${template.status === 'active' ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-400 hover:text-green-400'}`}
                                onClick={() => handleToggleStatus(template)}
                                title={template.status === 'active' ? "Деактивировать" : "Активировать"}
                                disabled={loading}
                              >
                                {template.status === 'active' ? (
                                  <Archive className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              {!template.is_system && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                  onClick={() => handleDeleteTemplate(template)}
                                  title="Удалить"
                                  disabled={loading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Категории */}
          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryStats.map(({ category, count, info }) => (
                <Card 
                  key={category} 
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCategory(category);
                    // Переключиться на вкладку шаблонов
                    const tabsTrigger = document.querySelector('[value="templates"]') as HTMLElement;
                    tabsTrigger?.click();
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
                        <span className="text-2xl text-slate-300">{info.icon}</span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-base">{info.name}</CardTitle>
                        <div className="text-sm text-slate-400">
                          {count} {count === 1 ? 'шаблон' : count < 5 ? 'шаблона' : 'шаблонов'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-slate-400 text-sm">{info.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        </div>

        {/* Диалог просмотра шаблона */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Просмотр шаблона: {selectedTemplate?.display_name}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <CommandTemplateForm
                mode="view"
                initialData={selectedTemplate}
                onSubmit={() => {}}
                onCancel={() => setIsViewDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Диалог редактирования шаблона */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать шаблон: {selectedTemplate?.display_name}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <CommandTemplateForm
                mode="edit"
                initialData={selectedTemplate}
                onSubmit={handleUpdateTemplate}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedTemplate(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}