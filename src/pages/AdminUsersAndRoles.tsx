/**
 * Страница управления пользователями и ролями
 * Полнофункциональная система с CRUD для ролей и пользователей
 */

import React, { useState, useEffect } from 'react'
import { 
  Plus, Shield, Users, Edit, Trash2, UserPlus, Settings, Search, X, 
  MoreHorizontal, Eye, UserCheck, Clock, UserX, Loader2, AlertTriangle 
} from 'lucide-react'
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { UserService, type UserStatistics } from '@/services/usersSupabaseService'
import { RoleService } from '@/services/roleService'
import type { User, Role, UserStatus, RoleScope } from '@/types/auth'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'
import { UserFormDialog } from '@/components/admin/users/UserFormDialog'

export default function AdminUsersAndRoles() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userStats, setUserStats] = useState<UserStatistics>({ total: 0, active: 0, pending: 0, blocked: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<UserStatus | null>(null)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [usersData, rolesData, statsData] = await Promise.all([
        UserService.getAllUsers(),
        RoleService.getAllRoles(),
        UserService.getUserStatistics()
      ])
      
      setUsers(usersData)
      setRoles(rolesData)
      setUserStats(statsData)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtered users based on search and status filter
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === "" || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === null || user.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "blocked": return "bg-red-500/20 text-red-400 border-red-500/30"
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30"
    }
  }

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case "active": return "Активен"
      case "pending": return "Ожидает"
      case "blocked": return "Заблокирован"
      default: return "Неизвестно"
    }
  }

  const getRoleTypeColor = (isSystem: boolean) => {
    return isSystem 
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : "bg-purple-500/20 text-purple-400 border-purple-500/30"
  }

  const getScopeText = (scope: RoleScope) => {
    switch (scope) {
      case "global": return "Глобальная"
      case "network": return "Сеть"
      case "trading_point": return "Торговая точка"
      case "assigned": return "Назначенная"
      default: return scope
    }
  }

  const handleCreateUser = () => {
    setSelectedUser(null)
    setUserDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setUserDialogOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      await UserService.deleteUser(userToDelete.id)
      await loadData() // Reload data
      toast({ 
        title: "Успех", 
        description: "Пользователь удален" 
      })
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive"
      })
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  const handleCreateRole = () => {
    setSelectedRole(null)
    setRoleDialogOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setRoleDialogOpen(true)
  }

  const handleKPICardClick = (status: UserStatus | null) => {
    setStatusFilter(status)
  }

  const onUserSaved = () => {
    loadData() // Reload data after user is saved
    setUserDialogOpen(false)
  }

  const onRoleSaved = () => {
    loadData() // Reload data after role is saved
    setRoleDialogOpen(false)
  }

  if (loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Загрузка данных...</span>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <span>{error}</span>
            <Button onClick={loadData} variant="outline" size="sm">
              Повторить
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Пользователи и роли</h1>
          <p className="text-slate-400 mt-2">Управление пользователями и ролями системы</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-10' : 'h-12'}`}>
            <TabsTrigger value="users" className={isMobile ? 'text-sm' : ''}>
              <Users className="w-4 h-4 mr-2" />
              Пользователи ({users.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className={isMobile ? 'text-sm' : ''}>
              <Shield className="w-4 h-4 mr-2" />
              Роли ({roles.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Панель пользователей */}
            <div className="bg-slate-800 mb-6 w-full">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Пользователи системы</h2>
                      <p className="text-sm text-slate-400">Управление учетными записями</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Добавить пользователя
                  </Button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="px-4 md:px-6 pb-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <Card 
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-colors hover:bg-slate-700/50 ${statusFilter === null ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => handleKPICardClick(null)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>Всего</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                    {userStats.total}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-colors hover:bg-slate-700/50 ${statusFilter === 'active' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => handleKPICardClick('active')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-400" />
                    <span className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>Активных</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                    {userStats.active}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-colors hover:bg-slate-700/50 ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => handleKPICardClick('pending')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <span className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>Ожидают</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                    {userStats.pending}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-colors hover:bg-slate-700/50 ${statusFilter === 'blocked' ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => handleKPICardClick('blocked')}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-400" />
                    <span className={`text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>Заблокированы</span>
                  </div>
                  <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
                    {userStats.blocked}
                  </div>
                </CardContent>
              </Card>
                </div>
              </div>
            </div>

            {/* Search and Actions */}
            <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск пользователей..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {statusFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setStatusFilter(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Таблица пользователей */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg w-full">
              {/* Заголовок секции с поиском */}
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Список пользователей</h3>
                    <p className="text-sm text-slate-400">Найдено пользователей: {filteredUsers.length}</p>
                  </div>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Поиск пользователей..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                    {statusFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => setStatusFilter(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {isMobile ? (
                // Mobile: Card layout
                <div className="p-6 space-y-4">
                  {filteredUsers.map((user) => (
                  <Card key={user.id} className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{user.name}</h3>
                            <p className="text-sm text-slate-300">{user.email}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((userRole, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {userRole.role_name}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusText(user.status)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              ) : (
                // Desktop: Table layout
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Имя</TableHead>
                        <TableHead className="text-slate-300">Email</TableHead>
                        <TableHead className="text-slate-300">Роли</TableHead>
                        <TableHead className="text-slate-300">Статус</TableHead>
                        <TableHead className="text-slate-300">Создан</TableHead>
                        <TableHead className="text-slate-300">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-white">{user.name}</TableCell>
                          <TableCell className="text-slate-300">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map((userRole, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {userRole.role_name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {getStatusText(user.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Редактировать
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            {/* Панель ролей */}
            <div className="bg-slate-800 mb-6 w-full">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Роли и права доступа</h2>
                      <p className="text-sm text-slate-400">Управление ролями системы</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateRole}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать роль
                  </Button>
                </div>
              </div>
            </div>

            {/* Таблица ролей */}
            <div className="bg-slate-800 border border-slate-600 rounded-lg w-full">
              {/* Заголовок секции */}
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Список ролей</h3>
                    <p className="text-sm text-slate-400">Всего ролей: {roles.length}</p>
                  </div>
                </div>
              </div>

              {isMobile ? (
                // Mobile: Card layout
                <div className="p-6 space-y-4">
                  {roles.map((role) => (
                  <Card key={role.id} className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{role.name}</h3>
                            <p className="text-sm text-slate-300 font-mono">{role.code}</p>
                          </div>
                          <Badge className={getRoleTypeColor(role.is_system)}>
                            {role.is_system ? "Системная" : "Кастомная"}
                          </Badge>
                        </div>
                        
                        <div className="text-sm">
                          <span className="text-slate-400">Область: </span>
                          <span className="text-white">{getScopeText(role.scope)}</span>
                        </div>
                        
                        {role.description && (
                          <div className="text-sm text-slate-400">
                            {role.description}
                          </div>
                        )}
                        
                        <div className="flex gap-1">
                          {!role.is_system && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEditRole(role)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
                </div>
              ) : (
                // Desktop: Table layout
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Название роли</TableHead>
                        <TableHead className="text-slate-300">Код</TableHead>
                        <TableHead className="text-slate-300">Область действия</TableHead>
                        <TableHead className="text-slate-300">Тип</TableHead>
                        <TableHead className="text-slate-300">Разрешения</TableHead>
                        <TableHead className="text-slate-300">Создана</TableHead>
                        <TableHead className="text-slate-300">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-white">{role.name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-300">{role.code}</TableCell>
                          <TableCell className="text-slate-300">{getScopeText(role.scope)}</TableCell>
                          <TableCell>
                            <Badge className={getRoleTypeColor(role.is_system)}>
                              {role.is_system ? "Системная" : "Кастомная"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {role.permissions.length} разрешений
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(role.created_at).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!role.is_system && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* User Create/Edit Dialog */}
        <UserFormDialog
          open={userDialogOpen}
          onOpenChange={setUserDialogOpen}
          onSaved={onUserSaved}
          user={selectedUser}
        />

        {/* Role Create/Edit Dialog */}
        <RoleFormDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onSaved={onRoleSaved}
          role={selectedRole}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить пользователя "{userToDelete?.name}"? 
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}