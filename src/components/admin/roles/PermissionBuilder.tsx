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
import { RoleService } from '@/services/roleService'
import { PERMISSION_SECTIONS } from '@/config/permissions'
import type { Role, PermissionAction, Permission } from '@/types/auth'

const ACTION_LABELS: Record<PermissionAction, string> = {
  'read': 'Чтение',
  'write': 'Запись', 
  'delete': 'Удаление',
  'manage': 'Управление'
}

export function PermissionBuilder() {
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
      const rolesData = await RoleService.getAllRoles()
      setRoles(rolesData)
      if (rolesData.length > 0) {
        const firstRole = rolesData[0]
        setSelectedRole(firstRole)
        setEditedPermissions([...firstRole.permissions])
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
      setEditedPermissions([...role.permissions])
    }
  }

  const hasPermission = (section: string, resource: string, action: PermissionAction): boolean => {
    const permission = editedPermissions.find(p => p.section === section && p.resource === resource)
    return permission?.actions.includes(action) || false
  }

  const togglePermission = (section: string, resource: string, action: PermissionAction) => {
    if (!selectedRole || selectedRole.is_system) return

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
    if (!selectedRole || selectedRole.is_system) return

    try {
      setSaving(true)
      await RoleService.updateRole(selectedRole.id, {
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
      setEditedPermissions([...selectedRole.permissions])
    }
  }

  const getRolePermissionCount = (role: Role): number => {
    return role.permissions.reduce((sum, p) => sum + p.actions.length, 0)
  }

  const getEditedPermissionCount = (): number => {
    return editedPermissions.reduce((sum, p) => sum + p.actions.length, 0)
  }

  const hasChanges = (): boolean => {
    if (!selectedRole) return false
    return JSON.stringify(editedPermissions) !== JSON.stringify(selectedRole.permissions)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Селектор роли */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Роль для редактирования</label>
        <Select 
          value={selectedRole?.id || ''} 
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Выберите роль" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id} className="text-white hover:bg-slate-700">
                <div className="flex items-center space-x-2">
                  <span>{role.name}</span>
                  <Badge variant={role.is_system ? 'secondary' : 'default'} className="text-xs">
                    {getRolePermissionCount(role)}
                  </Badge>
                  {role.is_system && (
                    <Badge variant="destructive" className="text-xs">Системная</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRole && (
        <div className="space-y-6">
          {/* Информация о роли */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-200">
                <div className="flex items-center space-x-2">
                  <span>{selectedRole.name}</span>
                  <Badge variant={selectedRole.is_system ? 'secondary' : 'default'}>
                    {selectedRole.is_system ? 'Системная' : 'Пользовательская'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
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
              <CardDescription className="text-slate-400">
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200 flex items-center justify-between">
                <span>Редактирование разрешений</span>
                {!selectedRole.is_system && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPermissions}
                      disabled={!hasChanges()}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Сбросить
                    </Button>
                    <Button
                      size="sm"
                      onClick={savePermissions}
                      disabled={!hasChanges() || saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {selectedRole.is_system ? 
                  'Системные роли нельзя изменять' : 
                  'Выберите разрешения для данной роли по разделам системы'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(PERMISSION_SECTIONS).map(section => (
                  <div key={section.code} className="border border-slate-600 rounded-lg p-4 bg-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-slate-200">{section.name}</h3>
                        <p className="text-sm text-slate-400">{section.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.values(section.resources).map(resource => (
                        <div key={resource.code} className="border border-slate-600 rounded p-3 bg-slate-600">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-slate-200">{resource.name}</h4>
                              <p className="text-sm text-slate-400">{resource.description}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(['read', 'write', 'delete', 'manage'] as PermissionAction[]).map(action => {
                              const isChecked = hasPermission(section.code, resource.code, action)
                              const colorClasses = {
                                read: isChecked ? 'border-green-500 bg-green-900 text-green-300' : 'border-slate-500 bg-slate-700 text-slate-400',
                                write: isChecked ? 'border-blue-500 bg-blue-900 text-blue-300' : 'border-slate-500 bg-slate-700 text-slate-400',
                                delete: isChecked ? 'border-red-500 bg-red-900 text-red-300' : 'border-slate-500 bg-slate-700 text-slate-400',
                                manage: isChecked ? 'border-purple-500 bg-purple-900 text-purple-300' : 'border-slate-500 bg-slate-700 text-slate-400'
                              }
                              
                              return (
                                <label 
                                  key={action} 
                                  className={`
                                    flex items-center justify-center space-x-2 cursor-pointer p-2 rounded border-2 transition-all hover:shadow-sm
                                    ${colorClasses[action]}
                                    ${selectedRole.is_system ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => togglePermission(section.code, resource.code, action)}
                                    disabled={selectedRole.is_system}
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