/**
 * Страница управления пользователями и ролями
 * Includes CRUD для ролей с визуальным конструктором разрешений
 */

import React, { useState, useEffect } from 'react'
import { Plus, Shield, Users, Edit, Trash2, UserPlus, Settings } from 'lucide-react'
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
import { UserService, type UserStatistics } from '@/services/usersSupabaseService'
import { RoleService } from '@/services/roleService'
import type { User, Role } from '@/types/auth'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'
import { PermissionBuilder } from '@/components/admin/roles/PermissionBuilder'

export default function UsersAndRoles() {
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
        await RoleService.deleteRole(roleId)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пользователи и роли</h1>
          <p className="text-muted-foreground">
            Управление пользователями системы и настройка ролей с разрешениями
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            Новый пользователь
          </Button>
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Новая роль
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
            <CardContent>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.roles.some(r => r.role_code === 'super_admin')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <CardContent>
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
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {role.code}
                        </code>
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
                        <span className="text-sm text-muted-foreground">
                          {role.permissions.length} разрешений
                        </span>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                            disabled={role.is_system}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.is_system}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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