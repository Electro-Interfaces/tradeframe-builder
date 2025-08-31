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
      <div className="space-y-6">
        <div className="page-toolbar">
          <h1 className="text-3xl font-bold text-foreground">Регламенты (Workflows)</h1>
          <div className="flex items-center gap-2">
            <Input className="input-surface w-64" placeholder="Поиск регламентов..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать регламент
              </Button>
            </DialogTrigger>
            <DialogContent className="dialog-surface max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать новый регламент</DialogTitle>
              </DialogHeader>
              <WorkflowForm onSubmit={handleCreateWorkflow} onCancel={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Создавайте и запускайте регламентные сценарии по расписанию (CRON) или вручную, отслеживайте историю запусков и статусы.
        </div>

        <div className="table-wrap">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Название регламента</TableHead>
                <TableHead>Триггер</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последний запуск</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleWorkflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">{workflow.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {workflow.triggerType === 'schedule' ? (
                        <Timer className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">{formatTrigger(workflow)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={workflow.isActive ? "default" : "secondary"}>
                      {workflow.isActive ? "Активен" : "Приостановлен"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {workflow.lastRun && (
                        <div className={`w-2 h-2 rounded-full ${
                          workflow.lastRun.status === 'success' ? 'bg-success' :
                          workflow.lastRun.status === 'error' ? 'bg-error' : 'bg-warning'
                        }`} />
                      )}
                      <span className="text-sm">{formatLastRun(workflow.lastRun)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleWorkflowStatus(workflow.id)}
                        >
                          {workflow.isActive ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Приостановить
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Активировать
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateWorkflow(workflow)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Дублировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setIsHistoryDialogOpen(true);
                          }}
                        >
                          <History className="w-4 h-4 mr-2" />
                          История запусков
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="dialog-surface max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <DialogContent className="dialog-surface max-w-4xl max-h-[90vh] overflow-y-auto">
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
