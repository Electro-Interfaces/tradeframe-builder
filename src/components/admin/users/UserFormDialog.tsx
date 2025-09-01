/**
 * Диалог создания/редактирования пользователя
 * Включает назначение ролей и управление статусом
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
import { UserService } from '@/services/userService'
import { RoleService } from '@/services/roleService'
import type { User, Role, UserStatus } from '@/types/auth'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  roles?: Role[]
  onSaved: () => void
}

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string; description: string }> = [
  { value: 'active', label: 'Активен', description: 'Пользователь может входить в систему' },
  { value: 'inactive', label: 'Неактивен', description: 'Вход временно запрещен' },
  { value: 'blocked', label: 'Заблокирован', description: 'Доступ полностью запрещен' }
]

export function UserFormDialog({ open, onOpenChange, user, roles, onSaved }: UserFormDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    status: 'active' as UserStatus
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Инициализация формы при изменении пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
        status: user.status
      })
      setSelectedRoles(user.roles.map(r => r.role_id))
      setShowResetPassword(false)
    } else {
      setFormData({
        email: '',
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        status: 'active'
      })
      setSelectedRoles([])
      setShowResetPassword(false)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    // Валидация
    if (!user && formData.password !== formData.confirmPassword) {
      alert('Пароли не совпадают')
      return
    }

    if (!user && !formData.password) {
      alert('Пароль обязателен для нового пользователя')
      return
    }

    try {
      setLoading(true)

      if (user) {
        // Редактирование пользователя
        await UserService.updateUser(user.id, {
          email: formData.email,
          name: formData.name,
          phone: formData.phone || undefined,
          status: formData.status
        })

        // Обновляем роли
        const currentRoleIds = user.roles.map(r => r.role_id)
        const rolesToAdd = selectedRoles.filter(id => !currentRoleIds.includes(id))
        const rolesToRemove = currentRoleIds.filter(id => !selectedRoles.includes(id))

        // Добавляем новые роли
        for (const roleId of rolesToAdd) {
          await RoleService.assignRoleToUser({
            user_id: user.id,
            role_id: roleId
          })
        }

        // Убираем старые роли
        for (const roleId of rolesToRemove) {
          await RoleService.unassignRoleFromUser(user.id, roleId)
        }

        // Сброс пароля если нужно
        if (showResetPassword && formData.password) {
          // TODO: Реализовать сброс пароля через UserService
          console.log('Password reset would be implemented here')
        }
      } else {
        // Создание нового пользователя
        await UserService.createUser({
          tenantId: 'default_tenant', // TODO: получать из контекста
          email: formData.email,
          name: formData.name,
          phone: formData.phone || undefined,
          password: formData.password,
          status: formData.status,
          roles: selectedRoles
        })
      }

      onSaved()
    } catch (error) {
      console.error('Ошибка сохранения пользователя:', error)
      alert('Не удалось сохранить пользователя: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setSelectedRoles(current => {
      if (checked) {
        return [...current, roleId]
      } else {
        return current.filter(id => id !== roleId)
      }
    })
  }

  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    setFormData(prev => ({ ...prev, password, confirmPassword: password }))
  }

  const activeRoles = (roles || []).filter(r => r.is_active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Редактирование пользователя' : 'Создание нового пользователя'}
          </DialogTitle>
          <DialogDescription>
            {user ? 'Измените данные пользователя и назначьте роли' : 'Введите данные нового пользователя и назначьте роли'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="basic">Основные данные</TabsTrigger>
              <TabsTrigger value="roles">Роли</TabsTrigger>
              {user && <TabsTrigger value="security">Безопасность</TabsTrigger>}
            </TabsList>

            {/* Основные данные */}
            <TabsContent value="basic" className="space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@company.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Иван Петров"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: UserStatus) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
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

              {/* Пароль для нового пользователя */}
              {!user && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Пароль *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGeneratePassword}
                      >
                        Сгенерировать
                      </Button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Введите пароль"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Повторите пароль"
                      required
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* Роли */}
            <TabsContent value="roles" className="flex-1 overflow-y-auto space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Назначение ролей</CardTitle>
                  <CardDescription>
                    Выберите роли для пользователя. Разрешения будут объединены.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeRoles.map(role => (
                    <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={(checked) => handleRoleToggle(role.id, !!checked)}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{role.name}</span>
                            <Badge variant={role.is_system ? 'secondary' : 'default'}>
                              {role.is_system ? 'Системная' : 'Пользовательская'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {role.scope === 'global' ? 'Глобальная' :
                               role.scope === 'network' ? 'Сеть' :
                               role.scope === 'trading_point' ? 'Торговая точка' :
                               'Назначенная'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {role.permissions.length} разрешений
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Безопасность (только для редактирования) */}
            {user && (
              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Безопасность</CardTitle>
                    <CardDescription>
                      Настройки безопасности учетной записи
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Сброс пароля</Label>
                        <p className="text-sm text-muted-foreground">
                          Установить новый пароль для пользователя
                        </p>
                      </div>
                      <Switch
                        checked={showResetPassword}
                        onCheckedChange={setShowResetPassword}
                      />
                    </div>

                    {showResetPassword && (
                      <div className="space-y-4 border-t pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="newPassword">Новый пароль</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleGeneratePassword}
                            >
                              Сгенерировать
                            </Button>
                          </div>
                          <Input
                            id="newPassword"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Введите новый пароль"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword">Подтвердите новый пароль</Label>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Повторите новый пароль"
                          />
                        </div>
                      </div>
                    )}

                    {user.last_login && (
                      <div className="border-t pt-4">
                        <Label>Последний вход</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.last_login).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
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
              {loading ? 'Сохранение...' : (user ? 'Сохранить' : 'Создать')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}