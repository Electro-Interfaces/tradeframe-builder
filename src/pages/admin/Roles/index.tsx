/**
 * Страница управления ролями (отрефакторенная версия)
 */

import { useState, useMemo } from 'react';
import { Plus, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

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
        <div className={`${FILTER_PANEL_CLASS} mb-6`}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
              <span className="text-sm text-muted-foreground">
                Всего: {formatInteger(filteredRoles.length)} из {formatInteger(rolesState.roles.length)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={dialogsState.openCreateDialog}
                variant="outline"
                size="sm"
                disabled={rolesState.loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Создать роль</span>
                <span className="sm:hidden">Создать</span>
              </Button>
              <Button
                onClick={rolesState.createPredefinedRoles}
                variant="outline"
                size="sm"
                disabled={rolesState.loading}
              >
                <Shield className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Создать базовые роли</span>
                <span className="sm:hidden">Базовые</span>
              </Button>
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label htmlFor="roles-search" className="text-xs text-muted-foreground">
                Поиск
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="roles-search"
                  placeholder="Название, описание или код"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${FILTER_PANEL_CONTROL_CLASS} pl-10`}
                />
              </div>
            </div>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="roles-scope" className="text-xs text-muted-foreground">
                Область
              </Label>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger id="roles-scope" className={FILTER_PANEL_CONTROL_CLASS}>
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
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="roles" className="data-[state=active]:bg-primary">Роли</TabsTrigger>
            <TabsTrigger value="setup" className="data-[state=active]:bg-primary">Быстрая настройка</TabsTrigger>
            <TabsTrigger value="permissions" className="data-[state=active]:bg-primary">Конструктор разрешений</TabsTrigger>
          </TabsList>

          {/* Список ролей */}
          <TabsContent value="roles" className="mt-6">
            {filteredRoles.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="p-0">
                  <EmptyState
                    className="py-16"
                    title={searchTerm || scopeFilter !== 'all' ? 'Роли не найдены' : 'Нет ролей'}
                    description={searchTerm || scopeFilter !== 'all'
                      ? 'Попробуйте изменить критерии поиска'
                      : 'Создайте первую роль для управления доступом пользователей'}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="p-0">
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
                      <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
                    ) : (
                      <RolesCards
                        roles={filteredRoles}
                        onEdit={dialogsState.openEditDialog}
                        onDelete={dialogsState.openDeleteDialog}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
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
