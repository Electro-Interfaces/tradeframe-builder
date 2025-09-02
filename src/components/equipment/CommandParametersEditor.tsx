import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Settings, 
  AlertCircle, 
  Info,
  Loader2 
} from "lucide-react";
import { NewCommandTemplate } from '@/types/connections';
import { CreateCommandInstanceRequest } from '@/types/commandTemplate';
import { commandsAPI } from '@/services/commandsService';
import { useToast } from '@/hooks/use-toast';

interface CommandParametersEditorProps {
  open: boolean;
  onClose: () => void;
  template?: NewCommandTemplate;
  targetType: 'equipment' | 'component';
  targetId: string;
  targetName?: string;
  onSuccess?: () => void;
}

interface ParameterValue {
  name: string;
  type: string;
  value: any;
  required: boolean;
  description?: string;
}

export const CommandParametersEditor: React.FC<CommandParametersEditorProps> = ({
  open,
  onClose,
  template,
  targetType,
  targetId,
  targetName,
  onSuccess
}) => {
  const [parameters, setParameters] = useState<ParameterValue[]>([]);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  // Инициализация параметров из схемы шаблона
  useEffect(() => {
    if (open && template?.schemas) {
      const params: ParameterValue[] = [];
      
      // Параметры из request_body
      if (template.schemas.request_body?.properties) {
        Object.entries(template.schemas.request_body.properties).forEach(([key, schema]) => {
          params.push({
            name: key,
            type: schema.type || 'string',
            value: schema.example || '',
            required: template.schemas.request_body?.required?.includes(key) || false,
            description: schema.description
          });
        });
      }

      // Параметры из query_params
      if (template.schemas.query_params?.properties) {
        Object.entries(template.schemas.query_params.properties).forEach(([key, schema]) => {
          params.push({
            name: key,
            type: schema.type || 'string',
            value: schema.default || schema.example || '',
            required: template.schemas.query_params?.required?.includes(key) || false,
            description: schema.description
          });
        });
      }

      // Параметры из path_params
      if (template.schemas.path_params?.properties) {
        Object.entries(template.schemas.path_params.properties).forEach(([key, schema]) => {
          params.push({
            name: key,
            type: schema.type || 'string',
            value: schema.example || '',
            required: template.schemas.path_params?.required?.includes(key) || false,
            description: schema.description
          });
        });
      }

      setParameters(params);
    } else {
      setParameters([]);
    }
  }, [open, template]);

  // Обновление значения параметра
  const updateParameter = (name: string, value: any) => {
    setParameters(prev => prev.map(param => 
      param.name === name ? { ...param, value } : param
    ));
  };

  // Выполнение команды с параметрами
  const executeCommand = async () => {
    if (!template) return;

    try {
      setExecuting(true);

      // Проверяем обязательные параметры
      const missingRequired = parameters.filter(p => p.required && (!p.value || p.value === ''));
      if (missingRequired.length > 0) {
        toast({
          title: "Ошибка",
          description: `Заполните обязательные параметры: ${missingRequired.map(p => p.name).join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Формируем параметры для команды
      const commandParameters: Record<string, any> = {};
      parameters.forEach(param => {
        if (param.value !== '' && param.value !== null && param.value !== undefined) {
          // Преобразуем значение по типу
          let value = param.value;
          if (param.type === 'number' || param.type === 'integer') {
            value = Number(value);
          } else if (param.type === 'boolean') {
            value = Boolean(value);
          }
          commandParameters[param.name] = value;
        }
      });

      const commandRequest: CreateCommandInstanceRequest = {
        templateId: template.template_id,
        targetType,
        targetId,
        parameters: commandParameters,
        priority: 'normal',
        scheduledFor: new Date().toISOString()
      };

      await commandsAPI.create(commandRequest);

      toast({
        title: "Команда отправлена",
        description: `"${template.name}" выполняется для ${targetName || targetId}`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить команду",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  // Рендер поля параметра
  const renderParameterField = (param: ParameterValue) => {
    const fieldId = `param-${param.name}`;
    
    return (
      <div key={param.name} className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {param.name}
          </Label>
          {param.required && (
            <Badge variant="destructive" className="text-xs">
              обязательный
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {param.type}
          </Badge>
        </div>
        
        {param.description && (
          <p className="text-xs text-muted-foreground">{param.description}</p>
        )}

        {param.type === 'string' && param.name.includes('password') ? (
          <Input
            id={fieldId}
            type="password"
            value={param.value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={`Введите ${param.name}`}
          />
        ) : param.type === 'string' && (param.value?.toString().length > 50 || param.name.includes('description')) ? (
          <Textarea
            id={fieldId}
            value={param.value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={`Введите ${param.name}`}
            rows={3}
          />
        ) : (
          <Input
            id={fieldId}
            type={param.type === 'number' || param.type === 'integer' ? 'number' : 'text'}
            value={param.value}
            onChange={(e) => updateParameter(param.name, e.target.value)}
            placeholder={`Введите ${param.name}`}
          />
        )}
      </div>
    );
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройка команды
          </DialogTitle>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.method}</Badge>
              <span className="text-sm font-medium">{template.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              Цель: {targetName || targetId} ({targetType === 'equipment' ? 'оборудование' : 'компонент'})
            </div>
          </div>
        </DialogHeader>

        {parameters.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Эта команда не требует дополнительных параметров
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Параметры команды:</h4>
              <div className="space-y-4">
                {parameters.map(renderParameterField)}
              </div>
            </div>

            {/* Показываем пример endpoint'а */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Endpoint:</p>
              <code className="text-xs">{template.method} {template.endpoint}</code>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={executing}>
            Отмена
          </Button>
          <Button onClick={executeCommand} disabled={executing}>
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Выполняется...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Выполнить команду
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};