/**
 * Простой редактор разрешений для ролей
 * Показывает список всех разрешений с возможностью редактирования
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useIsMobile } from '@/hooks/use-mobile'
import { adminRolesService } from '@/services/adminRolesService'
import { PERMISSION_SECTIONS } from '@/config/permissions'
import type { Role, PermissionAction, Permission } from '@/types/auth'

const ACTION_LABELS: Record<PermissionAction, string> = {
  'read': 'Чтение',
  'write': 'Запись', 
  'delete': 'Удаление',
  'manage': 'Управление',
  'view_menu': 'Видимость меню'
}

export function PermissionBuilder() {
  const isMobile = useIsMobile()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editedPermissions, setEditedPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const rolesData = await adminRolesService.getAllRoles()
      setRoles(rolesData)
      if (rolesData.length > 0) {
        const firstRole = rolesData[0]
        setSelectedRole(firstRole)
        setEditedPermissions(firstRole.permissions ? [...firstRole.permissions] : [])
      }
    } catch (error) {
      console.error('Ошибка загрузки ролей:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role) {
      setSelectedRole(role)
      setEditedPermissions(role.permissions ? [...role.permissions] : [])
    }
  }

  const hasPermission = (section: string, resource: string, action: PermissionAction): boolean => {
    const permission = editedPermissions.find(p => p.section === section && p.resource === resource)
    return permission?.actions.includes(action) || false
  }

  const togglePermission = (section: string, resource: string, action: PermissionAction) => {
    if (!selectedRole) {
      return;
    }

    setEditedPermissions(current => {
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

  const savePermissions = async () => {
    if (!selectedRole) return

    try {
      setSaving(true)
      await adminRolesService.updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
        permissions: editedPermissions,
        scope: selectedRole.scope,
        is_active: selectedRole.is_active
      })
      
      // Обновляем локальное состояние
      setRoles(current => current.map(role => 
        role.id === selectedRole.id 
          ? { ...role, permissions: editedPermissions }
          : role
      ))
      setSelectedRole(prev => prev ? { ...prev, permissions: editedPermissions } : null)
      
      alert('Разрешения успешно сохранены')
    } catch (error) {
      console.error('Ошибка сохранения разрешений:', error)
      alert('Не удалось сохранить разрешения: ' + error)
    } finally {
      setSaving(false)
    }
  }

  const resetPermissions = () => {
    if (selectedRole) {
      setEditedPermissions(selectedRole.permissions ? [...selectedRole.permissions] : [])
    }
  }

  const getRolePermissionCount = (role: Role): number => {
    if (!role.permissions || !Array.isArray(role.permissions)) return 0
    return role.permissions.reduce((sum, p) => {
      if (!p || !p.actions || !Array.isArray(p.actions)) return sum
      return sum + p.actions.length
    }, 0)
  }

  const getEditedPermissionCount = (): number => {
    if (!editedPermissions || !Array.isArray(editedPermissions)) return 0
    return editedPermissions.reduce((sum, p) => {
      if (!p || !p.actions || !Array.isArray(p.actions)) return sum
      return sum + p.actions.length
    }, 0)
  }

  const hasChanges = (): boolean => {
    if (!selectedRole) return false
    const rolePerms = selectedRole.permissions || []
    return JSON.stringify(editedPermissions) !== JSON.stringify(rolePerms)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Селектор роли */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Роль для редактирования</label>
        <Select 
          value={selectedRole?.id || ''} 
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="bg-card border-border text-foreground">
            <SelectValue placeholder="Выберите роль" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id} className="text-foreground hover:bg-secondary">
                <div className="flex items-center space-x-2">
                  <span>{role.name}</span>
                  <Badge variant="default" className="text-xs">
                    {getRolePermissionCount(role)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRole && (
        <div className="space-y-6">
          {/* Информация о роли */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className={`text-foreground ${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                <div className="flex min-w-0 items-center space-x-2">
                  <span>{selectedRole.name}</span>
                  <Badge variant="default">
                    Пользовательская
                  </Badge>
                </div>
                <div className={`flex ${isMobile ? 'flex-wrap gap-2' : 'items-center space-x-2'}`}>
                  <Badge variant="outline">
                    {getEditedPermissionCount()} разрешений
                  </Badge>
                  {hasChanges() && (
                    <Badge className="bg-yellow-600">
                      Есть изменения
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {selectedRole.description} • Область: {
                  selectedRole.scope === 'global' ? 'Глобальная' :
                  selectedRole.scope === 'network' ? 'Сеть' :
                  selectedRole.scope === 'trading_point' ? 'Торговая точка' :
                  'Назначенная'
                }
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Редактор разрешений */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className={`text-foreground ${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
                <span>Редактирование разрешений</span>
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'space-x-2'}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPermissions}
                    disabled={!hasChanges()}
                    className={isMobile ? 'w-full' : ''}
                    
                  >
                    Сбросить
                  </Button>
                  <Button
                    size="sm"
                    onClick={savePermissions}
                    disabled={!hasChanges() || saving}
                    className={isMobile ? 'w-full bg-primary hover:bg-primary/80' : 'bg-primary hover:bg-primary/80'}
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Выберите разрешения для данной роли по разделам системы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(PERMISSION_SECTIONS).map(section => (
                  <div key={section.code} className="overflow-hidden rounded-lg border border-border bg-secondary p-3 sm:p-4">
                    <div className="mb-4">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground">{section.name}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.values(section.resources).map(resource => (
                        <div key={resource.code} className="rounded border border-border bg-secondary p-3 overflow-hidden">
                          <div className="mb-3 min-w-0">
                            <div>
                              <h4 className="font-medium text-foreground">{resource.name}</h4>
                              <p className="text-sm text-muted-foreground">{resource.description}</p>
                            </div>
                          </div>
                          <div className={`grid gap-2 ${section.code === 'menu_visibility' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                            {(section.code === 'menu_visibility' ?
                              ['view_menu'] as const :
                              ['read', 'write', 'delete', 'manage'] as const
                            ).map(action => {
                              const typedAction = action as PermissionAction
                              const isChecked = hasPermission(section.code, resource.code, typedAction)
                              const colorClasses: Record<PermissionAction, string> = {
                                read: isChecked ? 'border-green-500 bg-emerald-100 dark:bg-emerald-900 text-green-600 dark:text-green-300' : 'border-border bg-secondary text-muted-foreground hover:border-green-400',
                                write: isChecked ? 'border-primary bg-primary/10 dark:bg-blue-900 text-primary dark:text-blue-300' : 'border-border bg-secondary text-muted-foreground hover:border-primary/40',
                                delete: isChecked ? 'border-red-500 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' : 'border-border bg-secondary text-muted-foreground hover:border-red-400',
                                manage: isChecked ? 'border-purple-500 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300' : 'border-border bg-secondary text-muted-foreground hover:border-purple-400',
                                view_menu: isChecked ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300' : 'border-border bg-secondary text-muted-foreground hover:border-yellow-400'
                              }

                              return (
                                <label
                                  key={action}
                                  className={`
                                    flex min-w-0 items-center justify-start space-x-2 cursor-pointer rounded border-2 p-2 transition-all hover:shadow-sm
                                    ${colorClasses[typedAction]}
                                  `}
                                  onClick={() => {
                                    togglePermission(section.code, resource.code, typedAction);
                                  }}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePermission(section.code, resource.code, typedAction)}
                                    disabled={false}
                                    className="data-[state=checked]:bg-current data-[state=checked]:border-current border-2 border-current"
                                  />
                                  <span className="min-w-0 text-sm font-medium break-words">{ACTION_LABELS[typedAction]}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
