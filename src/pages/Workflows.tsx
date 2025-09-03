import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  History, 
  Activity, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Calendar,
  Settings,
  BarChart3
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  Workflow, 
  WorkflowExecution, 
  WorkflowType, 
  WorkflowStatus, 
  ExecutionStatus,
  WORKFLOW_TYPE_CONFIGS
} from "@/types/workflows";
import workflowsService from "@/services/workflowsService";
import { WorkflowForm } from "@/components/workflows/WorkflowForm";
import { WorkflowMonitoring } from "@/components/workflows/WorkflowMonitoring";

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions' | 'monitoring'>('workflows');
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [executionStatusFilter, setExecutionStatusFilter] = useState<ExecutionStatus | 'all'>('all');

  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workflowsResponse, executionsResponse] = await Promise.all([
        workflowsService.listWorkflows({ sort_by: 'updated_at', sort_order: 'desc' }),
        workflowsService.listExecutions({ sort_by: 'started_at', sort_order: 'desc', limit: 100 })
      ]);
      
      setWorkflows(workflowsResponse.data);
      setExecutions(executionsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSchedule = (workflow: Workflow) => {
    const { schedule } = workflow;
    const freq = schedule.frequency;
    const interval = schedule.interval;
    
    if (freq === 'minutes') return `Каждые ${interval} мин.`;
    if (freq === 'hours') return `Каждые ${interval} ч.`;
    if (freq === 'days') return `Каждые ${interval} дн.`;
    if (freq === 'weeks') return `Каждые ${interval} нед.`;
    if (freq === 'months') return `Каждые ${interval} мес.`;
    
    return 'По расписанию';
  };

  const formatLastExecution = (workflow: Workflow) => {
    if (!workflow.last_execution) return 'Никогда';
    
    const date = new Date(workflow.last_execution.started_at);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const statusText = workflow.last_execution.status === 'completed' ? 'Успешно' :
                      workflow.last_execution.status === 'failed' ? 'Ошибка' :
                      workflow.last_execution.status === 'running' ? 'Выполняется' : 'Ожидание';
    
    return `${formattedDate} (${statusText})`;
  };

  const getStatusBadgeVariant = (status: WorkflowStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'error': return 'destructive';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: WorkflowStatus) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'inactive': return 'Неактивен';
      case 'error': return 'Ошибка';
      case 'draft': return 'Черновик';
      default: return status;
    }
  };

  const getExecutionStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getExecutionStatusText = (status: ExecutionStatus) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'failed': return 'Ошибка';
      case 'running': return 'Выполняется';
      case 'pending': return 'Ожидает';
      case 'skipped': return 'Пропущено';
      default: return status;
    }
  };

  const toggleWorkflowStatus = async (workflow: Workflow) => {
    try {
      if (workflow.status === 'active') {
        await workflowsService.deactivateWorkflow(workflow.id);
        toast({
          title: "Регламент приостановлен",
          description: `Регламент "${workflow.name}" приостановлен.`
        });
      } else {
        await workflowsService.activateWorkflow(workflow.id);
        toast({
          title: "Регламент активирован",
          description: `Регламент "${workflow.name}" активирован.`
        });
      }
      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить статус регламента",
        variant: "destructive"
      });
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      await workflowsService.executeWorkflow({ workflow_id: workflowId, override_schedule: true });
      toast({
        title: "Регламент запущен",
        description: "Регламент запущен вручную."
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка запуска",
        description: error.message || "Не удалось запустить регламент",
        variant: "destructive"
      });
    }
  };

  const duplicateWorkflow = async (workflow: Workflow) => {
    try {
      const cloned = await workflowsService.cloneWorkflow(workflow.id, `${workflow.name} (копия)`);
      if (cloned) {
        toast({
          title: "Регламент скопирован",
          description: `Создана копия регламента "${workflow.name}".`
        });
        await loadData();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка копирования",
        description: error.message || "Не удалось скопировать регламент",
        variant: "destructive"
      });
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    if (!confirm(`Вы уверены, что хотите удалить регламент "${workflow.name}"?`)) return;

    try {
      await workflowsService.deleteWorkflow(workflowId);
      toast({
        title: "Регламент удален",
        description: `Регламент "${workflow.name}" был удален.`
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить регламент",
        variant: "destructive"
      });
    }
  };

  const handleCreateWorkflow = async (data: any) => {
    try {
      await workflowsService.createWorkflow(data);
      toast({
        title: "Регламент создан",
        description: `Регламент "${data.name}" успешно создан.`
      });
      setIsCreateDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка создания",
        description: error.message || "Не удалось создать регламент",
        variant: "destructive"
      });
    }
  };

  const handleEditWorkflow = async (data: any) => {
    if (!selectedWorkflow) return;

    try {
      await workflowsService.updateWorkflow(selectedWorkflow.id, {
        ...data,
        version: selectedWorkflow.version
      });
      toast({
        title: "Регламент обновлен",
        description: `Регламент "${data.name}" успешно обновлен.`
      });
      setIsEditDialogOpen(false);
      setSelectedWorkflow(null);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить регламент",
        variant: "destructive"
      });
    }
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = !searchTerm || 
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || workflow.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredExecutions = executions.filter((execution) => {
    const matchesSearch = !searchTerm || 
      workflows.find(w => w.id === execution.workflow_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = executionStatusFilter === 'all' || execution.status === executionStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Header */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-2xl font-semibold text-white">Регламенты</h1>
          <p className="text-slate-400 mt-2">
            Автоматизация синхронизации данных с торговыми API сетями
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700 mx-4 md:mx-6 lg:mx-8">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Управление регламентами</h2>
                <div className="text-sm text-slate-400">
                  Всего: {workflows.length}
                </div>
              </div>
              
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать регламент
              </Button>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input 
                placeholder="Поиск..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
              
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Тип регламента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  {Object.entries(WORKFLOW_TYPE_CONFIGS).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      {config.icon} {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                  <SelectItem value="error">С ошибками</SelectItem>
                  <SelectItem value="draft">Черновики</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={executionStatusFilter} onValueChange={(value: any) => setExecutionStatusFilter(value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Статус выполнения" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все выполнения</SelectItem>
                  <SelectItem value="completed">Завершенные</SelectItem>
                  <SelectItem value="failed">С ошибками</SelectItem>
                  <SelectItem value="running">Выполняются</SelectItem>
                  <SelectItem value="pending">Ожидающие</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-4 md:mx-6 lg:mx-8">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Регламенты
            </TabsTrigger>
            <TabsTrigger value="executions" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Выполнения
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Мониторинг
            </TabsTrigger>
          </TabsList>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="mt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Загрузка...</div>
              </div>
            ) : filteredWorkflows.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? 'Регламенты не найдены' : 'Нет регламентов'}
                </h3>
                <p className="text-slate-400">
                  {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' 
                    ? 'Попробуйте изменить условия поиска' 
                    : 'Создайте первый регламент для автоматизации синхронизации данных'}
                </p>
                {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
                  <Button 
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать первый регламент
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                <table className="w-full text-sm min-w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">РЕГЛАМЕНТ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">ТИП</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">РАСПИСАНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">СТАТУС</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">ПОСЛЕДНЕЕ ВЫПОЛНЕНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">УСПЕШНОСТЬ</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium">ДЕЙСТВИЯ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {filteredWorkflows.map((workflow) => (
                      <tr key={workflow.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white">{workflow.name}</div>
                            <div className="text-sm text-slate-400">{workflow.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{WORKFLOW_TYPE_CONFIGS[workflow.type]?.icon}</span>
                            <span className="text-white text-sm">{WORKFLOW_TYPE_CONFIGS[workflow.type]?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-blue-400" />
                            <span className="text-white text-sm">{formatSchedule(workflow)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(workflow.status)}>
                            {getStatusText(workflow.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {workflow.last_execution && getExecutionStatusIcon(workflow.last_execution.status)}
                            <span className="text-white text-sm">{formatLastExecution(workflow)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white text-sm">
                            {workflow.success_rate ? `${workflow.success_rate}%` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => executeWorkflow(workflow.id)}
                              title="Запустить сейчас"
                              disabled={workflow.status === 'error'}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => {
                                setSelectedWorkflow(workflow);
                                setIsHistoryDialogOpen(true);
                              }}
                              title="История выполнений"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => {
                                setSelectedWorkflow(workflow);
                                setIsEditDialogOpen(true);
                              }}
                              title="Редактировать"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => duplicateWorkflow(workflow)}
                              title="Дублировать"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${workflow.status === 'active' ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-400 hover:text-green-400'}`}
                              onClick={() => toggleWorkflowStatus(workflow)}
                              title={workflow.status === 'active' ? "Деактивировать" : "Активировать"}
                            >
                              {workflow.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => deleteWorkflow(workflow.id)}
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Executions Tab */}
          <TabsContent value="executions" className="mt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-slate-400">Загрузка...</div>
              </div>
            ) : filteredExecutions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Нет выполнений</h3>
                <p className="text-slate-400">
                  Выполнения регламентов будут отображаться здесь
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                <table className="w-full text-sm min-w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">РЕГЛАМЕНТ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">СТАТУС</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">ЗАПУСК</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">ЗАВЕРШЕНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">ДЛИТЕЛЬНОСТЬ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium">РЕЗУЛЬТАТ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {filteredExecutions.map((execution) => {
                      const workflow = workflows.find(w => w.id === execution.workflow_id);
                      return (
                        <tr key={execution.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{workflow?.name || 'Неизвестный регламент'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getExecutionStatusIcon(execution.status)}
                              <span className="text-white text-sm">{getExecutionStatusText(execution.status)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white text-sm">
                              {new Date(execution.started_at).toLocaleString('ru-RU')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white text-sm">
                              {execution.completed_at 
                                ? new Date(execution.completed_at).toLocaleString('ru-RU')
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white text-sm">
                              {execution.duration_ms 
                                ? `${Math.round(execution.duration_ms / 1000)}с`
                                : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-white">
                                Обработано: {execution.targets_processed || 0}
                              </div>
                              <div className="text-slate-400">
                                Успешно: {execution.targets_successful || 0} | 
                                Ошибок: {execution.targets_failed || 0}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="mt-6">
            <WorkflowMonitoring workflows={workflows} onRefresh={loadData} />
          </TabsContent>
        </Tabs>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Создать новый регламент</DialogTitle>
            </DialogHeader>
            <WorkflowForm 
              onSubmit={handleCreateWorkflow} 
              onCancel={() => setIsCreateDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать регламент</DialogTitle>
            </DialogHeader>
            {selectedWorkflow && (
              <WorkflowForm 
                initialData={selectedWorkflow}
                onSubmit={handleEditWorkflow} 
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedWorkflow(null);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>История выполнений: {selectedWorkflow?.name}</DialogTitle>
            </DialogHeader>
            {selectedWorkflow && (
              <div className="text-center py-8">
                <p className="text-slate-400">
                  Компонент истории выполнений будет реализован на следующем этапе
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}