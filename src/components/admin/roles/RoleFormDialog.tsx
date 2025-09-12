/**
 * Диалог создания/редактирования роли
 * Включает визуальный конструктор разрешений
 */

import React, { useState, useEffect } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { externalRolesService } from '@/services/externalRolesService'
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
  'manage': 'Управление',
  'view_menu': 'Видимость меню'
}

export function RoleFormDialog({ open, onOpenChange, role, onSaved }: RoleFormDialogProps) {
  const isMobile = useIsMobile()
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
        await externalRolesService.updateRole(role.id, {
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope,
          is_active: formData.is_active
        })
      } else {
        // Создание новой роли
        await externalRolesService.createRole({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope
        })
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
    console.log('🔄 Toggling permission:', section, resource, action);
    console.log('🔍 Current permissions:', permissions);
    setPermissions(current => {
      console.log('📝 Updating permissions state...');
      const existing = current.find(p => p.section === section && p.resource === resource)
      
      if (existing) {
        if (existing.actions?.includes(action)) {
          // Убираем действие
          const newActions = existing.actions?.filter(a => a !== action) || []
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
              ? { ...p, actions: [...(p.actions || []), action] }
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
    return permission?.actions?.includes(action) || false
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
              actions: section.code === 'menu_visibility' ? 
                ['view_menu'] as PermissionAction[] : 
                ['read', 'write', 'delete', 'manage'] as PermissionAction[]
            }))
          )
        break

      case 'manager':
        // Менеджер: операции, отчеты, цены, резервуары + видимость основных меню
        const managerSections = ['networks', 'operations', 'equipment', 'finance', 'menu_visibility']
        newPermissions = Object.values(PERMISSION_SECTIONS)
          .filter(section => managerSections.includes(section.code))
          .flatMap(section => 
            Object.values(section.resources).map(resource => ({
              section: section.code,
              resource: resource.code,
              actions: section.code === 'menu_visibility' ? 
                ['view_menu'] as PermissionAction[] :
                section.code === 'finance' ? 
                ['read', 'write'] as PermissionAction[] : 
                ['read', 'write'] as PermissionAction[]
            }))
          )
        break

      case 'readonly':
        // Только чтение: все разделы только на чтение + видимость всех меню
        newPermissions = Object.values(PERMISSION_SECTIONS)
          .flatMap(section => 
            Object.values(section.resources).map(resource => ({
              section: section.code,
              resource: resource.code,
              actions: section.code === 'menu_visibility' ? 
                ['view_menu'] as PermissionAction[] : 
                ['read'] as PermissionAction[]
            }))
          )
        break
    }

    setPermissions(newPermissions)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto bg-slate-900 border-slate-700 text-white`}>
        <DialogHeader>
          <DialogTitle>
            {role ? 'Редактирование роли' : 'Создание новой роли'}
          </DialogTitle>
          <DialogDescription>
            {role ? 'Измените параметры роли и настройте разрешения' : 'Создайте новую роль и настройте разрешения'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2'} bg-slate-800 border-slate-700`}>
              <TabsTrigger value="basic">
                Основные настройки
              </TabsTrigger>
              <TabsTrigger value="permissions" className="relative">
                Разрешения
                {permissions.length > 0 && (
                  <Badge className="ml-2 h-5 px-1" variant="secondary">
                    {permissions.reduce((sum, p) => sum + (p.actions?.length || 0), 0)}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Основные настройки */}
            <TabsContent value="basic" className="space-y-4 overflow-y-auto">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-200">Код роли *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="network_admin"
                    disabled={!!role} // Код нельзя менять при редактировании
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Название роли *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Администратор сети"
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-200">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание роли и её назначения"
                  rows={3}
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Область действия</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(value: RoleScope) => setFormData(prev => ({ ...prev, scope: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SCOPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-700">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-slate-400">{option.description}</div>
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
                <Label htmlFor="is_active" className="text-slate-200">Роль активна</Label>
              </div>

              {/* Подсказка о следующем шаге */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-400">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-slate-200">Следующий шаг: Настройка разрешений</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      После заполнения основных данных перейдите на вкладку "Разрешения", чтобы настроить права доступа по разделам системы.
                    </p>
                    {permissions.length > 0 && (
                      <p className="text-sm text-green-400 mt-2">
                        ✓ Настроено {permissions.reduce((sum, p) => sum + (p.actions?.length || 0), 0)} разрешений
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-400 hover:text-blue-300"
                        onClick={() => setActiveTab('permissions')}
                      >
                        Перейти к настройке разрешений →
                      </Button>
                      {formData.name && formData.code && permissions.length > 0 && (
                        <div className="flex items-center space-x-2 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs">Готово к сохранению</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Разрешения */}
            <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-4">
              {/* Заголовок с инструкцией */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-slate-200 mb-2">Настройка разрешений по разделам системы</h3>
                <p className="text-sm text-slate-400 mb-3">
                  Выберите разделы и действия, которые будут доступны пользователям с этой ролью:
                </p>
                <div className={`grid gap-4 text-xs ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-800 border border-green-600 rounded"></div>
                    <span className="text-green-300 font-medium">Чтение</span> - просмотр данных
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-800 border border-blue-600 rounded"></div>
                    <span className="text-blue-300 font-medium">Запись</span> - создание и редактирование
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-800 border border-red-600 rounded"></div>
                    <span className="text-red-300 font-medium">Удаление</span> - удаление записей
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-800 border border-purple-600 rounded"></div>
                    <span className="text-purple-300 font-medium">Управление</span> - полные права
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-800 border border-yellow-600 rounded"></div>
                    <span className="text-yellow-300 font-medium">Видимость меню</span> - показывать в меню
                  </div>
                </div>
              </div>

              {/* Быстрые шаблоны */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h4 className="font-medium text-slate-200 mb-3">🚀 Быстрые шаблоны ролей</h4>
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-left justify-start h-auto p-3"
                    onClick={() => applyRoleTemplate('admin')}
                  >
                    <div>
                      <div className="font-medium">👑 Администратор</div>
                      <div className="text-xs text-slate-400">Полные права кроме системных настроек</div>
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
                      <div className="text-xs text-slate-400">Управление операциями и отчеты</div>
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
                      <div className="text-xs text-slate-400">Просмотр данных без изменения</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Единый список всех разрешений */}
              <div className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-slate-200">Список разрешений</CardTitle>
                      <Badge variant="outline">
                        {permissions.reduce((sum, p) => sum + (p.actions?.length || 0), 0)} из {Object.values(PERMISSION_SECTIONS).reduce((total, section) => total + Object.keys(section.resources).length * 4, 0)} возможных
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-400">
                      Выберите необходимые разрешения для данной роли
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.values(PERMISSION_SECTIONS).flatMap(section => 
                        Object.values(section.resources).map(resource => (
                          <div key={`${section.code}-${resource.code}`} className="border border-slate-600 rounded-lg p-4 bg-slate-700">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-slate-200">
                                  {section.name} → {resource.name}
                                </h4>
                                <p className="text-sm text-slate-400 mt-1">{resource.description}</p>
                              </div>
                            </div>
                            <div className={`grid gap-2 ${section.code === 'menu_visibility' ? 'grid-cols-1' : isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                              {(section.code === 'menu_visibility' ? 
                                ['view_menu'] : 
                                ['read', 'write', 'delete', 'manage']
                              ).map(action => {
                                const isChecked = hasPermission(section.code, resource.code, action)
                                const colorClasses = {
                                  read: isChecked ? 'border-green-500 bg-green-900 text-green-300' : 'border-slate-600 bg-slate-700 text-slate-400',
                                  write: isChecked ? 'border-blue-500 bg-blue-900 text-blue-300' : 'border-slate-600 bg-slate-700 text-slate-400', 
                                  delete: isChecked ? 'border-red-500 bg-red-900 text-red-300' : 'border-slate-600 bg-slate-700 text-slate-400',
                                  manage: isChecked ? 'border-purple-500 bg-purple-900 text-purple-300' : 'border-slate-600 bg-slate-700 text-slate-400',
                                  view_menu: isChecked ? 'border-yellow-500 bg-yellow-900 text-yellow-300' : 'border-slate-600 bg-slate-700 text-slate-400'
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
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
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