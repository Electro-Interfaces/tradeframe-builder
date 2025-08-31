import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Plus, Edit, Trash2, Copy, History, Play, Pause, Timer, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { WorkflowForm } from "@/components/workflows/WorkflowForm";
import { WorkflowHistory } from "@/components/workflows/WorkflowHistory";

interface WorkflowStep {
  id: string;
  commandId: string;
  commandName: string;
  params: Record<string, any>;
  target: {
    type: 'all_networks' | 'specific_network' | 'all_trading_points' | 'specific_trading_point' | 'equipment_type' | 'specific_equipment';
    value?: string;
    description: string;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: 'schedule' | 'event';
  schedule?: string;
  steps: WorkflowStep[];
  lastRun?: {
    date: string;
    status: 'success' | 'error' | 'running';
  };
  createdAt: string;
  updatedAt: string;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    name: "Ежедневное закрытие смены",
    description: "Автоматическое закрытие смен на всех АЗС в 23:55",
    isActive: true,
    triggerType: "schedule",
    schedule: "55 23 * * *",
    steps: [
      {
        id: "step1",
        commandId: "cmd1",
        commandName: "Сформировать отчет смены",
        params: {},
        target: {
          type: "all_trading_points",
          description: "Все торговые точки"
        }
      },
      {
        id: "step2",
        commandId: "cmd2",
        commandName: "Закрыть смену",
        params: {},
        target: {
          type: "all_trading_points",
          description: "Все торговые точки"
        }
      }
    ],
    lastRun: {
      date: "2024-08-29T23:55:00Z",
      status: "success"
    },
    createdAt: "2024-08-15T10:00:00Z",
    updatedAt: "2024-08-20T14:30:00Z"
  },
  {
    id: "2",
    name: "Обновление цен на топливо",
    description: "Еженедельное обновление цен по понедельникам в 6:00",
    isActive: true,
    triggerType: "schedule",
    schedule: "0 6 * * 1",
    steps: [
      {
        id: "step1",
        commandId: "cmd3",
        commandName: "Установить цену",
        params: {
          fuel_type: "АИ-95",
          new_price: "{{weekly_price_ai95}}"
        },
        target: {
          type: "equipment_type",
          value: "ТРК",
          description: "Все ТРК"
        }
      }
    ],
    lastRun: {
      date: "2024-08-26T06:00:00Z",
      status: "success"
    },
    createdAt: "2024-08-10T12:00:00Z",
    updatedAt: "2024-08-25T16:45:00Z"
  },
  {
    id: "3",
    name: "Резервное копирование данных",
    description: "Ежедневное резервное копирование в 2:00",
    isActive: false,
    triggerType: "schedule",
    schedule: "0 2 * * *",
    steps: [
      {
        id: "step1",
        commandId: "cmd4",
        commandName: "Создать резервную копию",
        params: {},
        target: {
          type: "all_networks",
          description: "Все сети"
        }
      }
    ],
    lastRun: {
      date: "2024-08-28T02:00:00Z",
      status: "error"
    },
    createdAt: "2024-08-05T09:00:00Z",
    updatedAt: "2024-08-28T08:15:00Z"
  }
];

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const formatLastRun = (lastRun?: Workflow['lastRun']) => {
    if (!lastRun) return "Никогда";
    
    const date = new Date(lastRun.date);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${formattedDate} (${lastRun.status === 'success' ? 'Успешно' : lastRun.status === 'error' ? 'Ошибка' : 'Выполняется'})`;
  };

  const formatTrigger = (workflow: Workflow) => {
    if (workflow.triggerType === 'schedule' && workflow.schedule) {
      // Простое преобразование CRON в читаемый формат
      const [minute, hour, day, month, dayOfWeek] = workflow.schedule.split(' ');
      
      if (dayOfWeek !== '*') {
        const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
        return `По расписанию: каждый ${days[parseInt(dayOfWeek)]} в ${hour}:${minute.padStart(2, '0')}`;
      }
      
      if (day === '*' && month === '*') {
        return `По расписанию: ежедневно в ${hour}:${minute.padStart(2, '0')}`;
      }
      
      return `По расписанию: ${workflow.schedule}`;
    }
    
    return "По событию";
  };

  const toggleWorkflowStatus = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId 
        ? { ...w, isActive: !w.isActive }
        : w
    ));
    
    const workflow = workflows.find(w => w.id === workflowId);
    toast({
      title: workflow?.isActive ? "Регламент приостановлен" : "Регламент активирован",
      description: `Регламент "${workflow?.name}" ${workflow?.isActive ? 'приостановлен' : 'активирован'}.`,
    });
  };

  const duplicateWorkflow = (workflow: Workflow) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: Date.now().toString(),
      name: `${workflow.name} (копия)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRun: undefined
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    toast({
      title: "Регламент скопирован",
      description: `Создана копия регламента "${workflow.name}".`,
    });
  };

  const deleteWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    toast({
      title: "Регламент удален",
      description: `Регламент "${workflow?.name}" был удален.`,
    });
  };

  const handleCreateWorkflow = (workflowData: Partial<Workflow>) => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: workflowData.name!,
      description: workflowData.description!,
      isActive: workflowData.isActive ?? true,
      triggerType: workflowData.triggerType!,
      schedule: workflowData.schedule,
      steps: workflowData.steps ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setWorkflows(prev => [...prev, newWorkflow]);
    setIsCreateDialogOpen(false);
    toast({
      title: "Регламент создан",
      description: `Регламент "${newWorkflow.name}" успешно создан.`,
    });
  };

  const handleEditWorkflow = (workflowData: Partial<Workflow>) => {
    if (!selectedWorkflow) return;
    
    setWorkflows(prev => prev.map(w => 
      w.id === selectedWorkflow.id 
        ? { ...w, ...workflowData, updatedAt: new Date().toISOString() }
        : w
    ));
    
    setIsEditDialogOpen(false);
    setSelectedWorkflow(null);
    toast({
      title: "Регламент обновлен",
      description: `Регламент "${workflowData.name}" успешно обновлен.`,
    });
  };

  const visibleWorkflows = workflows.filter((w) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      (w.description || "").toLowerCase().includes(q) ||
      (w.schedule || "").toLowerCase().includes(q)
    );
  });

  return (
    <MainLayout>
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Регламенты</h1>
          <p className="text-slate-400 mt-2">Создавайте и запускайте регламентные сценарии по расписанию, отслеживайте историю запусков и статусы</p>
        </div>

        {/* Панель регламентов */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚙️</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Регламенты</h2>
                <div className="text-sm text-slate-400">
                  Всего регламентов: {workflows.length}
                </div>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                  >
                    + Создать регламент
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Создать новый регламент</DialogTitle>
                  </DialogHeader>
                  <WorkflowForm onSubmit={handleCreateWorkflow} onCancel={() => setIsCreateDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Поиск регламентов */}
            <div className="mt-4">
              <Input 
                placeholder="Поиск регламентов..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Таблица регламентов */}
        {visibleWorkflows.length === 0 ? (
          <div className="px-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchTerm ? 'Регламенты не найдены' : 'Нет регламентов'}
              </h3>
              <p className="text-slate-400">
                {searchTerm ? 'Попробуйте изменить условия поиска' : 'Создайте первый регламент для автоматизации процессов'}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
              <table className="w-full text-sm min-w-full table-fixed">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '35%'}}>НАЗВАНИЕ РЕГЛАМЕНТА</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '25%'}}>ТРИГГЕР</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СТАТУС</th>
                    <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ПОСЛЕДНИЙ ЗАПУСК</th>
                    <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800">
                  {visibleWorkflows.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-white text-base">{workflow.name}</div>
                          {workflow.description && (
                            <div className="text-sm text-slate-400">{workflow.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {workflow.triggerType === 'schedule' ? (
                            <Timer className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          ) : (
                            <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                          <span className="text-white text-sm">{formatTrigger(workflow)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={workflow.isActive ? "default" : "secondary"}>
                          {workflow.isActive ? "Активен" : "Приостановлен"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {workflow.lastRun && (
                            <div className={`w-2 h-2 rounded-full ${
                              workflow.lastRun.status === 'success' ? 'bg-green-400' :
                              workflow.lastRun.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                            }`} />
                          )}
                          <span className="text-white text-sm">{formatLastRun(workflow.lastRun)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setIsHistoryDialogOpen(true);
                            }}
                            title="История запусков"
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
                            className={`h-8 w-8 p-0 ${workflow.isActive ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-400 hover:text-green-400'}`}
                            onClick={() => toggleWorkflowStatus(workflow.id)}
                            title={workflow.isActive ? "Приостановить" : "Активировать"}
                          >
                            {workflow.isActive ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <DialogTitle>История запусков: {selectedWorkflow?.name}</DialogTitle>
            </DialogHeader>
            {selectedWorkflow && (
              <WorkflowHistory 
                workflowId={selectedWorkflow.id}
                onClose={() => {
                  setIsHistoryDialogOpen(false);
                  setSelectedWorkflow(null);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
