import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Play, 
  Terminal, 
  Clock, 
  RefreshCw, 
  Power,
  Shield,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Activity,
  Edit3
} from 'lucide-react';
import { Equipment } from '@/types/equipment';
import { CommandInstance, CreateCommandInstanceRequest } from '@/types/commandTemplate';
import { NewCommandTemplate } from '@/types/connections';
import { commandsAPI } from '@/services/commandsService';
import { currentNewTemplatesAPI } from '@/services/newConnectionsService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

interface EquipmentCommandsPanelProps {
  equipment: Equipment;
  onRefresh?: () => void;
  onEditCommands?: (equipmentId: string) => void;
}

interface EquipmentCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresParams: boolean;
  params?: { name: string; type: string; required: boolean; placeholder?: string }[];
  template?: NewCommandTemplate;
}

interface CommandParam {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

// Маппинг иконок для API шаблонов команд
const getCommandIcon = (templateId: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    // API команды Autooplata
    'autooplata_login': Shield,
    'autooplata_get_prices': Download,
    'autooplata_set_prices': Play,
    'autooplata_get_services': Activity,
    'autooplata_equipment_status': Activity,
    'autooplata_equipment_status_extended': Activity,  
    'autooplata_restart_terminal': RefreshCw,
    // Другие API команды
    'network_daily_report': Download,
    'trading_point_sync': Clock,
    'component_diagnostics': Settings,
    'payment_notification': Shield,
    // Старые команды для совместимости
    'reboot_equipment': RefreshCw,
    'get_system_status': Activity,
    'sync_time': Clock,
    'emergency_stop': Power,
    'maintenance_mode': Settings,
    'update_config': Download,
    'backup_data': Shield,
    'restart_services': Play,
  };
  return iconMap[templateId] || Settings;
};

export const EquipmentCommandsPanel: React.FC<EquipmentCommandsPanelProps> = ({
  equipment,
  onRefresh,
  onEditCommands
}) => {
  const [commandHistory, setCommandHistory] = useState<CommandInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [availableCommands, setAvailableCommands] = useState<EquipmentCommand[]>([]);
  const [commandsLoading, setCommandsLoading] = useState(false);
  const { toast } = useToast();

  // Загрузка доступных команд для оборудования
  const loadAvailableCommands = async () => {
    if (!equipment.availableCommandIds || equipment.availableCommandIds.length === 0) {
      setAvailableCommands([]);
      return;
    }
    
    try {
      setCommandsLoading(true);
      // Загружаем все активные шаблоны API команд
      const templatesResponse = await currentNewTemplatesAPI.list({
        status: 'active',
        limit: 100
      });
      
      const commandPromises = equipment.availableCommandIds.map(async (commandId) => {
        try {
          // Находим шаблон по template_id или id
          const template = templatesResponse.data.find(t => t.template_id === commandId || t.id === commandId);
          
          if (template) {
            return {
              id: commandId,
              name: template.name,
              description: template.description,
              icon: getCommandIcon(template.template_id),
              requiresParams: false, // API шаблоны могут иметь параметры в schemas
              template
            } as EquipmentCommand;
          } else {
            // Fallback для команд без шаблона
            return {
              id: commandId,
              name: commandId.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
              description: 'Команда без шаблона',
              icon: getCommandIcon(commandId),
              requiresParams: false,
            } as EquipmentCommand;
          }
        } catch (error) {
          console.warn(`Failed to process command ${commandId}:`, error);
          return null;
        }
      });
      
      const commands = await Promise.all(commandPromises);
      setAvailableCommands(commands.filter(Boolean) as EquipmentCommand[]);
    } catch (error) {
      console.error('Error loading available commands:', error);
      setAvailableCommands([]);
    } finally {
      setCommandsLoading(false);
    }
  };
  
  // Загружаем команды при изменении оборудования
  useEffect(() => {
    loadAvailableCommands();
  }, [equipment.id, equipment.availableCommandIds]);

  // Загрузка истории команд при необходимости
  const loadCommandHistory = async () => {
    if (historyLoading) return;
    
    try {
      setHistoryLoading(true);
      const history = await commandsAPI.getHistory({
        targetType: 'equipment',
        targetId: equipment.id,
        limit: 5
      });
      setCommandHistory(history);
    } catch (error) {
      console.error('Error loading command history:', error);
      setCommandHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Выполнение команды
  const executeCommand = async (command: EquipmentCommand) => {
    try {
      setLoading(true);

      const commandRequest: CreateCommandInstanceRequest = {
        templateId: command.id,
        targetType: 'equipment',
        targetId: equipment.id,
        parameters: {},
        priority: 'normal',
        scheduledFor: new Date().toISOString()
      };

      await commandsAPI.create(commandRequest);

      toast({
        title: "Команда отправлена",
        description: `"${command.name}" выполняется`,
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить команду",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-200">Управление оборудованием</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {equipment.system_type || equipment.name}
          </Badge>
          <Badge 
            variant={equipment.status === 'online' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {equipment.status}
          </Badge>
        </div>
      </div>

      {/* Компактные команды */}
      <div className="flex items-center gap-2 flex-wrap">
        {commandsLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Загрузка команд...
          </div>
        ) : availableCommands.length === 0 ? (
          <div className="text-xs text-slate-500">
            Команды не настроены
          </div>
        ) : (
          availableCommands.map((command) => {
            const IconComponent = command.icon;
            return (
              <Button
                key={command.id}
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs border-slate-600 hover:bg-slate-700 hover:text-slate-200"
                onClick={() => executeCommand(command)}
                disabled={loading}
                title={command.description}
              >
                <IconComponent className="w-3 h-3 mr-1" />
                {command.name}
              </Button>
            );
          })
        )}
        
        {/* Кнопка редактирования команд */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-slate-400 hover:text-blue-400"
          onClick={() => onEditCommands?.(equipment.id)}
          title="Редактировать привязку команд"
        >
          <Edit3 className="w-3 h-3" />
        </Button>
        
        {/* Кнопка истории */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-slate-400 hover:text-slate-200"
          onClick={loadCommandHistory}
          disabled={historyLoading}
          title="Показать историю команд"
        >
          {historyLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Terminal className="w-3 h-3" />
          )}
        </Button>
      </div>

      {/* Компактная история команд */}
      {commandHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="text-xs text-slate-400 mb-2">Последние команды:</div>
          <div className="space-y-1">
            {commandHistory.slice(0, 3).map((instance) => (
              <div key={instance.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate">
                  {instance.template_name || instance.templateId}
                </span>
                <Badge 
                  variant={
                    instance.status === 'completed' ? 'default' :
                    instance.status === 'failed' ? 'destructive' :
                    'secondary'
                  }
                  className="text-xs h-4 px-1"
                >
                  {instance.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};