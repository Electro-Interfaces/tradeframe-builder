/**
 * Хук для управления изменением пароля пользователя администратором
 */

import { useState, useCallback } from 'react';
import { User as UserType } from '@/types/auth';
import { externalUsersService } from '@/services/externalUsersService';
import { useToast } from '@/hooks/use-toast';

interface UsePasswordChangeReturn {
  isOpen: boolean;
  userToChange: UserType | null;
  isLoading: boolean;
  openChangeDialog: (user: UserType) => void;
  closeChangeDialog: () => void;
  confirmChange: (newPassword: string) => Promise<void>;
}

export function usePasswordChange(): UsePasswordChangeReturn {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [userToChange, setUserToChange] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openChangeDialog = useCallback((user: UserType) => {
    setUserToChange(user);
    setIsOpen(true);
  }, []);

  const closeChangeDialog = useCallback(() => {
    setIsOpen(false);
    setUserToChange(null);
  }, []);

  const confirmChange = useCallback(async (newPassword: string): Promise<void> => {
    if (!userToChange) return;

    setIsLoading(true);
    try {
      await externalUsersService.changePassword(userToChange.id, newPassword);

      toast({
        title: "Пароль изменен",
        description: `Новый пароль для пользователя ${userToChange.name} успешно установлен`
      });

      closeChangeDialog();
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось изменить пароль. Попробуйте еще раз.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userToChange, toast, closeChangeDialog]);

  return {
    isOpen,
    userToChange,
    isLoading,
    openChangeDialog,
    closeChangeDialog,
    confirmChange
  };
}
