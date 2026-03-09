/**
 * Страница управления пользователями и ролями
 * Includes CRUD для ролей с визуальным конструктором разрешений
 */

import React, { useState, useEffect } from 'react'
import { Plus, Shield, Users, Edit, Trash2, UserPlus, Settings, MoreVertical } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { adminUsersService } from '@/services/adminUsersService'
import { adminRolesService } from '@/services/adminRolesService'
import type { User, Role } from '@/types/auth'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'
import { PermissionBuilder } from '@/components/admin/roles/PermissionBuilder'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserStatistics {
  totalUsers: number
  usersByStatus: Record<string, number>
  usersByRole: Record<string, number>
  activeUsers: number
  newUsersThisMonth: number
}

export default function UsersAndRoles() {
  const isMobile = useIsMobile()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [statistics, setStatistics] = useState<UserStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('users')

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersData, rolesData] = await Promise.all([
        adminUsersService.getUsersWithRoles(),
        adminRolesService.getAllRoles()
      ])
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const statsData: UserStatistics = {
        totalUsers: usersData.length,
        usersByStatus: usersData.reduce((acc, user) => {
          acc[user.status] = (acc[user.status] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        usersByRole: usersData.reduce((acc, user) => {
          user.roles.forEach(role => {
            acc[role.role_name] = (acc[role.role_name] || 0) + 1
          })
          return acc
        }, {} as Record<string, number>),
        activeUsers: usersData.filter(user => user.status === 'active').length,
        newUsersThisMonth: usersData.filter(user => user.created_at >= startOfMonth).length
      }
      
      setUsers(usersData)
      setRoles(rolesData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  // Обработчики для ролей
  const handleCreateRole = () => {
    setSelectedRole(null)
    setShowRoleDialog(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setShowRoleDialog(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту роль?')) {
      try {
        await adminRolesService.deleteRole(roleId)
        await loadData()
      } catch (error) {
        console.error('Ошибка удаления роли:', error)
        alert('Не удалось удалить роль: ' + error)
      }
    }
  }

  const handleRoleSaved = async () => {
    setShowRoleDialog(false)
    setSelectedRole(null)
    await loadData()
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
        await adminUsersService.deleteUser(userId)
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Пользователи и роли</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Управление пользователями и настройка ролей
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateUser} size={isMobile ? "sm" : "default"}>
            <UserPlus className="h-4 w-4 mr-2" />
            {isMobile ? "Пользователь" : "Новый пользователь"}
          </Button>
          <Button onClick={handleCreateRole} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-2" />
            {isMobile ? "Роль" : "Новая роль"}
          </Button>
        </div>
      </div>

      {/* Статистика */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Активных: {statistics.activeUsers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего ролей</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
              <p className="text-xs text-muted-foreground">
                Системных: {roles.filter(r => r.is_system).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Новых за месяц</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.newUsersThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Пользователей
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">По статусам</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Активные:</span>
                  <span className="font-medium">{statistics.usersByStatus.active || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Заблокированные:</span>
                  <span className="font-medium">{statistics.usersByStatus.blocked || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Основное содержимое */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
          <TabsTrigger value="permissions">Конструктор разрешений</TabsTrigger>
        </TabsList>

        {/* Вкладка пользователей */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Список пользователей</CardTitle>
              <CardDescription>
                Управление учетными записями пользователей системы
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Мобильные карточки пользователей */}
              {isMobile ? (
                <div className="divide-y">
                  {users.map((user) => (
                    <div key={user.id} className="p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role.role_id}
                              variant={role.role_code === 'super_admin' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {role.role_name}
                            </Badge>
                          ))}
                          <Badge
                            variant={user.status === 'active' ? 'default' : user.status === 'blocked' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {user.status === 'active' ? 'Активен' : user.status === 'blocked' ? 'Заблокирован' : 'Неактивен'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Вход: {user.last_login ? new Date(user.last_login).toLocaleDateString('ru-RU') : 'Никогда'}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.roles.some(r => r.role_code === 'super_admin')}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Роли</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Последний вход</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
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
                          <TableCell>
                            {user.last_login
                              ? new Date(user.last_login).toLocaleDateString('ru-RU')
                              : 'Никогда'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} disabled={user.roles.some(r => r.role_code === 'super_admin')}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка ролей */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Список ролей</CardTitle>
              <CardDescription>
                Настройка ролей и их разрешений в системе
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Мобильные карточки ролей */}
              {isMobile ? (
                <div className="divide-y">
                  {roles.map((role) => (
                    <div key={role.id} className="p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{role.name}</span>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{role.code}</code>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {role.scope === 'global' ? 'Глобальная' :
                             role.scope === 'network' ? 'Сеть' :
                             role.scope === 'trading_point' ? 'ТТ' :
                             role.scope === 'assigned' ? 'Назначенная' : role.scope}
                          </Badge>
                          <Badge variant={role.is_system ? 'secondary' : 'default'} className="text-xs">
                            {role.is_system ? 'Системная' : 'Пользов.'}
                          </Badge>
                          <Badge variant={role.is_active ? 'default' : 'secondary'} className="text-xs">
                            {role.is_active ? 'Активна' : 'Неактивна'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {role.permissions.length} разрешений
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditRole(role)} disabled={role.is_system}>
                            <Edit className="h-4 w-4 mr-2" />Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteRole(role.id)} disabled={role.is_system} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Код</TableHead>
                        <TableHead>Область действия</TableHead>
                        <TableHead>Разрешения</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">{role.code}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {role.scope === 'global' ? 'Глобальная' :
                               role.scope === 'network' ? 'Сеть' :
                               role.scope === 'trading_point' ? 'Торговая точка' :
                               role.scope === 'assigned' ? 'Назначенная' : role.scope}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{role.permissions.length} разрешений</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.is_system ? 'secondary' : 'default'}>
                              {role.is_system ? 'Системная' : 'Пользовательская'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={role.is_active ? 'default' : 'secondary'}>
                              {role.is_active ? 'Активна' : 'Неактивна'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)} disabled={role.is_system}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role.id)} disabled={role.is_system}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка конструктора разрешений */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Конструктор разрешений</CardTitle>
              <CardDescription>
                Визуальный инструмент для настройки разрешений ролей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionBuilder />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Диалоги */}
      <RoleFormDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        role={selectedRole}
        onSaved={handleRoleSaved}
      />

      <UserFormDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
        roles={roles}
        onSaved={handleUserSaved}
      />
    </div>
  )
}
