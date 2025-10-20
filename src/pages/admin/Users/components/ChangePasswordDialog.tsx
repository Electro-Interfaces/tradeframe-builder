/**
 * Диалог для изменения пароля пользователя администратором
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserType } from '@/types/auth';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType | null;
  onConfirm: (newPassword: string) => Promise<void>;
  isLoading: boolean;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading
}: ChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация
    if (!newPassword || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      await onConfirm(newPassword);
      // Очищаем форму при успешном изменении
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    } catch (err) {
      setError('Не удалось изменить пароль');
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <KeyRound className="w-5 h-5 text-yellow-500" />
            Изменить пароль
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Информация о пользователе */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-md p-3">
              <p className="text-sm text-slate-400">Пользователь:</p>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>

            {/* Новый пароль */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300">
                Новый пароль
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  className="bg-slate-900 border-slate-700 text-white pr-10"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Подтверждение пароля */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Подтвердите пароль
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                className="bg-slate-900 border-slate-700 text-white"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {/* Сообщение об ошибке */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Информация */}
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-md p-3">
              <p className="text-xs text-blue-400">
                Пароль должен содержать минимум 6 символов. После изменения пароля пользователю необходимо войти с новым паролем.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="border-slate-600 hover:bg-slate-700"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !newPassword || !confirmPassword}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Изменение...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Изменить пароль
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
