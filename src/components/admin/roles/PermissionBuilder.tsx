/**
 * Визуальный конструктор разрешений
 * Показывает матрицу разрешений по разделам и ресурсам
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { RoleService } from '@/services/roleService'
import { PERMISSION_SECTIONS } from '@/config/permissions'
import type { Role, PermissionAction } from '@/types/auth'

const ACTION_LABELS: Record<PermissionAction, string> = {
  'read': 'Чтение',
  'write': 'Запись', 
  'delete': 'Удаление',
  'manage': 'Управление'
}

const ACTION_COLORS: Record<PermissionAction, string> = {
  'read': 'bg-green-100 text-green-800',
  'write': 'bg-blue-100 text-blue-800',
  'delete': 'bg-red-100 text-red-800',
  'manage': 'bg-purple-100 text-purple-800'
}

export function PermissionBuilder() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedSection, setSelectedSection] = useState<string>('networks')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    try {
      setLoading(true)
      const rolesData = await RoleService.getAllRoles()
      setRoles(rolesData)
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0])
      }
    } catch (error) {
      console.error('Ошибка загрузки ролей:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (role: Role, section: string, resource: string, action: PermissionAction): boolean => {
    const permission = role.permissions.find(p => p.section === section && p.resource === resource)
    return permission?.actions.includes(action) || false
  }

  const getSectionPermissions = (role: Role, sectionCode: string) => {
    return role.permissions.filter(p => p.section === sectionCode)
  }

  const getRolePermissionCount = (role: Role): number => {
    return role.permissions.reduce((sum, p) => sum + p.actions.length, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentSection = PERMISSION_SECTIONS[selectedSection.toUpperCase()]

  return (
    <div className="space-y-6">
      {/* Селекторы */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Роль для анализа</label>
          <Select 
            value={selectedRole?.id || ''} 
            onValueChange={(value) => {
              const role = roles.find(r => r.id === value)
              setSelectedRole(role || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите роль" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center space-x-2">
                    <span>{role.name}</span>
                    <Badge variant={role.is_system ? 'secondary' : 'default'} className="text-xs">
                      {getRolePermissionCount(role)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Раздел системы</label>
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(PERMISSION_SECTIONS).map(section => (
                <SelectItem key={section.code} value={section.code}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedRole && currentSection && (
        <div className="space-y-6">
          {/* Информация о роли */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{selectedRole.name}</span>
                  <Badge variant={selectedRole.is_system ? 'secondary' : 'default'}>
                    {selectedRole.is_system ? 'Системная' : 'Пользовательская'}
                  </Badge>
                </div>
                <Badge variant="outline">
                  {getRolePermissionCount(selectedRole)} разрешений
                </Badge>
              </CardTitle>
              <CardDescription>
                {selectedRole.description} • Область: {
                  selectedRole.scope === 'global' ? 'Глобальная' :
                  selectedRole.scope === 'network' ? 'Сеть' :
                  selectedRole.scope === 'trading_point' ? 'Торговая точка' :
                  'Назначенная'
                }
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Таблица разрешений по разделу */}
          <Card>
            <CardHeader>
              <CardTitle>Разрешения в разделе: {currentSection.name}</CardTitle>
              <CardDescription>{currentSection.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ресурс</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="text-center">Чтение</TableHead>
                    <TableHead className="text-center">Запись</TableHead>
                    <TableHead className="text-center">Удаление</TableHead>
                    <TableHead className="text-center">Управление</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(currentSection.resources).map(resource => (
                    <TableRow key={resource.code}>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resource.description}
                      </TableCell>
                      {(['read', 'write', 'delete', 'manage'] as PermissionAction[]).map(action => (
                        <TableCell key={action} className="text-center">
                          {hasPermission(selectedRole, currentSection.code, resource.code, action) ? (
                            <Badge className={ACTION_COLORS[action]} variant="secondary">
                              ✓
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Матрица всех разрешений роли */}
          <Card>
            <CardHeader>
              <CardTitle>Полная матрица разрешений</CardTitle>
              <CardDescription>
                Все разрешения роли по разделам системы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.values(PERMISSION_SECTIONS).map(section => {
                  const sectionPermissions = getSectionPermissions(selectedRole, section.code)
                  
                  if (sectionPermissions.length === 0) {
                    return null
                  }

                  return (
                    <div key={section.code} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{section.name}</h4>
                        <Badge variant="outline">
                          {sectionPermissions.length} ресурсов
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {sectionPermissions.map(permission => {
                          const resource = Object.values(section.resources).find(r => r.code === permission.resource)
                          if (!resource) return null

                          return (
                            <div key={permission.resource} className="border rounded p-3">
                              <div className="font-medium text-sm mb-2">{resource.name}</div>
                              <div className="flex flex-wrap gap-1">
                                {permission.actions.map(action => (
                                  <Badge 
                                    key={action}
                                    className={`text-xs ${ACTION_COLORS[action]}`}
                                    variant="secondary"
                                  >
                                    {ACTION_LABELS[action]}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}