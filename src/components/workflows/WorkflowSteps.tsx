import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Edit } from "lucide-react";
import { DynamicForm } from "@/components/ui/dynamic-form";

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

interface Command {
  id: string;
  name: string;
  description: string;
  jsonSchema: string;
}

// Mock commands data
const mockCommands: Command[] = [
  {
    id: "cmd1",
    name: "Сформировать отчет смены",
    description: "Создает отчет о работе смены",
    jsonSchema: JSON.stringify({
      type: "object",
      properties: {},
      required: []
    })
  },
  {
    id: "cmd2",
    name: "Закрыть смену",
    description: "Завершает текущую смену",
    jsonSchema: JSON.stringify({
      type: "object",
      properties: {},
      required: []
    })
  },
  {
    id: "cmd3",
    name: "Установить цену",
    description: "Устанавливает новую цену на топливо",
    jsonSchema: JSON.stringify({
      type: "object",
      properties: {
        fuel_type: {
          type: "string",
          title: "Тип топлива",
          enum: ["АИ-92", "АИ-95", "АИ-98", "ДТ"]
        },
        new_price: {
          type: "number",
          title: "Новая цена",
          minimum: 0,
          description: "Цена в рублях за литр"
        }
      },
      required: ["fuel_type", "new_price"]
    })
  },
  {
    id: "cmd4",
    name: "Создать резервную копию",
    description: "Создает резервную копию данных",
    jsonSchema: JSON.stringify({
      type: "object",
      properties: {
        backup_type: {
          type: "string",
          title: "Тип копирования",
          enum: ["full", "incremental"],
          description: "Полное или инкрементальное копирование"
        }
      },
      required: ["backup_type"]
    })
  }
];

interface SortableStepProps {
  step: WorkflowStep;
  index: number;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (stepId: string) => void;
}

function SortableStep({ step, index, onEdit, onDelete }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                {...listeners} 
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{step.commandName}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Цель: {step.target.description}
                </div>
                {Object.keys(step.params).length > 0 && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Параметры: {JSON.stringify(step.params)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(step)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(step.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

interface StepFormProps {
  step?: WorkflowStep;
  onSave: (step: Omit<WorkflowStep, 'id'>) => void;
  onCancel: () => void;
}

function StepForm({ step, onSave, onCancel }: StepFormProps) {
  const [selectedCommandId, setSelectedCommandId] = useState(step?.commandId || "");
  const [targetType, setTargetType] = useState(step?.target.type || 'all_trading_points');
  const [targetValue, setTargetValue] = useState(step?.target.value || "");
  const [params, setParams] = useState<Record<string, any>>(step?.params || {});

  const selectedCommand = mockCommands.find(cmd => cmd.id === selectedCommandId);

  const getTargetDescription = () => {
    switch (targetType) {
      case 'all_networks':
        return 'Все сети';
      case 'specific_network':
        return `Сеть: ${targetValue || 'Не выбрана'}`;
      case 'all_trading_points':
        return 'Все торговые точки';
      case 'specific_trading_point':
        return `Торговая точка: ${targetValue || 'Не выбрана'}`;
      case 'equipment_type':
        return `Тип оборудования: ${targetValue || 'Не выбран'}`;
      case 'specific_equipment':
        return `Оборудование: ${targetValue || 'Не выбрано'}`;
      default:
        return 'Не определено';
    }
  };

  const handleSave = () => {
    if (!selectedCommand) return;

    onSave({
      commandId: selectedCommand.id,
      commandName: selectedCommand.name,
      params,
      target: {
        type: targetType,
        value: targetValue,
        description: getTargetDescription()
      }
    });
  };

  const isFormValid = selectedCommandId && selectedCommand;

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="command">Команда</Label>
        <Select value={selectedCommandId} onValueChange={setSelectedCommandId}>
          <SelectTrigger className="input-surface">
            <SelectValue placeholder="Выберите команду" />
          </SelectTrigger>
          <SelectContent>
            {mockCommands.map((command) => (
              <SelectItem key={command.id} value={command.id}>
                <div>
                  <div className="font-medium">{command.name}</div>
                  <div className="text-sm text-muted-foreground">{command.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCommand && (
        <>
          <div>
            <Label htmlFor="target">Цель выполнения</Label>
            <div className="space-y-4">
              <Select value={targetType} onValueChange={(value: any) => setTargetType(value)}>
                <SelectTrigger className="input-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_networks">Все сети</SelectItem>
                  <SelectItem value="specific_network">Конкретная сеть</SelectItem>
                  <SelectItem value="all_trading_points">Все торговые точки</SelectItem>
                  <SelectItem value="specific_trading_point">Конкретная торговая точка</SelectItem>
                  <SelectItem value="equipment_type">Тип оборудования</SelectItem>
                  <SelectItem value="specific_equipment">Конкретное оборудование</SelectItem>
                </SelectContent>
              </Select>

              {(targetType.includes('specific') || targetType === 'equipment_type') && (
                <Input
                  className="input-surface"
                  placeholder={
                    targetType === 'specific_network' ? 'Введите название сети' :
                    targetType === 'specific_trading_point' ? 'Введите название торговой точки' :
                    targetType === 'equipment_type' ? 'Введите тип оборудования (например: ТРК)' :
                    'Введите название оборудования'
                  }
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              )}
            </div>
          </div>

          <div>
            <Label>Параметры команды</Label>
            <div className="mt-2">
              <DynamicForm
                jsonSchema={selectedCommand.jsonSchema}
                onSubmit={setParams}
                onCancel={() => {}}
                submitText="Применить параметры"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button onClick={handleSave} disabled={!isFormValid}>
          {step ? 'Сохранить изменения' : 'Добавить шаг'}
        </Button>
      </div>
    </div>
  );
}

interface WorkflowStepsProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
}

export function WorkflowSteps({ steps, onStepsChange }: WorkflowStepsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex(step => step.id === active.id);
      const newIndex = steps.findIndex(step => step.id === over.id);

      onStepsChange(arrayMove(steps, oldIndex, newIndex));
    }
  };

  const handleAddStep = (stepData: Omit<WorkflowStep, 'id'>) => {
    const newStep: WorkflowStep = {
      ...stepData,
      id: Date.now().toString(),
    };
    onStepsChange([...steps, newStep]);
    setIsAddDialogOpen(false);
  };

  const handleEditStep = (stepData: Omit<WorkflowStep, 'id'>) => {
    if (!editingStep) return;
    
    const updatedSteps = steps.map(step =>
      step.id === editingStep.id
        ? { ...stepData, id: editingStep.id }
        : step
    );
    onStepsChange(updatedSteps);
    setIsEditDialogOpen(false);
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    onStepsChange(steps.filter(step => step.id !== stepId));
  };

  const startEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Пока нет ни одного шага</p>
          <p className="text-sm">Добавьте первый шаг для начала создания регламента</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map(step => step.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <SortableStep
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={startEditStep}
                  onDelete={handleDeleteStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Добавить шаг
          </Button>
        </DialogTrigger>
        <DialogContent className="dialog-surface max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить новый шаг</DialogTitle>
          </DialogHeader>
          <StepForm
            onSave={handleAddStep}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="dialog-surface max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать шаг</DialogTitle>
          </DialogHeader>
          {editingStep && (
            <StepForm
              step={editingStep}
              onSave={handleEditStep}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingStep(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
