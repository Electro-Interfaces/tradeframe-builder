/**
 * Страница управления пользователями
 */

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Users as UsersIcon, Search, Trash2 } from 'lucide-react'
import { User as UserType, UserStatus } from '@/types/auth'
import { adminUsersService } from '@/services/adminUsersService'
import { adminRolesService } from '@/services/adminRolesService'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'
import { useDeleteConfirmDialog } from '@/hooks/useDeleteConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MainLayout } from '@/components/layout/MainLayout'
import { useIsMobile } from "@/hooks/use-mobile";
import { HelpButton } from "@/components/help/HelpButton"
import { DataSourceIndicator, DataSourceInfo, useDataSourceInfo } from '@/components/data-source/DataSourceIndicator'
import { useNewAuth } from "@/contexts/NewAuthContext";
import { UsersTable } from './Users/components/UsersTable';
import { UsersCards } from './Users/components/UsersCards';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

export default function Users() {
  const { hasExternalDatabase } = useDataSourceInfo()
  const { user } = useNewAuth()
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [userToResetPassword, setUserToResetPassword] = useState<UserType | null>(null)

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['external-users'],
    queryFn: () => adminUsersService.getUsersWithRoles(),
    retry: 1,
    retryDelay: 1000
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['external-roles'],
    queryFn: () => adminRolesService.getAllRoles(),
    retry: 1,
    retryDelay: 1000
  })

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  const handleEdit = (user: UserType) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: string) => {
    try {
      await adminUsersService.deleteUser(userId)
      await refetch()
    } catch (error) {
      // Ошибка обработана в сервисе
    }
  }

  const handleResetPassword = (user: UserType) => {
    setUserToResetPassword(user)
    setIsResetPasswordOpen(true)
  }

  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return

    try {
      // Генерируем временный пароль
      const tempPassword = generateTemporaryPassword()
      await adminUsersService.changePassword(userToResetPassword.id, tempPassword)

      // Показываем пароль администратору
      alert(`Пароль для пользователя ${userToResetPassword.name} сброшен.\n\nНовый временный пароль: ${tempPassword}\n\nПожалуйста, передайте этот пароль пользователю безопасным способом.`)

      setIsResetPasswordOpen(false)
      setUserToResetPassword(null)
    } catch (error) {
      // Ошибка обработана в сервисе
      alert('Ошибка при сбросе пароля. Попробуйте еще раз.')
    }
  }

  const generateTemporaryPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleCleanupDeletedUsers = async () => {
    const confirmed = window.confirm(
      'Вы уверены, что хотите физически удалить всех помеченных к удалению пользователей?\n\n' +
      'Это действие нельзя отменить. Пользователи будут удалены из базы данных навсегда.'
    )

    if (!confirmed) return

    try {
      const result = await adminUsersService.permanentlyDeleteAllSoftDeletedUsers()

      if (result && result.deletedCount > 0) {
        alert(`✅ Успешно удалено ${result.deletedCount} пользователей из базы данных.`)
        await refetch()
      } else {
        alert('ℹ️ Помеченные к удалению пользователи не найдены.')
      }
    } catch (error) {
      const errorMessage = error?.message || 'Неизвестная ошибка'
      alert(`❌ Ошибка при очистке удаленных пользователей:\n\n${errorMessage}`)
    }
  }

  const confirmDelete = useDeleteConfirmDialog(handleDelete)

  const handleUserSaved = () => {
    setIsDialogOpen(false)
    setSelectedUser(null)
    refetch()
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Пользователи</h1>
              <p className="text-muted-foreground mt-2">
                Управление учетными записями пользователей системы
              </p>
              <div className="mt-3">
                <DataSourceIndicator 
                  sources={[
                    { 
                      type: 'external-database', 
                      label: 'Внешняя БД', 
                      description: 'Внешняя база данных пользователей',
                      connected: hasExternalDatabase,
                      count: users?.length || 0
                    }
                  ] as DataSourceInfo[]} 
                />
              </div>
            </div>
            <HelpButton route="/admin/users-and-roles" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Панель управления */}
        <div className={`${FILTER_PANEL_CLASS} mb-6`}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
              <span className="text-sm text-muted-foreground">
                Всего: {formatInteger(filteredUsers.length)} из {formatInteger(users.length)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleCreate}
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Новый пользователь</span>
                <span className="sm:hidden">Новый</span>
              </Button>
              {(user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'network_admin' || user?.email?.includes('admin')) && (
                <Button
                  onClick={handleCleanupDeletedUsers}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial text-red-700 border-red-200 bg-red-50 dark:text-red-300 dark:border-red-900/60 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60"
                  title="Физически удалить всех помеченных к удалению пользователей"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Очистить удаленных</span>
                  <span className="sm:hidden">Очистить</span>
                </Button>
              )}
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label htmlFor="users-search" className="text-xs text-muted-foreground">
                Поиск
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="users-search"
                  placeholder="Имя или email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${FILTER_PANEL_CONTROL_CLASS} pl-10`}
                />
              </div>
            </div>
            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="users-status" className="text-xs text-muted-foreground">
                Статус
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="users-status" className={FILTER_PANEL_CONTROL_CLASS}>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Список пользователей */}
        {filteredUsers.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <EmptyState
                className="py-16"
                title={searchTerm || statusFilter !== "all" ? 'Пользователи не найдены' : 'Нет пользователей'}
                description={searchTerm || statusFilter !== "all"
                  ? 'Попробуйте изменить критерии поиска'
                  : 'Создайте первого пользователя системы'}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="p-0">
            {/* Desktop таблица */}
            <div className="hidden md:block">
              <UsersTable
                users={filteredUsers}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={(user) => confirmDelete.openDialog(user.id, `пользователя "${user.name}"`)}
                onResetPassword={handleResetPassword}
              />
            </div>

            {/* Mobile карточки */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
              ) : (
                <UsersCards
                  users={filteredUsers}
                  onEdit={handleEdit}
                  onDelete={(user) => confirmDelete.openDialog(user.id, `пользователя "${user.name}"`)}
                  onResetPassword={handleResetPassword}
                />
              )}
            </div>
            </CardContent>
          </Card>
        )}

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={selectedUser}
        roles={roles}
        onSaved={handleUserSaved}
      />

      <ConfirmDialog
        open={confirmDelete.isOpen}
        onOpenChange={confirmDelete.closeDialog}
        title="Подтвердите удаление"
        description={confirmDelete.message}
        onConfirm={confirmDelete.confirm}
        confirmText="Удалить"
        variant="destructive"
      />

      <ConfirmDialog
        open={isResetPasswordOpen}
        onOpenChange={(open) => {
          setIsResetPasswordOpen(open)
          if (!open) setUserToResetPassword(null)
        }}
        title="Сброс пароля"
        description={
          userToResetPassword 
            ? `Вы действительно хотите сбросить пароль для пользователя "${userToResetPassword.name}"?\n\nБудет сгенерирован новый временный пароль, который нужно будет передать пользователю.`
            : ''
        }
        onConfirm={handleResetPasswordConfirm}
        confirmText="Сбросить пароль"
        variant="default"
      />
      </div>
    </MainLayout>
  )
}
