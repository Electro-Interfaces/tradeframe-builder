/**
 * Страница управления пользователями (отрефакторенная версия)
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users as UsersIcon, Search, Trash2 } from 'lucide-react';
import { UserStatus } from '@/types/auth';
import { externalUsersService } from '@/services/externalUsersService';
import { externalRolesService } from '@/services/externalRolesService';
import { UserFormDialog } from '@/components/admin/users/UserFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIsMobile } from "@/hooks/use-mobile";
import { HelpButton } from "@/components/help/HelpButton";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { useToast } from '@/hooks/use-toast';

// Импорты рефакторенных компонентов и хуков
import { useUserDialogs } from './hooks/useUserDialogs';
import { UsersTable } from './components/UsersTable';
import { UsersCards } from './components/UsersCards';

export default function Users() {
  const { toast } = useToast();
  const { user } = useNewAuth();
  const isMobile = useIsMobile();

  // State для фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  // React Query для данных
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['external-users'],
    queryFn: () => externalUsersService.getUsersWithRoles(),
    retry: 1,
    retryDelay: 1000
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['external-roles'],
    queryFn: () => externalRolesService.getAllRoles(),
    retry: 1,
    retryDelay: 1000
  });

  // Кастомные хуки для управления состоянием
  const dialogsState = useUserDialogs();

  // Фильтрация пользователей
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  // Handlers
  const handleUserSaved = () => {
    dialogsState.closeEditDialog();
    refetch();
  };

  const handleDelete = async () => {
    if (!dialogsState.deleteDialog.user) return;

    try {
      await externalUsersService.deleteUser(dialogsState.deleteDialog.user.id);
      toast({
        title: "Успешно",
        description: "Пользователь удален"
      });
      await refetch();
      dialogsState.closeDeleteDialog();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive"
      });
    }
  };

  const handleCleanupDeletedUsers = async () => {
    const confirmed = window.confirm(
      'Вы уверены, что хотите физически удалить всех помеченных к удалению пользователей?\n\n' +
      'Это действие нельзя отменить. Пользователи будут удалены из базы данных навсегда.'
    );

    if (!confirmed) return;

    try {
      const result = await externalUsersService.permanentlyDeleteAllSoftDeletedUsers();

      if (result && result.deletedCount > 0) {
        toast({
          title: "Успешно",
          description: `Удалено ${result.deletedCount} пользователей из базы данных`
        });
        await refetch();
      } else {
        toast({
          title: "Информация",
          description: "Помеченные к удалению пользователи не найдены"
        });
      }
    } catch (error) {
      console.error('Error cleanup deleted users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось очистить удаленных пользователей",
        variant: "destructive"
      });
    }
  };

  // Проверка прав администратора
  const isAdmin = user?.role === 'super_admin' ||
                  user?.role === 'system_admin' ||
                  user?.role === 'network_admin';

  return (
    <MainLayout>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
            <HelpButton route="/admin/users-and-roles" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <UsersIcon className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Пользователи</h2>
                <div className="text-sm text-slate-400">
                  Всего: {filteredUsers.length} из {users.length}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={dialogsState.openCreateDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Новый пользователь
                </Button>
                {isAdmin && (
                  <Button
                    onClick={handleCleanupDeletedUsers}
                    variant="outline"
                    className="bg-red-600/10 border-red-500 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                    title="Физически удалить всех помеченных к удалению пользователей"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Очистить удаленных
                  </Button>
                )}
              </div>
            </div>

            {/* Фильтры */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Поиск пользователей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Таблица/Карточки пользователей */}
        {filteredUsers.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchTerm || statusFilter !== "all" ? 'Пользователи не найдены' : 'Нет пользователей'}
            </h3>
            <p className="text-slate-400">
              {searchTerm || statusFilter !== "all"
                ? 'Попробуйте изменить критерии поиска'
                : 'Создайте первого пользователя системы'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Desktop таблица */}
            <div className="hidden md:block">
              <UsersTable
                users={filteredUsers}
                isLoading={isLoading}
                onEdit={dialogsState.openEditDialog}
                onDelete={dialogsState.openDeleteDialog}
              />
            </div>

            {/* Mobile карточки */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Загрузка...</div>
              ) : (
                <UsersCards
                  users={filteredUsers}
                  onEdit={dialogsState.openEditDialog}
                  onDelete={dialogsState.openDeleteDialog}
                />
              )}
            </div>
          </>
        )}

        {/* Диалоги */}
        <UserFormDialog
          open={dialogsState.editDialog.open}
          onOpenChange={dialogsState.closeEditDialog}
          user={dialogsState.editDialog.user}
          roles={roles}
          onSaved={handleUserSaved}
        />

        <ConfirmDialog
          open={dialogsState.deleteDialog.open}
          onOpenChange={dialogsState.closeDeleteDialog}
          title="Подтвердите удаление"
          description={`Вы действительно хотите удалить пользователя "${dialogsState.deleteDialog.user?.name}"?`}
          onConfirm={handleDelete}
          confirmText="Удалить"
          variant="destructive"
        />

      </div>
    </MainLayout>
  );
}
