import { useState, useCallback } from 'react';
import { User as UserType } from '@/types/auth';
import { externalUsersService } from '@/services/externalUsersService';
import { useToast } from '@/hooks/use-toast';
import { generateTemporaryPassword } from '../utils/passwordGenerator';

interface UsePasswordResetReturn {
  isOpen: boolean;
  userToReset: UserType | null;
  isLoading: boolean;
  openResetDialog: (user: UserType) => void;
  closeResetDialog: () => void;
  confirmReset: () => Promise<string | null>;
}

export function usePasswordReset(): UsePasswordResetReturn {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const openResetDialog = useCallback((user: UserType) => {
    setUserToReset(user);
    setIsOpen(true);
  }, []);

  const closeResetDialog = useCallback(() => {
    setIsOpen(false);
    setUserToReset(null);
  }, []);

  const confirmReset = useCallback(async (): Promise<string | null> => {
    if (!userToReset) return null;

    setIsLoading(true);
    try {
      // Генерируем временный пароль
      const tempPassword = generateTemporaryPassword();

      await externalUsersService.changePassword(userToReset.id, tempPassword);

      toast({
        title: "Пароль сброшен",
        description: `Новый пароль для пользователя ${userToReset.name} успешно установлен`
      });

      closeResetDialog();
      return tempPassword;
    } catch (error) {
      console.error('Failed to reset password:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сбросить пароль. Попробуйте еще раз.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userToReset, toast, closeResetDialog]);

  return {
    isOpen,
    userToReset,
    isLoading,
    openResetDialog,
    closeResetDialog,
    confirmReset
  };
}
