import { useState, useEffect } from 'react';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { hasPermission, hasRole } from '@/services/auth/permissionService';

// Типы состояний компонентов
export type ComponentState = 'loading' | 'ready' | 'error' | 'unauthorized' | 'disabled';

// Интерфейс для описания состояния компонента
export interface ComponentStateInfo {
  state: ComponentState;
  message?: string;
  canInteract: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

// Конфигурация для различных компонентов
interface ComponentConfig {
  requiredPermissions?: string[];
  requiredRoles?: string[];
  readOnlyPermissions?: string[];
  adminOnly?: boolean;
}

export function useComponentState(
  componentName: string,
  config: ComponentConfig = {}
): ComponentStateInfo {
  const { user } = useNewAuth();
  const [state, setState] = useState<ComponentState>('loading');
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!user) {
      setState('unauthorized');
      setMessage('Пользователь не авторизован');
      return;
    }

    // Проверка административных прав
    if (config.adminOnly && !hasRole(user, 'super_admin') && !hasRole(user, 'network_admin')) {
      setState('unauthorized');
      setMessage('Недостаточно прав доступа');
      return;
    }

    // Проверка обязательных разрешений
    if (config.requiredPermissions?.length) {
      const hasRequiredPermissions = config.requiredPermissions.every(permission =>
        hasPermission(user, permission)
      );

      if (!hasRequiredPermissions) {
        setState('unauthorized');
        setMessage('Недостаточно разрешений');
        return;
      }
    }

    // Проверка обязательных ролей
    if (config.requiredRoles?.length) {
      const hasRequiredRoles = config.requiredRoles.some(role => hasRole(user, role));

      if (!hasRequiredRoles) {
        setState('unauthorized');
        setMessage('Недостаточно прав доступа');
        return;
      }
    }

    setState('ready');
    setMessage(undefined);
  }, [user, config]);

  // Вычисляем права доступа
  const canView = state === 'ready' || (
    config.readOnlyPermissions?.some(permission => hasPermission(user, permission)) ?? false
  );

  const canEdit = state === 'ready' && (
    hasPermission(user, 'all') ||
    config.requiredPermissions?.some(permission => hasPermission(user, permission)) ||
    hasRole(user, 'super_admin') ||
    hasRole(user, 'network_admin')
  );

  const canDelete = canEdit && (
    hasPermission(user, 'all') ||
    hasRole(user, 'super_admin') ||
    hasRole(user, 'network_admin')
  );

  const canCreate = canEdit;
  
  const canInteract = state === 'ready' && canView;

  return {
    state,
    message,
    canInteract,
    canView,
    canEdit,
    canDelete,
    canCreate
  };
}

// Предопределенные конфигурации для различных компонентов
export const COMPONENT_CONFIGS = {
  tanks: {
    requiredPermissions: ['tanks.view'],
    readOnlyPermissions: ['tanks.view', 'reports.view']
  },
  tanksCalibration: {
    requiredPermissions: ['calibration.perform', 'tanks.calibrate'],
    requiredRoles: ['network_admin', 'point_manager']
  },
  tanksSettings: {
    requiredPermissions: ['tanks.manage', 'tanks.settings'],
    requiredRoles: ['network_admin', 'point_manager']
  },
  drainsApproval: {
    requiredPermissions: ['drains.approve'],
    requiredRoles: ['network_admin', 'point_manager']
  },
  prices: {
    requiredPermissions: ['prices.view'],
    readOnlyPermissions: ['prices.view', 'reports.view']
  },
  pricesManagement: {
    requiredPermissions: ['prices.manage', 'prices.edit'],
    requiredRoles: ['network_admin', 'point_manager']
  },
  userManagement: {
    requiredPermissions: ['users.manage'],
    requiredRoles: ['network_admin'],
    adminOnly: true
  },
  auditLog: {
    requiredPermissions: ['audit.view'],
    requiredRoles: ['network_admin', 'point_manager']
  },
  workflows: {
    requiredPermissions: ['workflows.manage'],
    requiredRoles: ['network_admin'],
    adminOnly: true
  }
} as const;

// Хелпер для быстрого получения состояния предопределенного компонента
export function usePreDefinedComponentState(componentName: keyof typeof COMPONENT_CONFIGS) {
  return useComponentState(componentName, COMPONENT_CONFIGS[componentName]);
}