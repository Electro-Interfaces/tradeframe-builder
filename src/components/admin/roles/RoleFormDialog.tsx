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
import { adminRolesService } from '@/services/adminRolesService'
import { PERMISSION_SECTIONS, PermissionHelpers } from '@/config/permissions'
import type { Role, Permission, RoleScope, PermissionAction } from '@/types/auth'
import { NetworkSelect } from '@/components/selects/NetworkSelect'
import { MultiPointSelect } from '@/components/selects/MultiPointSelect'
import { MultiNetworkSelect } from '@/components/selects/MultiNetworkSelect'

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
    is_active: true,
    scopeNetworkId: '',
    scopeNetworkIds: [] as string[], // Для scope='network' - список выбранных сетей
    scopeValues: [] as string[]
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
        is_active: role.is_active,
        scopeNetworkId: '',
        scopeNetworkIds: role.scope === 'network' ? (role.scope_values || []) : [],
        scopeValues: role.scope !== 'network' ? (role.scope_values || []) : []
      })
      setPermissions([...role.permissions])
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        scope: 'trading_point',
        is_active: true,
        scopeNetworkId: '',
        scopeNetworkIds: [],
        scopeValues: []
      })
      setPermissions([])
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    try {
      setLoading(true)

      // Определяем scope_values в зависимости от scope
      let scopeValues: string[] = [];
      if (formData.scope === 'network') {
        scopeValues = formData.scopeNetworkIds;
      } else if (formData.scope === 'trading_point' || formData.scope === 'assigned') {
        scopeValues = formData.scopeValues;
      }

      if (role) {
        // Редактирование роли
        await adminRolesService.updateRole(role.id, {
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope,
          scope_values: scopeValues,
          is_active: formData.is_active
        })
      } else {
        // Создание новой роли
        await adminRolesService.createRole({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          permissions,
          scope: formData.scope,
          scope_values: scopeValues
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
    setPermissions(current => {
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

      case 'manager': {
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
      }

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
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto bg-background border-border text-foreground`}>
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
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 gap-1' : 'grid-cols-2'} bg-card border-border`}>
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
                  <Label htmlFor="code" className="text-foreground">Код роли *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="network_admin"
                    disabled={!!role} // Код нельзя менять при редактировании
                    required
                    className="bg-card border-border text-foreground placeholder-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">Название роли *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Администратор сети"
                    required
                    className="bg-card border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Описание роли и её назначения"
                  rows={3}
                  className="bg-card border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Область действия</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: RoleScope) => setFormData(prev => ({
                    ...prev,
                    scope: value,
                    scopeValues: value !== 'trading_point' && value !== 'assigned' ? [] : prev.scopeValues
                  }))}
                >
                  <SelectTrigger className="bg-card border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {SCOPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value} className="text-foreground hover:bg-secondary">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Выбор торговых сетей для scope='network' */}
              {formData.scope === 'network' && (
                <div className="space-y-4 p-4 bg-card/50 border border-purple-300 dark:border-purple-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <h4 className="font-medium text-foreground">Доступ к торговым сетям</h4>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Выберите торговые сети, к которым будет предоставлен полный доступ пользователям с этой ролью.
                    Пользователь получит доступ ко всем торговым точкам выбранных сетей.
                  </p>

                  <div className="space-y-2">
                    <Label className="text-foreground/80">Торговые сети</Label>
                    <MultiNetworkSelect
                      value={formData.scopeNetworkIds}
                      onValueChange={(values) => setFormData(prev => ({ ...prev, scopeNetworkIds: values }))}
                      placeholder="Выберите торговые сети"
                    />
                  </div>

                  {formData.scopeNetworkIds.length > 0 && (
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      ✓ Выбрано сетей: {formData.scopeNetworkIds.length}
                    </div>
                  )}
                </div>
              )}

              {/* Выбор конкретных торговых точек */}
              {(formData.scope === 'trading_point' || formData.scope === 'assigned') && (
                <div className="space-y-4 p-4 bg-card/50 border border-border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="font-medium text-foreground">Ограничение доступа к торговым точкам</h4>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Выберите сеть, затем укажите торговые точки, к которым будет ограничен доступ пользователей с этой ролью.
                    {formData.scopeValues.length === 0 && " Если не выбрать ни одной точки, доступ будет ко всем точкам сети."}
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-foreground/80">Сеть</Label>
                      <NetworkSelect
                        value={formData.scopeNetworkId}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          scopeNetworkId: value,
                          scopeValues: [] // Сбрасываем выбор при смене сети
                        }))}
                        className="bg-card border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-foreground/80">Торговые точки</Label>
                      <MultiPointSelect
                        value={formData.scopeValues}
                        onValueChange={(values) => setFormData(prev => ({ ...prev, scopeValues: values }))}
                        networkId={formData.scopeNetworkId}
                        disabled={!formData.scopeNetworkId}
                        placeholder={formData.scopeNetworkId ? "Выберите торговые точки" : "Сначала выберите сеть"}
                      />
                    </div>

                    {formData.scopeValues.length > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        ✓ Выбрано торговых точек: {formData.scopeValues.length}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active" className="text-foreground">Роль активна</Label>
              </div>

              {/* Подсказка о следующем шаге */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 dark:text-blue-400">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-foreground">Следующий шаг: Настройка разрешений</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      После заполнения основных данных перейдите на вкладку "Разрешения", чтобы настроить права доступа по разделам системы.
                    </p>
                    {permissions.length > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        ✓ Настроено {permissions.reduce((sum, p) => sum + (p.actions?.length || 0), 0)} разрешений
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-600 dark:text-blue-400 hover:text-blue-300"
                        onClick={() => setActiveTab('permissions')}
                      >
                        Перейти к настройке разрешений →
                      </Button>
                      {formData.name && formData.code && permissions.length > 0 && (
                        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
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
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium text-foreground mb-2">Настройка разрешений по разделам системы</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Выберите разделы и действия, которые будут доступны пользователям с этой ролью:
                </p>
                <div className={`grid gap-4 text-xs ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-emerald-200 dark:bg-emerald-800 border border-green-600 rounded"></div>
                    <span className="text-green-600 dark:text-green-300 font-medium">Чтение</span> - просмотр данных
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-200 dark:bg-blue-800 border border-blue-600 rounded"></div>
                    <span className="text-blue-600 dark:text-blue-300 font-medium">Запись</span> - создание и редактирование
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-200 dark:bg-red-800 border border-red-600 rounded"></div>
                    <span className="text-red-600 dark:text-red-300 font-medium">Удаление</span> - удаление записей
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-purple-200 dark:bg-purple-800 border border-purple-600 rounded"></div>
                    <span className="text-purple-600 dark:text-purple-300 font-medium">Управление</span> - полные права
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-200 dark:bg-yellow-800 border border-yellow-600 rounded"></div>
                    <span className="text-yellow-600 dark:text-yellow-300 font-medium">Видимость меню</span> - показывать в меню
                  </div>
                </div>
              </div>

              {/* Быстрые шаблоны */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">🚀 Быстрые шаблоны ролей</h4>
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

              {/* Единый список всех разрешений */}
              <div className="space-y-4">
                <Card className="bg-card border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-foreground">Список разрешений</CardTitle>
                      <Badge variant="outline">
                        {permissions.reduce((sum, p) => sum + (p.actions?.length || 0), 0)} из {Object.values(PERMISSION_SECTIONS).reduce((total, section) => total + Object.keys(section.resources).length * 4, 0)} возможных
                      </Badge>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      Выберите необходимые разрешения для данной роли
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.values(PERMISSION_SECTIONS).flatMap(section => 
                        Object.values(section.resources).map(resource => (
                          <div key={`${section.code}-${resource.code}`} className="border border-border rounded-lg p-4 bg-secondary">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-foreground">
                                  {section.name} → {resource.name}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                              </div>
                            </div>
                            <div className={`grid gap-2 ${section.code === 'menu_visibility' ? 'grid-cols-1' : isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                              {(section.code === 'menu_visibility' ? 
                                ['view_menu'] : 
                                ['read', 'write', 'delete', 'manage']
                              ).map(action => {
                                const isChecked = hasPermission(section.code, resource.code, action)
                                const colorClasses = {
                                  read: isChecked ? 'border-green-500 bg-emerald-100 dark:bg-emerald-900 text-green-600 dark:text-green-300' : 'border-border bg-secondary text-muted-foreground',
                                  write: isChecked ? 'border-blue-500 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'border-border bg-secondary text-muted-foreground', 
                                  delete: isChecked ? 'border-red-500 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' : 'border-border bg-secondary text-muted-foreground',
                                  manage: isChecked ? 'border-purple-500 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'border-border bg-secondary text-muted-foreground',
                                  view_menu: isChecked ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300' : 'border-border bg-secondary text-muted-foreground'
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
