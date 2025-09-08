import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle, XCircle, Clock, Eye } from "lucide-react";

interface WorkflowExecution {
  id: string;
  startTime: string;
  endTime?: string;
  status: 'success' | 'error' | 'running';
  triggeredBy: 'schedule' | 'manual';
  user?: string;
  steps: {
    stepId: string;
    stepName: string;
    status: 'success' | 'error' | 'running' | 'pending';
    startTime?: string;
    endTime?: string;
    result?: string;
    error?: string;
  }[];
}

// ❌ MOCK ИСТОРИЯ ВЫПОЛНЕНИЯ ЗАБЛОКИРОВАНА ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
const mockExecutions: WorkflowExecution[] = [];

interface WorkflowHistoryProps {
  workflowId: string;
  onClose: () => void;
}

export function WorkflowHistory({ workflowId, onClose }: WorkflowHistoryProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return "Выполняется...";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} сек`;
    }
    
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    
    return `${minutes}м ${seconds}с`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-error" />;
      case 'running':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Успешно</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ошибка</Badge>;
      case 'running':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Выполняется</Badge>;
      default:
        return <Badge variant="secondary">Неизвестно</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {mockExecutions.map((execution) => (
          <Card key={execution.id}>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          Запуск от {formatDateTime(execution.startTime)}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Длительность: {getDuration(execution.startTime, execution.endTime)}</span>
                          <span>
                            Запуск: {execution.triggeredBy === 'schedule' ? 'По расписанию' : 
                                    `Ручной ${execution.user ? `(${execution.user})` : ''}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(execution.status)}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Детали выполнения шагов:</h4>
                    <div className="space-y-2">
                      {execution.steps.map((step, index) => (
                        <div key={step.stepId} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                            {getStatusIcon(step.status)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{step.stepName}</div>
                            {step.startTime && (
                              <div className="text-xs text-muted-foreground">
                                {formatDateTime(step.startTime)} 
                                {step.endTime && ` - ${formatDateTime(step.endTime)}`}
                                {step.endTime && ` (${getDuration(step.startTime, step.endTime)})`}
                              </div>
                            )}
                            {step.result && (
                              <div className="text-sm text-success mt-1">
                                ✓ {step.result}
                              </div>
                            )}
                            {step.error && (
                              <div className="text-sm text-error mt-1">
                                ✗ {step.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {mockExecutions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>История запусков пуста</p>
          <p className="text-sm">Этот регламент еще не запускался</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}
