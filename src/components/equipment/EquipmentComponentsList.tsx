import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CircleCheck, XCircle, Power, Archive, Layers3, Edit, Trash2 } from 'lucide-react';
import { currentComponentsAPI } from '@/services/components';
import { Component, ComponentStatus } from '@/types/component';
import { cn } from '@/lib/utils';

interface EquipmentComponentsListProps {
  equipmentId: string;
  onEditComponent?: (component: Component) => void;
  onDeleteComponent?: (component: Component) => void;
}

const getStatusConfig = (status: ComponentStatus) => {
  switch (status) {
    case 'online':
      return {
        icon: CircleCheck,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        badgeColor: 'bg-green-500/20 text-green-400',
        text: 'Работает'
      };
    case 'error':
      return {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        badgeColor: 'bg-red-500/20 text-red-400',
        text: 'Ошибка'
      };
    case 'offline':
      return {
        icon: AlertCircle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        badgeColor: 'bg-yellow-500/20 text-yellow-400',
        text: 'Офлайн'
      };
    case 'disabled':
      return {
        icon: Power,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeColor: 'bg-gray-500/20 text-gray-400',
        text: 'Отключен'
      };
    case 'archived':
      return {
        icon: Archive,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-500/20 text-blue-400',
        text: 'Архив'
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        badgeColor: 'bg-gray-500/20 text-gray-400',
        text: 'Неизвестно'
      };
  }
};

export const EquipmentComponentsList: React.FC<EquipmentComponentsListProps> = ({ 
  equipmentId,
  onEditComponent,
  onDeleteComponent
}) => {
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await currentComponentsAPI.list({ 
          equipment_id: equipmentId 
        });
        
        setComponents(response.data);
      } catch (err) {
        console.error('Failed to load components for equipment:', equipmentId, err);
        setError('Не удалось загрузить компоненты');
      } finally {
        setLoading(false);
      }
    };

    if (equipmentId) {
      loadComponents();
    }
  }, [equipmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-slate-400">Загрузка компонентов...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Layers3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            У этого оборудования нет компонентов
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-white font-medium mb-4">
        Компоненты ({components.length})
      </h4>
      
      <div className="grid gap-3">
        {components.map((component) => {
          const config = getStatusConfig(component.status);
          const Icon = config.icon;
          
          return (
            <div
              key={component.id}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "rounded-full border-2 p-1.5 flex-shrink-0",
                  "bg-slate-700 border-slate-600"
                )}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium text-white truncate">
                      {component.display_name}
                    </h5>
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs", config.badgeColor)}
                    >
                      {config.text}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{component.system_type}</span>
                    {component.serial_number && (
                      <span>S/N: {component.serial_number}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {onEditComponent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditComponent(component);
                    }}
                    title="Редактировать компонент"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {onDeleteComponent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteComponent(component);
                    }}
                    title="Удалить компонент"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EquipmentComponentsList;