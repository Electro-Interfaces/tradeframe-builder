/**
 * Страница управления ролями (отрефакторенная версия)
 */

import { useState, useMemo } from 'react';
import { Plus, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { useIsMobile } from "@/hooks/use-mobile";
import { HelpButton } from "@/components/help/HelpButton";
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog';
import { PermissionBuilder } from '@/components/admin/roles/PermissionBuilder';
import { PredefinedRolesCreator } from '@/components/admin/roles/PredefinedRolesCreator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Импорты рефакторенных компонентов и хуков
import { useRoles } from './hooks/useRoles';
import { useRoleDialogs } from './hooks/useRoleDialogs';
import { RolesTable } from './components/RolesTable';
import { RolesCards } from './components/RolesCards';

export default function RolesPage() {
  const isMobile = useIsMobile();

  // State для фильтров и вкладок
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('roles');

  // Кастомные хуки
  const rolesState = useRoles();
  const dialogsState = useRoleDialogs();

  // Фильтрация ролей с использованием useMemo
  const filteredRoles = useMemo(() => {
    return rolesState.roles.filter(role => {
      const matchesSearch = searchTerm === '' ||
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesScope = scopeFilter === 'all' || role.scope === scopeFilter;

      return matchesSearch && matchesScope;
    });
  }, [rolesState.roles, searchTerm, scopeFilter]);

  // Handlers
  const handleRoleSaved = () => {
    dialogsState.closeEditDialog();
    rolesState.loadRoles();
  };

  const handleDeleteConfirm = async () => {
    if (!dialogsState.deleteDialog.role) return;

    try {
      await rolesState.deleteRole(dialogsState.deleteDialog.role.id);
      dialogsState.closeDeleteDialog();
    } catch (error) {
      // Ошибка уже обработана в хуке
    }
  };

  if (rolesState.loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Загрузка данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Роли системы</h1>
            <HelpButton route="/admin/roles" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-card mb-6 rounded-lg border border-border">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Роли системы</h2>
                  <div className="text-sm text-muted-foreground">
                    Всего: {filteredRoles.length} из {rolesState.roles.length}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={dialogsState.openCreateDialog}
                  className="bg-primary hover:bg-primary/80 text-white flex-1 sm:flex-initial"
                  size="sm"
                  disabled={rolesState.loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Создать роль</span>
                  <span className="sm:hidden">Создать</span>
                </Button>
                <Button
                  onClick={rolesState.createPredefinedRoles}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                  size="sm"
                  disabled={rolesState.loading}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Создать базовые роли</span>
                  <span className="sm:hidden">Базовые</span>
                </Button>
              </div>
            </div>

            {/* Фильтры */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск ролей по названию или описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground pl-10"
                />
              </div>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="bg-secondary border-border text-foreground w-full md:w-48">
                  <SelectValue placeholder="Все области" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все области</SelectItem>
                  <SelectItem value="global">Глобальная</SelectItem>
                  <SelectItem value="network">Сеть</SelectItem>
                  <SelectItem value="trading_point">Торговая точка</SelectItem>
                  <SelectItem value="assigned">Назначенная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roles">Роли</TabsTrigger>
            <TabsTrigger value="setup">Быстрая настройка</TabsTrigger>
            <TabsTrigger value="permissions">Конструктор разрешений</TabsTrigger>
          </TabsList>

          {/* Список ролей */}
          <TabsContent value="roles" className="mt-6">
            {filteredRoles.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm || scopeFilter !== 'all' ? 'Роли не найдены' : 'Нет ролей'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || scopeFilter !== 'all'
                    ? 'Попробуйте изменить критерии поиска'
                    : 'Создайте первую роль для управления доступом пользователей'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Desktop таблица */}
                <div className="hidden md:block">
                  <RolesTable
                    roles={filteredRoles}
                    isLoading={rolesState.loading}
                    onEdit={dialogsState.openEditDialog}
                    onDelete={dialogsState.openDeleteDialog}
                  />
                </div>

                {/* Mobile карточки */}
                <div className="md:hidden">
                  {rolesState.loading ? (
                    <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                  ) : (
                    <RolesCards
                      roles={filteredRoles}
                      onEdit={dialogsState.openEditDialog}
                      onDelete={dialogsState.openDeleteDialog}
                    />
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* Быстрая настройка ролей */}
          <TabsContent value="setup" className="mt-6">
            <PredefinedRolesCreator onRolesCreated={rolesState.loadRoles} />
          </TabsContent>

          {/* Конструктор разрешений */}
          <TabsContent value="permissions" className="mt-6">
            <PermissionBuilder />
          </TabsContent>
        </Tabs>

        {/* Диалоги */}
        <RoleFormDialog
          open={dialogsState.editDialog.open}
          onOpenChange={dialogsState.closeEditDialog}
          role={dialogsState.editDialog.role}
          onSaved={handleRoleSaved}
        />

        <ConfirmDialog
          open={dialogsState.deleteDialog.open}
          onOpenChange={dialogsState.closeDeleteDialog}
          title="Подтвердите удаление"
          description={`Вы действительно хотите удалить роль "${dialogsState.deleteDialog.role?.name}"?`}
          onConfirm={handleDeleteConfirm}
          confirmText="Удалить"
          variant="destructive"
        />
      </div>
    </MainLayout>
  );
}
