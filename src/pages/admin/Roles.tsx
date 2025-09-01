/**
 * Страница управления ролями
 */

import React, { useState, useEffect } from 'react'
import { Plus, Shield, Edit, Trash2, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { MainLayout } from '@/components/layout/MainLayout'
import { RoleService } from '@/services/roleService'
import type { Role } from '@/types/auth'
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog'
import { PermissionBuilder } from '@/components/admin/roles/PermissionBuilder'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('roles')

  // Загрузка данных
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const rolesData = await RoleService.getAllRoles()
      setRoles(rolesData)
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

  const systemRoles = roles.filter(r => r.is_system)
  const customRoles = roles.filter(r => !r.is_system)
  const activeRoles = roles.filter(r => r.is_active)

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
              <h1 className="text-2xl font-semibold text-white">Роли</h1>
              <p className="text-slate-400 mt-2">Настройка ролей и их разрешений в системе</p>
            </div>
            <Button onClick={handleCreateRole} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Новая роль
            </Button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Всего ролей</CardTitle>
              <Shield className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{roles.length}</div>
              <p className="text-xs text-slate-400">
                В системе
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Системные</CardTitle>
              <Shield className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{systemRoles.length}</div>
              <p className="text-xs text-slate-400">
                Встроенные роли
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Пользовательские</CardTitle>
              <Settings className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{customRoles.length}</div>
              <p className="text-xs text-slate-400">
                Созданные роли
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">Активные</CardTitle>
              <Shield className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeRoles.length}</div>
              <p className="text-xs text-slate-400">
                Используются
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Основное содержимое */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-800 border border-slate-700">
            <TabsTrigger 
              value="roles" 
              className="text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-12"
            >
              <Shield className="w-4 h-4 mr-2" />
              Список ролей
            </TabsTrigger>
            <TabsTrigger 
              value="permissions" 
              className="text-slate-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-12"
            >
              <Settings className="w-4 h-4 mr-2" />
              Конструктор разрешений
            </TabsTrigger>
          </TabsList>

          {/* Вкладка ролей */}
          <TabsContent value="roles" className="space-y-0">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Список ролей
                  <Badge variant="secondary" className="ml-auto">
                    {roles.length} ролей
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Настройка ролей и их разрешений в системе
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Название</TableHead>
                        <TableHead className="text-slate-300">Код</TableHead>
                        <TableHead className="text-slate-300">Область действия</TableHead>
                        <TableHead className="text-slate-300">Разрешения</TableHead>
                        <TableHead className="text-slate-300">Тип</TableHead>
                        <TableHead className="text-slate-300">Статус</TableHead>
                        <TableHead className="text-slate-300 text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="text-white font-medium">{role.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded">
                              {role.code}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {role.scope === 'global' ? 'Глобальная' :
                               role.scope === 'network' ? 'Сеть' :
                               role.scope === 'trading_point' ? 'Торговая точка' :
                               role.scope === 'assigned' ? 'Назначенная' : role.scope}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-300">
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
                                className="text-slate-400 hover:text-white disabled:opacity-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRole(role.id)}
                                disabled={role.is_system}
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
          </TabsContent>

          {/* Вкладка конструктора разрешений */}
          <TabsContent value="permissions" className="space-y-0">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Конструктор разрешений
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Визуальный инструмент для настройки разрешений ролей
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionBuilder />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Диалог роли */}
        <RoleFormDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          role={selectedRole}
          onSaved={handleRoleSaved}
        />
      </div>
    </MainLayout>
  )
}