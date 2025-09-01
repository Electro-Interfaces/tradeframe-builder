/**
 * Страница управления пользователями
 */

import React, { useState, useEffect } from 'react'
import { UserPlus, Edit, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { MainLayout } from '@/components/layout/MainLayout'
import { UserService, type UserStatistics } from '@/services/userService'
import { RoleService } from '@/services/roleService'
import type { User, Role } from '@/types/auth'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, rolesData, statsData] = await Promise.all([
        UserService.getAllUsers(),
        RoleService.getAllRoles(),
        UserService.getUserStatistics()
      ])
      
      setUsers(usersData)
      setRoles(rolesData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обработчики для пользователей
  const handleCreateUser = () => {
    setSelectedUser(null)
    setShowUserDialog(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowUserDialog(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await UserService.deleteUser(userId)
        await loadData()
      } catch (error) {
        console.error('Ошибка удаления пользователя:', error)
        alert('Не удалось удалить пользователя: ' + error)
      }
    }
  }

  const handleUserSaved = async () => {
    setShowUserDialog(false)
    setSelectedUser(null)
    await loadData()
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-400">Загрузка данных...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Пользователи</h1>
              <p className="text-slate-400 mt-2">Управление учетными записями пользователей системы</p>
            </div>
            <Button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Новый пользователь
            </Button>
          </div>
        </div>

        {/* Статистика */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Всего пользователей</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statistics.totalUsers}</div>
                <p className="text-xs text-slate-400">
                  Активных: {statistics.activeUsers}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Новых за месяц</CardTitle>
                <UserPlus className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statistics.newUsersThisMonth}</div>
                <p className="text-xs text-slate-400">
                  Пользователей
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Активные</CardTitle>
                <Users className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statistics.usersByStatus.active || 0}</div>
                <p className="text-xs text-slate-400">
                  Пользователей
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Заблокированные</CardTitle>
                <Users className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{statistics.usersByStatus.blocked || 0}</div>
                <p className="text-xs text-slate-400">
                  Пользователей
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Таблица пользователей */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Список пользователей
              <Badge variant="secondary" className="ml-auto">
                {users.length} пользователей
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Управление учетными записями пользователей системы
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Имя</TableHead>
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Роли</TableHead>
                    <TableHead className="text-slate-300">Статус</TableHead>
                    <TableHead className="text-slate-300">Последний вход</TableHead>
                    <TableHead className="text-slate-300 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="text-white font-medium">{user.name}</TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge 
                              key={role.role_id} 
                              variant={role.role_code === 'super_admin' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {role.role_name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            user.status === 'active' ? 'default' : 
                            user.status === 'blocked' ? 'destructive' : 'secondary'
                          }
                        >
                          {user.status === 'active' ? 'Активен' : 
                           user.status === 'blocked' ? 'Заблокирован' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {user.last_login 
                          ? new Date(user.last_login).toLocaleDateString('ru-RU')
                          : 'Никогда'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.roles.some(r => r.role_code === 'super_admin')}
                            className="text-slate-400 hover:text-red-400 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Диалог пользователя */}
        <UserFormDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          user={selectedUser}
          roles={roles}
          onSaved={handleUserSaved}
        />
      </div>
    </MainLayout>
  )
}