import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  Save, 
  Search, 
  Settings, 
  Activity, 
  Clock, 
  RefreshCw, 
  Power, 
  Shield, 
  Download, 
  Play,
  Loader2
} from "lucide-react";
import { Equipment } from '@/types/equipment';
import { NewCommandTemplate } from '@/types/connections';
import { currentNewTemplatesAPI } from '@/services/newConnectionsService';
import { currentEquipmentAPI } from '@/services/equipment';

interface EquipmentCommandsEditorProps {
  open: boolean;
  onClose: () => void;
  equipment?: Equipment;
  onSave?: () => void;
}

// Маппинг иконок для API шаблонов по методам и названиям
const getCommandIcon = (template: NewCommandTemplate): React.ComponentType<{ className?: string }> => {
  // Сначала пытаемся по template_id
  const iconByTemplateId: Record<string, React.ComponentType<{ className?: string }>> = {
    'autooplata_login': Shield,
    'autooplata_get_prices': Download,
    'autooplata_set_prices': Play,
    'autooplata_get_services': Activity,
    'autooplata_equipment_status': Activity,
    'autooplata_equipment_status_extended': Activity,
    'autooplata_restart_terminal': RefreshCw,
    'network_daily_report': Download,
    'trading_point_sync': Clock,
    'component_diagnostics': Settings,
    'payment_notification': Shield
  };
  
  if (iconByTemplateId[template.template_id]) {
    return iconByTemplateId[template.template_id];
  }
  
  // Затем по HTTP методу
  const iconByMethod: Record<string, React.ComponentType<{ className?: string }>> = {
    'GET': Download,
    'POST': Play,
    'PUT': RefreshCw,
    'PATCH': Settings,
    'DELETE': Power
  };
  
  return iconByMethod[template.method] || Settings;
};

// Маппинг scope на русские названия для API шаблонов
const scopeLabels: Record<string, string> = {
  'network': 'Сеть',
  'trading_point': 'Торговая точка',
  'equipment': 'Оборудование',
  'component': 'Компонент'
};

export const EquipmentCommandsEditor: React.FC<EquipmentCommandsEditorProps> = ({
  open,
  onClose,
  equipment,
  onSave
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<NewCommandTemplate[]>([]);
  const [selectedCommandIds, setSelectedCommandIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Загружаем доступные шаблоны команд
  const loadAvailableTemplates = async () => {
    try {
      setLoading(true);
      const response = await currentNewTemplatesAPI.list({
        status: 'active',
        limit: 100
      });
      
      // Фильтруем шаблоны API команд, подходящие для оборудования
      const equipmentTemplates = response.data.filter(template => 
        template.scope === 'equipment' ||
        template.scope === 'trading_point' ||
        template.scope === 'network'
      );
      
      setAvailableTemplates(equipmentTemplates);
    } catch (error) {
      console.error('Error loading command templates:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить шаблоны команд",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Инициализация при открытии диалога
  useEffect(() => {
    if (open) {
      loadAvailableTemplates();
      setSelectedCommandIds(equipment?.availableCommandIds || []);
      setSearchTerm('');
    }
  }, [open, equipment]);

  // Сохранение изменений
  const handleSave = async () => {
    if (!equipment) return;

    try {
      setSaving(true);
      
      await currentEquipmentAPI.update(equipment.id, {
        availableCommandIds: selectedCommandIds
      });

      toast({
        title: "Сохранено",
        description: `Привязка команд для "${equipment.display_name}" обновлена`
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving equipment commands:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Переключение выбора команды
  const toggleCommand = (templateId: string, checked: boolean) => {
    if (checked) {
      setSelectedCommandIds(prev => [...prev, templateId]);
    } else {
      setSelectedCommandIds(prev => prev.filter(id => id !== templateId));
    }
  };

  // Фильтрация шаблонов по поиску
  const filteredTemplates = availableTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.template_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Группировка по scope (область применения)
  const groupedTemplates = filteredTemplates.reduce((groups, template) => {
    const scope = template.scope;
    if (!groups[scope]) {
      groups[scope] = [];
    }
    groups[scope].push(template);
    return groups;
  }, {} as Record<string, NewCommandTemplate[]>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Редактирование команд оборудования
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {equipment?.display_name} • Выберите команды, которые будут доступны для этого оборудования
          </p>
        </DialogHeader>

        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск команд..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Счетчик выбранных команд */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Выбрано команд: {selectedCommandIds.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCommandIds(filteredTemplates.map(t => t.template_id))}
              disabled={loading}
            >
              Выбрать все
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCommandIds([])}
              disabled={loading}
            >
              Очистить
            </Button>
          </div>
        </div>

        {/* Список команд */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Загрузка команд...</span>
          </div>
        ) : Object.keys(groupedTemplates).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Команды не найдены по вашему запросу' : 'Доступные команды не найдены'}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([scope, templates]) => (
              <Card key={scope}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {scopeLabels[scope] || scope}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templates.map((template) => {
                      const isSelected = selectedCommandIds.includes(template.template_id) || selectedCommandIds.includes(template.id);
                      const IconComponent = getCommandIcon(template);
                      
                      return (
                        <div 
                          key={template.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                          onClick={() => toggleCommand(template.template_id, !isSelected)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleCommand(template.template_id, !!checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-muted-foreground" />
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="outline" className="text-xs">{template.method}</Badge>
                              {template.mode && (
                                <Badge variant="secondary" className="text-xs">{template.mode}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Endpoint: {template.endpoint}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Кнопки управления */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};