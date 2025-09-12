/**
 * Страница управления пользователями
 */

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Users as UsersIcon, Search, Edit, Trash2, User, KeyRound } from 'lucide-react'
import { User as UserType, UserStatus } from '@/types/auth'
import { externalUsersService } from '@/services/externalUsersService'
import { externalRolesService } from '@/services/externalRolesService'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'
import { useDeleteConfirmDialog } from '@/hooks/useDeleteConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { MainLayout } from '@/components/layout/MainLayout'
import { useIsMobile } from "@/hooks/use-mobile";
import { HelpButton } from "@/components/help/HelpButton"
import { DataSourceIndicator, DataSourceInfo, useDataSourceInfo } from '@/components/data-source/DataSourceIndicator'
import { useAuth } from '@/contexts/AuthContext'

export default function Users() {
  const { hasExternalDatabase } = useDataSourceInfo()
  const { user } = useAuth()
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
      console.log('🧹 Начинаем очистку soft-deleted пользователей...')
      console.log('🔧 Проверяем сервис:', externalUsersService)
      
      const result = await externalUsersService.permanentlyDeleteAllSoftDeletedUsers()
      console.log('📊 Результат очистки:', result)
      
      if (result && result.deletedCount > 0) {
        alert(`✅ Успешно удалено ${result.deletedCount} пользователей из базы данных.`)
        await refetch() // Обновляем список пользователей
      } else {
        alert('ℹ️ Помеченные к удалению пользователи не найдены.')
      }
    } catch (error) {
      console.error('❌ Детальная ошибка при очистке удаленных пользователей:', error)
      console.error('❌ Стек ошибки:', error?.stack)
      console.error('❌ Сообщение ошибки:', error?.message)
      
      // Показываем более детальную ошибку
      const errorMessage = error?.message || 'Неизвестная ошибка'
      alert(`❌ Ошибка при очистке удаленных пользователей:\n\n${errorMessage}\n\nПроверьте консоль для подробностей.`)
    }
  }

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'Никогда'
    const d = new Date(date)
    return d.toLocaleDateString('ru-RU')
  }

  const confirmDelete = useDeleteConfirmDialog(handleDelete)

  const handleUserSaved = () => {
    setIsDialogOpen(false)
    setSelectedUser(null)
    refetch()
  }

  return (
    <MainLayout>
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
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Новый пользователь
                </Button>
                {/* Кнопка очистки удаленных пользователей - только для администраторов */}
                {(user?.role === 'super_admin' || user?.role === 'system_admin' || user?.role === 'network_admin' || user?.email?.includes('admin')) && (
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

        {/* Таблица пользователей */}
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
          <div className="w-full">
            <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
              <table className="w-full text-sm min-w-full table-fixed">
                <thead className="bg-slate-700/80">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '23%'}}>ПОЛЬЗОВАТЕЛЬ</th>
                    <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '20%'}}>EMAIL</th>
                    <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '10%'}}>СТАТУС</th>
                    <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '19%'}}>РОЛИ</th>
                    <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ПОСЛЕДНИЙ ВХОД</th>
                    <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '13%'}}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-600">
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full bg-slate-700" />
                            <Skeleton className="h-4 w-32 bg-slate-700" />
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-40 bg-slate-700" /></td>
                        <td className="px-4 md:px-6 py-4"><Skeleton className="h-6 w-16 bg-slate-700" /></td>
                        <td className="px-4 md:px-6 py-4"><Skeleton className="h-6 w-20 bg-slate-700" /></td>
                        <td className="px-4 md:px-6 py-4"><Skeleton className="h-4 w-24 bg-slate-700" /></td>
                        <td className="px-4 md:px-6 py-4"><Skeleton className="h-8 w-16 bg-slate-700" /></td>
                      </tr>
                    ))
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-600">
                              <User className="w-4 h-4 text-slate-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-white text-base truncate">
                                {user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="text-slate-300 truncate">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <Badge 
                            variant={user.status === 'active' ? 'default' : 'secondary'}
                            className={user.status === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}
                          >
                            {user.status === 'active' ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map(role => (
                              <Badge key={role.role_id} variant="outline" className="text-xs border-slate-500 text-slate-300">
                                {role.role_name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4">
                          <div className="text-slate-300">
                            {user.last_login ? formatDate(user.last_login) : 'Никогда'}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              className="text-slate-400 hover:text-white hover:bg-slate-700"
                              title="Редактировать пользователя"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              className="text-slate-400 hover:text-yellow-400 hover:bg-slate-700"
                              title="Сбросить пароль"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete.openDialog(user.id, `пользователя "${user.name}"`)}
                              className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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