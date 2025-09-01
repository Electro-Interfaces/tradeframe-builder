/**
 * Диалог создания/редактирования роли
 * Включает визуальный конструктор разрешений
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RoleService } from '@/services/roleService'
import { PERMISSION_SECTIONS, PermissionHelpers } from '@/config/permissions'
import type { Role, Permission, RoleScope, PermissionAction } from '@/types/auth'

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  onSaved: () => void
}

const SCOPE_OPTIONS: Array<{ value: RoleScope; label: string; description: string }> = [
  { value: 'global', label: 'Глобальная', description: 'Доступ ко всей системе' },
  { value: 'network', label: 'Сеть', description: 'Доступ к конкретной торговой сети' },
  { value: 'trading_point', label: 'Торговая точка', description: 'Доступ к конкретной АЗС' },
  { value: 'assigned', label: 'Назначенная', description: 'Доступ к назначенным ресурсам' }
]

const ACTION_LABELS: Record<PermissionAction, string> = {
  'read': 'Чтение',
  'write': 'Запись',
  'delete': 'Удаление', 
  'manage': 'Управление'
}

export function RoleFormDialog({ open, onOpenChange, role, onSaved }: RoleFormDialogProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    scope: 'trading_point' as RoleScope,
    is_active: true
  })
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // Инициализация формы при изменении роли
  useEffect(() => {
    if (role) {
      setFormData({
        code: role.code,
        name: role.name,
        description: role.description,
        scope: role.scope,
        is_active: role.is_active
      })
      setPermissions([...role.permissions])
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        scope: 'trading_point',
        is_active: true
      })
      setPermissions([])
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    try {
      setLoading(true)

      if (role) {
        // Редактирование роли
        await RoleService.updateRole(role.id, {
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope,
          is_active: formData.is_active
        })
      } else {
        // Создание новой роли
        await RoleService.createRole({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope
        }, 'default_tenant') // TODO: получать из контекста
      }

      onSaved()
    } catch (error) {
      console.error('Ошибка сохранения роли:', error)
      alert('Не удалось сохранить роль: ' + error)
    } finally {
      setLoading(false)
    }
  }

  // Обработчики разрешений
  const togglePermission = (section: string, resource: string, action: PermissionAction) => {
    setPermissions(current => {
      const existing = current.find(p => p.section === section && p.resource === resource)
      
      if (existing) {
        if (existing.actions.includes(action)) {
          // Убираем действие
          const newActions = existing.actions.filter(a => a !== action)
          if (newActions.length === 0) {
            // Убираем разрешение полностью
            return current.filter(p => !(p.section === section && p.resource === resource))
          } else {
            // Обновляем действия
            return current.map(p => 
              p.section === section && p.resource === resource
                ? { ...p, actions: newActions }
                : p
            )
          }
        } else {
          // Добавляем действие
          return current.map(p => 
            p.section === section && p.resource === resource
              ? { ...p, actions: [...p.actions, action] }
              : p
          )
        }
      } else {
        // Создаем новое разрешение
        return [...current, {
          section,
          resource,
          actions: [action]
        }]
      }
    })
  }

  const hasPermission = (section: string, resource: string, action: PermissionAction): boolean => {
    const permission = permissions.find(p => p.section === section && p.resource === resource)
    return permission?.actions.includes(action) || false
  }

  const toggleSectionAll = (sectionCode: string, enabled: boolean) => {
    const section = PermissionHelpers.getSection(sectionCode)
    if (!section) return

    if (enabled) {
      // Добавляем все разрешения для секции
      const newPermissions = Object.values(section.resources).map(resource => ({
        section: sectionCode,
        resource: resource.code,
        actions: ['read', 'write', 'delete', 'manage'] as PermissionAction[]
      }))

      setPermissions(current => {
        // Убираем существующие разрешения для этой секции
        const filtered = current.filter(p => p.section !== sectionCode)
        return [...filtered, ...newPermissions]
      })
    } else {
      // Убираем все разрешения для секции
      setPermissions(current => current.filter(p => p.section !== sectionCode))
    }
  }

  const getSectionPermissionCount = (sectionCode: string): { total: number, granted: number } => {
    const section = PermissionHelpers.getSection(sectionCode)
    if (!section) return { total: 0, granted: 0 }

    const totalActions = Object.keys(section.resources).length * 4 // 4 действия на ресурс
    const grantedActions = permissions
      .filter(p => p.section === sectionCode)
      .reduce((sum, p) => sum + p.actions.length, 0)

    return { total: totalActions, granted: grantedActions }
  }

  const applyRoleTemplate = (template: 'admin' | 'manager' | 'readonly') => {
    let newPermissions: Permission[] = []

    switch (template) {
      case 'admin':
        // Администратор: все разрешения кроме системного администрирования
        newPermissions = Object.values(PERMISSION_SECTIONS)
          .filter(section => section.code !== 'admin') // Исключаем системное администрирование
          .flatMap(section => 
            Object.values(section.resources).map(resource => ({
              section: section.code,
              resource: resource.code,
              actions: ['read', 'write', 'delete', 'manage'] as PermissionAction[]
            }))
          )
        break

      case 'manager':
        // Менеджер: операции, отчеты, цены, резервуары
        const managerSections = ['networks', 'operations', 'equipment', 'finance']
        newPermissions = Object.values(PERMISSION_SECTIONS)
          .filter(section => managerSections.includes(section.code))
          .flatMap(section => 
            Object.values(section.resources).map(resource => ({
              section: section.code,
              resource: resource.code,
              actions: section.code === 'finance' ? ['read', 'write'] as PermissionAction[] : ['read', 'write'] as PermissionAction[]
            }))
          )
        break

      case 'readonly':
        // Только чтение: все разделы только на чтение
        newPermissions = Object.values(PERMISSION_SECTIONS)
          .flatMap(section => 
            Object.values(section.resources).map(resource => ({
              section: section.code,
              resource: resource.code,
              actions: ['read'] as PermissionAction[]
            }))
          )
        break
    }

    setPermissions(newPermissions)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Редактирование роли' : 'Создание новой роли'}
          </DialogTitle>
          <DialogDescription>
            {role ? 'Измените параметры роли и настройте разрешения' : 'Создайте новую роль и настройте разрешения'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">
                Основные настройки
              </TabsTrigger>
              <TabsTrigger value="permissions" className="relative">
                Разрешения
                {permissions.length > 0 && (
                  <Badge className="ml-2 h-5 px-1" variant="secondary">
                    {permissions.reduce((sum, p) => sum + p.actions.length, 0)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Основные настройки */}
            <TabsContent value="basic" className="space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Код роли *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="network_admin"
                    disabled={!!role} // Код нельзя менять при редактировании
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Название роли *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Администратор сети"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание роли и её назначения"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Область действия</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(value: RoleScope) => setFormData(prev => ({ ...prev, scope: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Роль активна</Label>
              </div>

              {/* Подсказка о следующем шаге */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-500">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-blue-900">Следующий шаг: Настройка разрешений</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      После заполнения основных данных перейдите на вкладку "Разрешения", чтобы настроить права доступа по разделам системы.
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-blue-600 hover:text-blue-800"
                      onClick={() => setActiveTab('permissions')}
                    >
                      Перейти к настройке разрешений →
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Разрешения */}
            <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-4">
              {/* Заголовок с инструкцией */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Настройка разрешений по разделам системы</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Выберите разделы и действия, которые будут доступны пользователям с этой ролью:
                </p>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span className="text-green-700 font-medium">Чтение</span> - просмотр данных
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                    <span className="text-blue-700 font-medium">Запись</span> - создание и редактирование
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                    <span className="text-red-700 font-medium">Удаление</span> - удаление записей
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                    <span className="text-purple-700 font-medium">Управление</span> - полные права
                  </div>
                </div>
              </div>

              {/* Быстрые шаблоны */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-3">🚀 Быстрые шаблоны ролей</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-3"
                    onClick={() => applyRoleTemplate('admin')}
                  >
                    <div>
                      <div className="font-medium">👑 Администратор</div>
                      <div className="text-xs text-muted-foreground">Полные права кроме системных настроек</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-3"
                    onClick={() => applyRoleTemplate('manager')}
                  >
                    <div>
                      <div className="font-medium">🏢 Менеджер</div>
                      <div className="text-xs text-muted-foreground">Управление операциями и отчеты</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-3"
                    onClick={() => applyRoleTemplate('readonly')}
                  >
                    <div>
                      <div className="font-medium">👀 Только чтение</div>
                      <div className="text-xs text-muted-foreground">Просмотр данных без изменения</div>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.values(PERMISSION_SECTIONS).map(section => {
                  const stats = getSectionPermissionCount(section.code)
                  const hasAnyPermissions = stats.granted > 0
                  
                  return (
                    <Card key={section.code}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={hasAnyPermissions}
                              onCheckedChange={(checked) => toggleSectionAll(section.code, !!checked)}
                            />
                            <div>
                              <CardTitle className="text-lg">{section.name}</CardTitle>
                              <CardDescription>{section.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline">
                            {stats.granted} / {stats.total}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.values(section.resources).map(resource => (
                            <div key={resource.code} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-medium">{resource.name}</h4>
                                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {(['read', 'write', 'delete', 'manage'] as PermissionAction[]).map(action => {
                                  const isChecked = hasPermission(section.code, resource.code, action)
                                  const colorClasses = {
                                    read: isChecked ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600',
                                    write: isChecked ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600', 
                                    delete: isChecked ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600',
                                    manage: isChecked ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600'
                                  }
                                  
                                  return (
                                    <label 
                                      key={action} 
                                      className={`
                                        flex items-center justify-center space-x-2 cursor-pointer p-2 rounded border-2 transition-all hover:shadow-sm
                                        ${colorClasses[action]}
                                      `}
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => togglePermission(section.code, resource.code, action)}
                                        className="data-[state=checked]:bg-current data-[state=checked]:border-current"
                                      />
                                      <span className="text-sm font-medium">{ACTION_LABELS[action]}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : (role ? 'Сохранить' : 'Создать')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}