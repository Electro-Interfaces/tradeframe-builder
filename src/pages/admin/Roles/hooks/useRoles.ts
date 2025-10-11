import { useState, useEffect, useCallback } from 'react';
import { externalRolesService } from '@/services/externalRolesService';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/types/auth';
import { PREDEFINED_ROLES } from '../utils/predefinedRoles';

interface UseRolesReturn {
  roles: Role[];
  loading: boolean;
  loadRoles: () => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  createPredefinedRoles: () => Promise<void>;
}

/**
 * Хук для управления ролями
 */
export function useRoles(): UseRolesReturn {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const rolesData = await externalRolesService.getAllRoles();
      setRoles(rolesData);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить роли",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const deleteRole = useCallback(async (roleId: string) => {
    try {
      await externalRolesService.deleteRole(roleId);
      toast({
        title: "Успешно",
        description: "Роль удалена"
      });
      await loadRoles();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить роль",
        variant: "destructive"
      });
      throw error;
    }
  }, [loadRoles, toast]);

  const createPredefinedRoles = useCallback(async () => {
    try {
      let created = 0;
      const errors: string[] = [];

      for (const roleConfig of PREDEFINED_ROLES) {
        try {
          await externalRolesService.createRole(roleConfig);
          created++;
        } catch (error) {
          errors.push(roleConfig.code);
        }
      }

      if (created > 0) {
        toast({
          title: "Успешно",
          description: `Создано ${created} из ${PREDEFINED_ROLES.length} ролей`
        });
        await loadRoles();
      } else {
        toast({
          title: "Информация",
          description: "Роли не созданы. Возможно они уже существуют.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать роли",
        variant: "destructive"
      });
    }
  }, [loadRoles, toast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return {
    roles,
    loading,
    loadRoles,
    deleteRole,
    createPredefinedRoles
  };
}
