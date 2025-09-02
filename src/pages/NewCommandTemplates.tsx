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
  Eye,
  Edit,
  Copy,
  Archive,
  CheckCircle,
  Trash2,
  Settings,
  AlertTriangle,
  Globe,
  MapPin,
  Wrench,
  Component
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  NewCommandTemplate, 
  TemplateScope, 
  TemplateMode, 
  TemplateStatus 
} from "@/types/connections";
import { newCommandTemplatesStore, TEMPLATE_SCOPE_OPTIONS, TEMPLATE_STATUS_OPTIONS } from "@/mock/newCommandTemplatesStore";
import { currentNewTemplatesAPI } from "@/services/newConnectionsService";
import { NewTemplateForm } from "@/components/templates/NewTemplateForm";

export default function NewCommandTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedScope, setSelectedScope] = useState<TemplateScope | "all">("all");
  const [selectedMode, setSelectedMode] = useState<TemplateMode | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<TemplateStatus | "all">("all");
  const [selectedTemplate, setSelectedTemplate] = useState<NewCommandTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<NewCommandTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем шаблоны при монтировании компонента
  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = newCommandTemplatesStore.getAll();
      setTemplates(response);
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
        t.template_id.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Фильтр по области применения
    if (selectedScope !== "all") {
      filteredList = filteredList.filter(t => t.scope === selectedScope);
    }

    // Фильтр по режиму
    if (selectedMode !== "all") {
      filteredList = filteredList.filter(t => t.mode === selectedMode);
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
      return a.name.localeCompare(b.name);
    });
  }, [templates, searchTerm, selectedScope, selectedMode, selectedStatus]);

  // Статистика по областям применения
  const scopeStats = useMemo(() => {
    const stats: { scope: TemplateScope; count: number; info: any }[] = [];
    
    TEMPLATE_SCOPE_OPTIONS.forEach(option => {
      const count = filteredTemplates.filter(t => t.scope === option.value).length;
      stats.push({
        scope: option.value as TemplateScope,
        count,
        info: option
      });
    });
    
    return stats.sort((a, b) => b.count - a.count);
  }, [filteredTemplates]);

  const getStatusColor = (status: TemplateStatus) => {
    switch (status) {
      case 'active': return 'text-green-400 border-green-500 bg-green-500/10';
      case 'inactive': return 'text-slate-400 border-slate-500 bg-slate-500/10';
      case 'deprecated': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      case 'draft': return 'text-blue-400 border-blue-500 bg-blue-500/10';
      default: return 'text-gray-400 border-gray-500 bg-gray-500/10';
    }
  };

  const getStatusText = (status: TemplateStatus) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'inactive': return 'Неактивный';
      case 'deprecated': return 'Устарел';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  const getScopeIcon = (scope: TemplateScope) => {
    switch (scope) {
      case 'network': return <Globe className="w-4 h-4" />;
      case 'trading_point': return <MapPin className="w-4 h-4" />;
      case 'equipment': return <Wrench className="w-4 h-4" />;
      case 'component': return <Component className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getScopeName = (scope: TemplateScope) => {
    const scopeOption = TEMPLATE_SCOPE_OPTIONS.find(s => s.value === scope);
    return scopeOption ? scopeOption.label : scope;
  };

  const handleViewTemplate = (template: NewCommandTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleEditTemplate = (template: NewCommandTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleCreateTemplate = async (data: any) => {
    setLoading(true);
    try {
      await currentNewTemplatesAPI.create(data);
      toast({
        title: "Шаблон создан",
        description: `Шаблон "${data.name}" успешно создан.`,
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

  const handleUpdateTemplate = async (data: any) => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    try {
      await currentNewTemplatesAPI.update(selectedTemplate.id, data);
      toast({
        title: "Шаблон обновлен",
        description: `Шаблон "${selectedTemplate.name}" успешно обновлен.`,
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

  const handleDuplicateTemplate = async (template: NewCommandTemplate) => {
    setLoading(true);
    try {
      await currentNewTemplatesAPI.clone(template.id, {
        new_template_id: `${template.template_id}_copy`,
        new_version: '1.0.0',
        version_notes: `Копия шаблона ${template.template_id}`
      });
      toast({
        title: "Шаблон скопирован",
        description: `Создана копия шаблона "${template.name}".`,
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

  const handleToggleStatus = async (template: NewCommandTemplate) => {
    const newStatus = template.status === 'active' ? 'inactive' : 'active';
    setLoading(true);
    try {
      await currentNewTemplatesAPI.update(template.id, { status: newStatus });
      toast({
        title: `Шаблон ${newStatus === 'active' ? 'активирован' : 'деактивирован'}`,
        description: `Шаблон "${template.name}" ${newStatus === 'active' ? 'активирован' : 'деактивирован'}.`,
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

  const handleDeleteTemplate = async (template: NewCommandTemplate) => {
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
      await currentNewTemplatesAPI.delete(template.id);
      toast({
        title: "Шаблон удален",
        description: `Шаблон "${template.name}" был удален.`,
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
    <MainLayout>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Шаблоны API команд</h1>
          <p className="text-slate-400 mt-2">
            Управление шаблонами API команд для интеграции с внешними провайдерами
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Шаблоны API команд</h2>
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
                    <DialogTitle>Создать новый шаблон API команды</DialogTitle>
                  </DialogHeader>
                  <NewTemplateForm
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
                  placeholder="Поиск шаблонов по названию, ID или описанию..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                />
              </div>
              <Select value={selectedScope} onValueChange={(value: any) => setSelectedScope(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-48">
                  <SelectValue placeholder="Все области" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все области</SelectItem>
                  {TEMPLATE_SCOPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMode} onValueChange={(value: any) => setSelectedMode(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-32">
                  <SelectValue placeholder="Режим" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все режимы</SelectItem>
                  <SelectItem value="pull">Pull</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
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
                  <SelectItem value="draft">Черновики</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Шаблоны</TabsTrigger>
            <TabsTrigger value="scopes">Области применения</TabsTrigger>
          </TabsList>

          {/* Список шаблонов */}
          <TabsContent value="templates" className="mt-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm || selectedScope !== "all" || selectedMode !== "all" || selectedStatus !== "all" 
                    ? 'Шаблоны не найдены' 
                    : 'Нет шаблонов API команд'
                  }
                </h3>
                <p className="text-slate-400">
                  {searchTerm || selectedScope !== "all" || selectedMode !== "all" || selectedStatus !== "all" 
                    ? 'Попробуйте изменить критерии поиска' 
                    : 'Создайте первый шаблон API команды для интеграции с внешними провайдерами'
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
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ОБЛАСТЬ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>ВЕРСИЯ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>МЕТОД/РЕЖИМ</th>
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
                                {getScopeIcon(template.scope)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-base truncate">
                                  {template.name}
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
                                  <div className="text-xs text-slate-500">
                                    ID: {template.template_id}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white text-sm">
                                {getScopeName(template.scope)}
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
                              <Badge variant="outline" className="text-xs w-fit">
                                {template.method}
                              </Badge>
                              <div className="text-xs text-slate-400">
                                {template.mode === 'pull' ? 'Получение' : 'Отправка'}
                              </div>
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
                                className={`h-8 w-8 p-0 ${
                                  template.status === 'active' 
                                    ? 'text-slate-400 hover:text-yellow-400' 
                                    : 'text-slate-400 hover:text-green-400'
                                }`}
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

          {/* Области применения */}
          <TabsContent value="scopes" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scopeStats.map(({ scope, count, info }) => (
                <Card 
                  key={scope} 
                  className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedScope(scope);
                    // Переключиться на вкладку шаблонов
                    const tabsTrigger = document.querySelector('[value="templates"]') as HTMLElement;
                    tabsTrigger?.click();
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
                        {getScopeIcon(scope)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-base">{info.label}</CardTitle>
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

        {/* Диалог просмотра шаблона */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Просмотр шаблона: {selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <NewTemplateForm
                mode="view"
                template={selectedTemplate}
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
              <DialogTitle>Редактировать шаблон: {selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            {selectedTemplate && (
              <NewTemplateForm
                mode="edit"
                template={selectedTemplate}
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