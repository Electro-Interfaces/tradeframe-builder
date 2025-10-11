/**
 * Страница управления пользователями
 */

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Users as UsersIcon, Search, Trash2 } from 'lucide-react'
import { User as UserType, UserStatus } from '@/types/auth'
import { externalUsersService } from '@/services/externalUsersService'
import { externalRolesService } from '@/services/externalRolesService'
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
    queryFn: () => externalUsersService.getUsersWithRoles(),
    retry: 1,
    retryDelay: 1000
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['external-roles'],
    queryFn: () => externalRolesService.getAllRoles(),
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
      await externalUsersService.deleteUser(userId)
      await refetch()
    } catch (error) {
      console.error('Failed to delete user:', error)
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
      await externalUsersService.changePassword(userToResetPassword.id, tempPassword)
      
      // Показываем пароль администратору
      alert(`Пароль для пользователя ${userToResetPassword.name} сброшен.\n\nНовый временный пароль: ${tempPassword}\n\nПожалуйста, передайте этот пароль пользователю безопасным способом.`)
      
      setIsResetPasswordOpen(false)
      setUserToResetPassword(null)
    } catch (error) {
      console.error('Failed to reset password:', error)
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
      const result = await externalUsersService.permanentlyDeleteAllSoftDeletedUsers()

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
              <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
              <p className="text-slate-400 mt-2">
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
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <UsersIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Пользователи</h2>
                  <div className="text-sm text-slate-400">
                    Всего: {filteredUsers.length} из {users.length}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Новый пользователь</span>
                  <span className="sm:hidden">Новый</span>
                </Button>
                {/* Кнопка очистки удаленных пользователей - только для администраторов */}
                {(user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'network_admin' || user?.email?.includes('admin')) && (
                  <Button
                    onClick={handleCleanupDeletedUsers}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/10 border-red-500 text-red-400 hover:bg-red-600/20 hover:text-red-300 flex-1 sm:flex-initial"
                    title="Физически удалить всех помеченных к удалению пользователей"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Очистить удаленных</span>
                    <span className="sm:hidden">Очистить</span>
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

        {/* Список пользователей */}
        {filteredUsers.length === 0 ? (
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
                onEdit={handleEdit}
                onDelete={(user) => confirmDelete.openDialog(user.id, `пользователя "${user.name}"`)}
                onResetPassword={handleResetPassword}
              />
            </div>

            {/* Mobile карточки */}
            <div className="md:hidden">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Загрузка...</div>
              ) : (
                <UsersCards
                  users={filteredUsers}
                  onEdit={handleEdit}
                  onDelete={(user) => confirmDelete.openDialog(user.id, `пользователя "${user.name}"`)}
                  onResetPassword={handleResetPassword}
                />
              )}
            </div>
          </>
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