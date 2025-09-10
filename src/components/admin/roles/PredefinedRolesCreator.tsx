/**
 * Компонент для создания предустановленных ролей системы
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2, Shield, Users, Network, Settings, Eye } from 'lucide-react';
import { externalRolesService } from '@/services/externalRolesService';
import { Permission, CreateRoleInput } from '@/types/auth';

interface PredefinedRole {
  code: string;
  name: string;
  description: string;
  scope: 'global' | 'network' | 'trading_point';
  icon: React.ComponentType<any>;
  permissions: Permission[];
}

interface RoleCreationStatus {
  role: PredefinedRole;
  status: 'pending' | 'creating' | 'success' | 'error';
  error?: string;
}

const PREDEFINED_ROLES: PredefinedRole[] = [
  {
    code: 'super_admin',
    name: 'Суперадминистратор',
    description: 'Полный доступ ко всем функциям системы, включая управление пользователями и системными настройками',
    scope: 'global',
    icon: Shield,
    permissions: [
      { section: '*', resource: '*', actions: ['read', 'write', 'delete', 'manage', 'view_menu'] }
    ]
  },
  {
    code: 'network_admin',
    name: 'Администратор сети',
    description: 'Управление конкретной торговой сетью, её точками, пользователями и операциями',
    scope: 'network',
    icon: Network,
    permissions: [
      { section: 'network', resource: '*', actions: ['read', 'write', 'delete', 'manage', 'view_menu'] },
      { section: 'point', resource: '*', actions: ['read', 'write', 'manage', 'view_menu'] },
      { section: 'admin', resource: 'users', actions: ['read', 'write', 'view_menu'] },
      { section: 'admin', resource: 'roles', actions: ['read', 'view_menu'] },
      { section: 'settings', resource: 'nomenclature', actions: ['read', 'write', 'view_menu'] },
      { section: 'settings', resource: 'equipment-types', actions: ['read', 'view_menu'] },
      { section: 'settings', resource: 'component-types', actions: ['read', 'view_menu'] }
    ]
  },
  {
    code: 'manager',
    name: 'Менеджер',
    description: 'Управление операционной деятельностью торговых точек, мониторинг и отчетность',
    scope: 'trading_point',
    icon: Users,
    permissions: [
      { section: 'network', resource: 'overview', actions: ['read', 'view_menu'] },
      { section: 'network', resource: 'operations-transactions', actions: ['read', 'write', 'view_menu'] },
      { section: 'network', resource: 'price-history', actions: ['read', 'view_menu'] },
      { section: 'network', resource: 'fuel-stocks', actions: ['read', 'view_menu'] },
      { section: 'point', resource: 'prices', actions: ['read', 'write', 'view_menu'] },
      { section: 'point', resource: 'tanks', actions: ['read', 'write', 'view_menu'] },
      { section: 'point', resource: 'equipment', actions: ['read', 'view_menu'] },
      { section: 'point', resource: 'shift-reports', actions: ['read', 'write', 'view_menu'] },
      { section: 'misc', resource: '*', actions: ['read', 'view_menu'] }
    ]
  },
  {
    code: 'operator',
    name: 'Оператор',
    description: 'Работа с конкретными торговыми точками, управление ценами, остатками и сменными отчетами',
    scope: 'trading_point',
    icon: Settings,
    permissions: [
      { section: 'point', resource: 'prices', actions: ['read', 'write', 'view_menu'] },
      { section: 'point', resource: 'tanks', actions: ['read', 'write', 'view_menu'] },
      { section: 'point', resource: 'equipment', actions: ['read', 'view_menu'] },
      { section: 'point', resource: 'shift-reports', actions: ['read', 'write', 'view_menu'] },
      { section: 'misc', resource: 'price-history', actions: ['read', 'view_menu'] },
      { section: 'misc', resource: 'fuel-stocks', actions: ['read', 'view_menu'] }
    ]
  },
  {
    code: 'viewer',
    name: 'Наблюдатель',
    description: 'Доступ только для просмотра данных без возможности внесения изменений',
    scope: 'global',
    icon: Eye,
    permissions: [
      { section: 'network', resource: '*', actions: ['read', 'view_menu'] },
      { section: 'point', resource: '*', actions: ['read', 'view_menu'] },
      { section: 'misc', resource: '*', actions: ['read', 'view_menu'] }
    ]
  }
];

interface PredefinedRolesCreatorProps {
  onRolesCreated?: () => void;
}

export const PredefinedRolesCreator: React.FC<PredefinedRolesCreatorProps> = ({ onRolesCreated }) => {
  const [roleStatuses, setRoleStatuses] = useState<RoleCreationStatus[]>(
    PREDEFINED_ROLES.map(role => ({ role, status: 'pending' }))
  );
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const createSingleRole = async (roleData: PredefinedRole): Promise<void> => {
    const createInput: CreateRoleInput = {
      code: roleData.code,
      name: roleData.name,
      description: roleData.description,
      scope: roleData.scope,
      permissions: roleData.permissions,
      is_system: true,
      is_active: true
    };

    await externalRolesService.createRole(createInput);
  };

  const handleCreateAllRoles = async () => {
    setIsCreating(true);
    setProgress(0);

    // Сбрасываем статусы
    setRoleStatuses(prev => prev.map(rs => ({ ...rs, status: 'pending', error: undefined })));

    let createdCount = 0;
    const totalRoles = PREDEFINED_ROLES.length;

    for (let i = 0; i < PREDEFINED_ROLES.length; i++) {
      const role = PREDEFINED_ROLES[i];

      // Обновляем статус на "создается"
      setRoleStatuses(prev => prev.map(rs => 
        rs.role.code === role.code ? { ...rs, status: 'creating' } : rs
      ));

      try {
        // Проверяем, не существует ли роль уже
        const existingRole = await externalRolesService.getRoleByCode(role.code);
        
        if (existingRole) {
          // Роль уже существует
          setRoleStatuses(prev => prev.map(rs => 
            rs.role.code === role.code 
              ? { ...rs, status: 'error', error: 'Роль уже существует' } 
              : rs
          ));
        } else {
          // Создаем роль
          await createSingleRole(role);
          setRoleStatuses(prev => prev.map(rs => 
            rs.role.code === role.code ? { ...rs, status: 'success' } : rs
          ));
          createdCount++;
        }
      } catch (error: any) {
        setRoleStatuses(prev => prev.map(rs => 
          rs.role.code === role.code 
            ? { ...rs, status: 'error', error: error.message } 
            : rs
        ));
      }

      // Обновляем прогресс
      setProgress(((i + 1) / totalRoles) * 100);
    }

    setIsCreating(false);

    if (createdCount > 0) {
      toast({
        title: "Роли созданы",
        description: `Успешно создано ${createdCount} из ${totalRoles} ролей`
      });

      if (onRolesCreated) {
        onRolesCreated();
      }
    } else {
      toast({
        title: "Роли не созданы",
        description: "Все роли уже существуют в системе",
        variant: "destructive"
      });
    }
  };

  const handleCreateSingleRole = async (role: PredefinedRole) => {
    // Обновляем статус на "создается"
    setRoleStatuses(prev => prev.map(rs => 
      rs.role.code === role.code ? { ...rs, status: 'creating', error: undefined } : rs
    ));

    try {
      // Проверяем, не существует ли роль уже
      const existingRole = await externalRolesService.getRoleByCode(role.code);
      
      if (existingRole) {
        setRoleStatuses(prev => prev.map(rs => 
          rs.role.code === role.code 
            ? { ...rs, status: 'error', error: 'Роль уже существует' } 
            : rs
        ));
        
        toast({
          title: "Роль существует",
          description: `Роль "${role.name}" уже создана в системе`,
          variant: "destructive"
        });
      } else {
        await createSingleRole(role);
        setRoleStatuses(prev => prev.map(rs => 
          rs.role.code === role.code ? { ...rs, status: 'success' } : rs
        ));

        toast({
          title: "Роль создана",
          description: `Роль "${role.name}" успешно создана`
        });

        if (onRolesCreated) {
          onRolesCreated();
        }
      }
    } catch (error: any) {
      setRoleStatuses(prev => prev.map(rs => 
        rs.role.code === role.code 
          ? { ...rs, status: 'error', error: error.message } 
          : rs
      ));

      toast({
        title: "Ошибка создания роли",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: RoleCreationStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'creating':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusBadge = (status: RoleCreationStatus) => {
    switch (status.status) {
      case 'success':
        return <Badge className="bg-green-600">Создана</Badge>;
      case 'creating':
        return <Badge variant="secondary">Создается...</Badge>;
      case 'error':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Ожидает</Badge>;
    }
  };

  const successCount = roleStatuses.filter(rs => rs.status === 'success').length;
  const errorCount = roleStatuses.filter(rs => rs.status === 'error').length;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="w-5 h-5" />
          Предустановленные роли системы
        </CardTitle>
        <CardDescription className="text-slate-400">
          Быстрое создание стандартных ролей для полнофункциональной работы системы управления доступом
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCreating && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Прогресс создания ролей</span>
              <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-slate-400">
            {successCount > 0 && <span className="text-green-400">✓ Создано: {successCount}</span>}
            {errorCount > 0 && <span className="text-red-400 ml-4">✗ Ошибок: {errorCount}</span>}
          </div>
          <Button 
            onClick={handleCreateAllRoles}
            disabled={isCreating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Создать все роли
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roleStatuses.map((roleStatus) => {
            const { role, status, error } = roleStatus;
            const IconComponent = role.icon;

            return (
              <div
                key={role.code}
                className={`p-4 border rounded-lg transition-all ${
                  status === 'creating' ? 'border-blue-500 bg-blue-950/20' :
                  status === 'success' ? 'border-green-500 bg-green-950/20' :
                  status === 'error' ? 'border-red-500 bg-red-950/20' :
                  'border-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <IconComponent className="w-4 h-4 text-blue-400" />
                      <h3 className="font-semibold text-white truncate">{role.name}</h3>
                      {getStatusBadge(roleStatus)}
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                      {role.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {role.scope === 'global' ? 'Глобальная' :
                         role.scope === 'network' ? 'Сеть' :
                         'Торговая точка'}
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateSingleRole(role)}
                        disabled={isCreating || status === 'creating' || status === 'success'}
                        className="text-xs"
                      >
                        {status === 'creating' ? 'Создается...' :
                         status === 'success' ? 'Создана' :
                         'Создать'}
                      </Button>
                    </div>

                    {error && (
                      <div className="mt-2 text-xs text-red-400 bg-red-950/20 p-2 rounded">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Описание ролей:</h4>
          <div className="text-xs text-slate-400 space-y-1">
            <p>• <strong>Суперадминистратор:</strong> Полный контроль над системой</p>
            <p>• <strong>Администратор сети:</strong> Управление конкретной торговой сетью</p>
            <p>• <strong>Менеджер:</strong> Операционное управление и мониторинг</p>
            <p>• <strong>Оператор:</strong> Работа с торговыми точками</p>
            <p>• <strong>Наблюдатель:</strong> Только просмотр данных</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};