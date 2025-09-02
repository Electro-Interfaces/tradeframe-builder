/**
 * Страница управления ролями
 */

import React, { useState, useEffect } from 'react'
import { Plus, Shield, Edit, Trash2, Settings, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [scopeFilter, setScopeFilter] = useState<string>('all')

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

  const systemRoles = roles.filter(r => false) // Убрана фильтрация системных ролей
  const customRoles = roles // Все роли теперь пользовательские
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
          <h1 className="text-2xl font-semibold text-white">Роли системы</h1>
          <p className="text-slate-400 mt-2">
            Управление ролями и конфигурация разрешений для контроля доступа в системе
          </p>
        </div>


        {/* Панель управления */}
        <div className="bg-slate-800 mb-6 rounded-lg border border-slate-700">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-white">Роли системы</h2>
                <div className="text-sm text-slate-400">
                  Всего: {roles.length}
                </div>
              </div>
              <Button
                onClick={handleCreateRole}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать роль
              </Button>
            </div>
            
            {/* Фильтры */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Поиск ролей по названию или описанию..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                />
              </div>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full md:w-48">
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles">Роли</TabsTrigger>
            <TabsTrigger value="permissions">Конструктор разрешений</TabsTrigger>
          </TabsList>

          {/* Список ролей */}
          <TabsContent value="roles" className="mt-6">
            {roles.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm || scopeFilter !== 'all' ? 'Роли не найдены' : 'Нет ролей'}
                </h3>
                <p className="text-slate-400">
                  {searchTerm || scopeFilter !== 'all'
                    ? 'Попробуйте изменить критерии поиска'
                    : 'Создайте первую роль для управления доступом пользователей'
                  }
                </p>
              </div>
            ) : (
              <div className="w-full">
                <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                  <table className="w-full text-sm min-w-full table-fixed">
                    <thead className="bg-slate-700/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '25%'}}>НАЗВАНИЕ РОЛИ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>КОД</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>ОБЛАСТЬ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>РАЗРЕШЕНИЯ</th>
                        <th className="px-6 py-4 text-left text-slate-100 font-medium" style={{width: '15%'}}>СТАТУС</th>
                        <th className="px-6 py-4 text-right text-slate-100 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {roles
                        .filter(role => {
                          const matchesSearch = searchTerm === '' || 
                            role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            role.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            role.code.toLowerCase().includes(searchTerm.toLowerCase())
                          const matchesScope = scopeFilter === 'all' || role.scope === scopeFilter
                          return matchesSearch && matchesScope
                        })
                        .map((role) => (
                        <tr
                          key={role.id}
                          className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-600">
                                <Shield className="w-4 h-4 text-slate-300" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white text-base truncate">
                                  {role.name}
                                </div>
                                <div className="text-sm text-slate-300 truncate">
                                  {role.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-xs">
                              {role.code}
                            </code>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge
                              variant="outline"
                              className="text-xs text-blue-400 border-blue-500 bg-blue-500/10"
                            >
                              {role.scope === 'global' ? 'Глобальная' :
                               role.scope === 'network' ? 'Сеть' :
                               role.scope === 'trading_point' ? 'Торговая точка' :
                               role.scope === 'assigned' ? 'Назначенная' : role.scope}
                            </Badge>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-white text-sm">{role.permissions.length}</span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                role.is_active 
                                  ? 'text-green-400 border-green-500 bg-green-500/10'
                                  : 'text-slate-400 border-slate-500 bg-slate-500/10'
                              }`}
                            >
                              {role.is_active ? 'Активна' : 'Неактивна'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handleEditRole(role)}
                                title="Редактировать"
                                disabled={loading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                onClick={() => handleDeleteRole(role.id)}
                                title="Удалить"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Конструктор разрешений */}
          <TabsContent value="permissions" className="mt-6">
            <PermissionBuilder />
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