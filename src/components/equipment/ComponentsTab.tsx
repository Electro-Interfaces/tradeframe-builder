import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  MoreHorizontal, 
  Power, 
  PowerOff, 
  Archive,
  Layers3,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

import { 
  Component, 
  ComponentStatus, 
  ComponentStatusAction,
  ListComponentsParams,
  ComponentTemplate,
  CreateComponentRequest,
  UpdateComponentRequest
} from "@/types/component";
import { currentComponentsAPI } from "@/services/components";
import { componentsSupabaseAPI } from "@/services/componentsSupabase";
import { ComponentWizard } from "./ComponentWizard";
import { ComponentDetailCard } from "./ComponentDetailCard";

interface ComponentsTabProps {
  equipmentId: string;
  equipmentTemplateId?: string;
  tradingPointId?: string;
  className?: string;
}

const getStatusIcon = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'offline': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'disabled': return <PowerOff className="w-4 h-4 text-gray-600" />;
    case 'archived': return <Archive className="w-4 h-4 text-slate-600" />;
    default: return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusText = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'error': return 'Ошибка';
    case 'disabled': return 'Отключено';
    case 'archived': return 'Архив';
    default: return 'Неизвестно';
  }
};

const getStatusColor = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'disabled': return 'bg-gray-500';
    case 'archived': return 'bg-slate-500';
    default: return 'bg-gray-500';
  }
};

export function ComponentsTab({ 
  equipmentId, 
  equipmentTemplateId,
  tradingPointId,
  className 
}: ComponentsTabProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Состояние компонентов и фильтров
  const [components, setComponents] = useState<Component[]>([]);
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComponentStatus | "all">("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  // Модальные окна
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

  // Загрузка шаблонов при монтировании
  useEffect(() => {
    loadCompatibleTemplates();
  }, [equipmentTemplateId]);

  // Загрузка компонентов при смене фильтров
  useEffect(() => {
    loadComponents();
  }, [equipmentId, searchQuery, statusFilter, templateFilter]);

  const loadCompatibleTemplates = async () => {
    try {
      // Загружаем все шаблоны из Supabase
      const allTemplates = await componentsSupabaseAPI.getTemplates();
      
      // Фильтруем совместимые шаблоны по типу оборудования (если указан)
      if (equipmentTemplateId) {
        // Здесь можно добавить логику фильтрации по совместимости
        // Пока что возвращаем все шаблоны
        setTemplates(allTemplates);
      } else {
        setTemplates(allTemplates);
      }
    } catch (error) {
      console.error('Failed to load component templates:', error);
      setTemplates([]);
    }
  };

  const loadComponents = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ListComponentsParams = {
        equipment_id: equipmentId,
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        template_id: templateFilter !== "all" ? templateFilter : undefined,
        limit: 50 // Загружаем больше для локального отображения
      };

      const response = await currentComponentsAPI.list(params);
      setComponents(response.data);
    } catch (error) {
      console.error('Failed to load components:', error);
      setError('Не удалось загрузить компоненты');
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить компоненты",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, action: ComponentStatusAction) => {
    try {
      await currentComponentsAPI.updateStatus(id, action);
      const actionText = {
        enable: 'включен',
        disable: 'отключен',
        archive: 'архивирован'
      }[action];

      toast({
        title: "Успех",
        description: `Компонент ${actionText}`
      });
      loadComponents();
    } catch (error) {
      console.error('Failed to change component status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус компонента",
        variant: "destructive"
      });
    }
  };

  const handleCreateComponent = async (data: CreateComponentRequest) => {
    try {
      await currentComponentsAPI.create(data);
      toast({
        title: "Успех",
        description: "Компонент успешно создан"
      });
      loadComponents();
      setIsWizardOpen(false);
    } catch (error) {
      console.error('Failed to create component:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать компонент",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleUpdateComponent = async (id: string, data: UpdateComponentRequest) => {
    try {
      await currentComponentsAPI.update(id, data);
      toast({
        title: "Успех",
        description: "Компонент успешно обновлен"
      });
      loadComponents();
      setSelectedComponent(null);
    } catch (error) {
      console.error('Failed to update component:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить компонент",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Мобильная версия - карточки
  if (isMobile) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Фильтры и поиск */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск компонентов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setIsWizardOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ComponentStatus | "all")}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="online">Онлайн</SelectItem>
                <SelectItem value="offline">Офлайн</SelectItem>
                <SelectItem value="error">Ошибка</SelectItem>
                <SelectItem value="disabled">Отключено</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>

            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Список компонентов */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Загрузка компонентов...</div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            {error}
          </div>
        )}

        {!loading && !error && components.length === 0 && (
          <EmptyState
            icon={Layers3}
            title="Нет компонентов"
            description="У данного оборудования пока нет установленных компонентов"
            className="py-8"
          />
        )}

        {!loading && !error && components.length > 0 && (
          <div className="space-y-3">
            {components.map(component => (
              <Card key={component.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{component.display_name}</h3>
                      <p className="text-sm text-slate-400">
                        {component.template?.name || "Неизвестный тип"}
                      </p>
                      {component.serial_number && (
                        <p className="text-xs text-slate-500 mt-1">
                          S/N: {component.serial_number}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(component.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedComponent(component)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          {component.status !== 'archived' && (
                            <>
                              <DropdownMenuSeparator />
                              {component.status === 'disabled' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(component.id, 'enable')}>
                                  <Power className="w-4 h-4 mr-2" />
                                  Включить
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleStatusChange(component.id, 'disable')}>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  Отключить
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(component.id, 'archive')}
                                className="text-destructive"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Архивировать
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={cn(
                      "flex items-center gap-1 text-xs",
                      "bg-slate-600 text-slate-200"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(component.status))} />
                      {getStatusText(component.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Wizard для создания компонентов */}
        {tradingPointId && (
          <ComponentWizard
            open={isWizardOpen}
            onOpenChange={setIsWizardOpen}
            equipmentId={equipmentId}
            equipmentTemplateId={equipmentTemplateId}
            tradingPointId={tradingPointId}
            onSubmit={handleCreateComponent}
            loading={loading}
          />
        )}

        {/* DetailCard для редактирования компонентов */}
        <ComponentDetailCard
          open={!!selectedComponent}
          onOpenChange={(open) => !open && setSelectedComponent(null)}
          component={selectedComponent}
          onUpdate={handleUpdateComponent}
          onStatusChange={handleStatusChange}
          loading={loading}
        />
      </div>
    );
  }

  // Десктопная версия - таблица
  return (
    <div className={cn("space-y-4", className)}>
      {/* Фильтры и кнопка добавления */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск компонентов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ComponentStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="online">Онлайн</SelectItem>
              <SelectItem value="offline">Офлайн</SelectItem>
              <SelectItem value="error">Ошибка</SelectItem>
              <SelectItem value="disabled">Отключено</SelectItem>
              <SelectItem value="archived">Архив</SelectItem>
            </SelectContent>
          </Select>

          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Тип компонента" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={() => setIsWizardOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить компонент
        </Button>
      </div>

      {/* Состояния загрузки, ошибки и пустого списка */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-muted-foreground">Загрузка компонентов...</div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
          <p className="mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={loadComponents}>
            Попробовать снова
          </Button>
        </div>
      )}

      {!loading && !error && components.length === 0 && (
        <EmptyState
          icon={Layers3}
          title="Нет компонентов"
          description="У данного оборудования пока нет установленных компонентов"
          className="py-12"
        />
      )}

      {/* Таблица компонентов */}
      {!loading && !error && components.length > 0 && (
        <div className="bg-slate-800 border border-slate-600 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-200 font-medium">НАЗВАНИЕ</th>
                <th className="px-4 py-3 text-left text-slate-200 font-medium">ТИП</th>
                <th className="px-4 py-3 text-left text-slate-200 font-medium">СЕРИЙНЫЙ НОМЕР</th>
                <th className="px-4 py-3 text-left text-slate-200 font-medium">СТАТУС</th>
                <th className="px-4 py-3 text-right text-slate-200 font-medium">ДЕЙСТВИЯ</th>
              </tr>
            </thead>
            <tbody>
              {components.map(component => (
                <tr
                  key={component.id}
                  className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{component.display_name}</div>
                      {component.template && (
                        <div className="text-xs text-slate-400 mt-1">
                          {component.template.code}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {component.template?.name || "Неизвестный тип"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {component.serial_number || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={cn(
                      "flex items-center gap-1 w-fit",
                      "bg-slate-600 text-slate-200"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(component.status))} />
                      {getStatusText(component.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => setSelectedComponent(component)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {component.status !== 'archived' && (
                            <>
                              {component.status === 'disabled' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(component.id, 'enable')}>
                                  <Power className="w-4 h-4 mr-2" />
                                  Включить
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleStatusChange(component.id, 'disable')}>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  Отключить
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(component.id, 'archive')}
                                className="text-destructive"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Архивировать
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wizard для создания компонентов */}
      {tradingPointId && (
        <ComponentWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
          equipmentId={equipmentId}
          equipmentTemplateId={equipmentTemplateId}
          tradingPointId={tradingPointId}
          onSubmit={handleCreateComponent}
          loading={loading}
        />
      )}

      {/* DetailCard для редактирования компонентов */}
      <ComponentDetailCard
        open={!!selectedComponent}
        onOpenChange={(open) => !open && setSelectedComponent(null)}
        component={selectedComponent}
        onUpdate={handleUpdateComponent}
        onStatusChange={handleStatusChange}
        loading={loading}
      />
    </div>
  );
}