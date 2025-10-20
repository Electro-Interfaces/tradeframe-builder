/**
 * Диалог создания/редактирования пользователя
 * Включает назначение ролей и управление статусом
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { Users as UsersIcon } from 'lucide-react'
import { externalUsersService } from '@/services/externalUsersService'
import { externalRolesService } from '@/services/externalRolesService'
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
  const isMobile = useIsMobile()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    status: 'active' as UserStatus
  })
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [showResetPassword, setShowResetPassword] = useState(false)

  // Инициализация формы при изменении пользователя
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        password: '',
        confirmPassword: '',
        status: user.status
      })
      setSelectedRole(user.roles.length > 0 ? user.roles[0].role_id : '')
      setShowResetPassword(false)
    } else {
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        status: 'active'
      })
      setSelectedRole('')
      setShowResetPassword(false)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    // Валидация
    if (!user && formData.password !== formData.confirmPassword) {
      toast({
        title: "Ошибка валидации",
        description: "Пароли не совпадают. Пожалуйста, проверьте введенные пароли.",
        variant: "destructive"
      })
      return
    }

    if (!user && !formData.password) {
      toast({
        title: "Ошибка валидации", 
        description: "Пароль обязателен для создания нового пользователя.",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      if (user) {
        // Редактирование пользователя
        await externalUsersService.updateUser(user.id, {
          email: formData.email,
          name: formData.name,
          status: formData.status
        })

        // Обновляем роль пользователя
        const currentRoleId = user.roles.length > 0 ? user.roles[0].role_id : null
        
        if (currentRoleId !== selectedRole) {
          // Убираем старую роль если есть
          if (currentRoleId) {
            await externalRolesService.removeRoleFromUser(user.id, currentRoleId)
          }
          
          // Назначаем новую роль если выбрана
          if (selectedRole) {
            await externalRolesService.assignRoleToUser(user.id, selectedRole)
          }
        }

        // Сброс пароля если нужно
        if (showResetPassword && formData.password) {
          await externalUsersService.changePassword(user.id, formData.password)
        }
      } else {
        // Создание нового пользователя
        await externalUsersService.createUser({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          status: formData.status,
          roles: selectedRole ? [selectedRole] : []
        })
      }

      // Показываем уведомление об успехе
      toast({
        title: "Успешно сохранено",
        description: user ? "Данные пользователя обновлены" : "Новый пользователь создан",
        variant: "default"
      })

      onSaved()
    } catch (error: any) {
      console.error('Ошибка сохранения пользователя:', error)
      
      // Обработка специфичных ошибок
      let errorMessage = 'Произошла неизвестная ошибка при сохранении пользователя'
      
      if (error?.message) {
        const message = error.message
        
        if (message.includes('был удален ранее')) {
          // Специальная обработка для удаленных пользователей
          errorMessage = message
        } else if (message.toLowerCase().includes('duplicate key value violates unique constraint') && message.toLowerCase().includes('email')) {
          errorMessage = 'Пользователь с таким email уже существует. Пожалуйста, используйте другой email адрес.'
        } else if (message.includes('23505')) {
          errorMessage = 'Данные пользователя конфликтуют с существующими записями. Проверьте уникальность email адреса.'
        } else if (message.toLowerCase().includes('network error') || message.toLowerCase().includes('fetch')) {
          errorMessage = 'Ошибка соединения с сервером. Проверьте подключение к интернету.'
        } else if (message.toLowerCase().includes('validation')) {
          errorMessage = 'Ошибка валидации данных. Проверьте корректность введенной информации.'
        } else {
          errorMessage = 'Не удалось сохранить пользователя. Попробуйте еще раз или обратитесь к администратору.'
        }
      }
      
      toast({
        title: "Ошибка сохранения",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }


  const handleGeneratePassword = () => {
    const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    setFormData(prev => ({ ...prev, password, confirmPassword: password }))
  }

  const activeRoles = (roles || []).filter(r => r.is_active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl max-h-[90vh]'} overflow-hidden flex flex-col bg-slate-900 border-slate-700 text-white`}>
        <DialogHeader>
          <DialogTitle>
            {user ? 'Редактирование пользователя' : 'Создание нового пользователя'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {user ? 'Измените данные пользователя и назначьте роли' : 'Введите данные нового пользователя и назначьте роли'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
              <TabsTrigger value="basic" className="relative">
                Основные данные
                {(!formData.name || !formData.email) && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="roles" className="relative">
                Роли
                <Badge className="ml-2 h-5 px-1 text-xs" variant="secondary">
                  {selectedRole ? '1' : '0'}
                </Badge>
              </TabsTrigger>
              {user && <TabsTrigger value="security">Безопасность</TabsTrigger>}
            </TabsList>

            {/* Основные данные */}
            <TabsContent value="basic" className="space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@company.com"
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Иван Петров"
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  />
                </div>
              </div>


              <div className="space-y-2">
                <Label className="text-slate-200">Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: UserStatus) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {STATUS_OPTIONS.map(option => (
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

              {/* Пароль для нового пользователя */}
              {!user && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-slate-200">Пароль *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGeneratePassword}
                        className="text-slate-400 hover:text-white hover:bg-slate-700"
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
                      className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-200">Подтвердите пароль *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Повторите пароль"
                      required
                      className={`bg-slate-800 border-slate-700 text-white placeholder-slate-400 ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword 
                          ? 'border-red-500' : ''
                      }`}
                    />
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm text-red-400">Пароли не совпадают</p>
                    )}
                  </div>
                </>
              )}

              {/* Навигация */}
              <div className="flex justify-between pt-4 border-t border-slate-600">
                <div></div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('roles')}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Далее: Роли →
                </Button>
              </div>
            </TabsContent>

            {/* Роли */}
            <TabsContent value="roles" className="flex-1 overflow-y-auto space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200">Назначение ролей</CardTitle>
                  <CardDescription className="text-slate-400">
                    Выберите роли для пользователя. Разрешения будут объединены.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeRoles.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UsersIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <h3 className="text-sm font-medium text-slate-200 mb-1">Роли не найдены</h3>
                      <p className="text-xs text-slate-400">
                        В системе нет доступных ролей. Создайте роли в разделе администрирования.
                      </p>
                    </div>
                  ) : (
                    <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="space-y-2">
                      {/* Пустой вариант для сброса выбора */}
                      <div className="flex items-center space-x-3 p-3 border border-slate-600 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                        <RadioGroupItem value="" id="no-role" className="border-slate-400 text-slate-400" />
                        <Label htmlFor="no-role" className="text-slate-200 cursor-pointer flex-1">
                          <span className="font-medium">Без роли</span>
                          <p className="text-sm text-slate-400">Пользователь не будет иметь специальных прав</p>
                        </Label>
                      </div>
                      
                      {/* Роли */}
                      {activeRoles.map(role => (
                        <div key={role.id} className="flex items-center space-x-3 p-3 border border-slate-600 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                          <RadioGroupItem value={role.id} id={role.id} className="border-slate-400 text-blue-400" />
                          <Label htmlFor={role.id} className="text-slate-200 cursor-pointer flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{role.name}</span>
                              <Badge variant={role.is_system ? 'secondary' : 'default'} className="bg-slate-600 text-slate-300">
                                {role.is_system ? 'Системная' : 'Пользовательская'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400">{role.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                {role.scope === 'global' ? 'Глобальная' :
                                 role.scope === 'network' ? 'Сеть' :
                                 role.scope === 'trading_point' ? 'Торговая точка' :
                                 'Назначенная'}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {role.permissions.length} разрешений
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>

              {/* Подсказка и навигация */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="text-blue-400">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-slate-200">
                      {selectedRole ? 'Выбрана роль' : 'Роль не выбрана'}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {!selectedRole 
                        ? 'Выберите роль для пользователя'
                        : 'Пользователь получит права доступа согласно выбранной роли'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Навигация */}
                <div className="flex justify-between pt-4 border-t border-slate-600">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('basic')}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    ← Назад: Основные данные
                  </Button>
                  {user && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('security')}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Далее: Безопасность →
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Безопасность (только для редактирования) */}
            {user && (
              <TabsContent value="security" className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-200">Безопасность</CardTitle>
                    <CardDescription className="text-slate-400">
                      Настройки безопасности учетной записи
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-200">Сброс пароля</Label>
                        <p className="text-sm text-slate-400">
                          Установить новый пароль для пользователя
                        </p>
                      </div>
                      <Switch
                        checked={showResetPassword}
                        onCheckedChange={setShowResetPassword}
                      />
                    </div>

                    {showResetPassword && (
                      <div className="space-y-4 border-t border-slate-600 pt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="newPassword" className="text-slate-200">Новый пароль</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleGeneratePassword}
                              className="text-slate-400 hover:text-white hover:bg-slate-700"
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
                            className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword" className="text-slate-200">Подтвердите новый пароль</Label>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Повторите новый пароль"
                            className="bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                          />
                        </div>
                      </div>
                    )}

                    {user.last_login && (
                      <div className="border-t border-slate-600 pt-4">
                        <Label className="text-slate-200">Последний вход</Label>
                        <p className="text-sm text-slate-400">
                          {new Date(user.last_login).toLocaleString('ru-RU')}
                        </p>
                      </div>
                    )}

                    {/* Навигация */}
                    <div className="flex justify-between pt-4 border-t border-slate-600">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('roles')}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        ← Назад: Роли
                      </Button>
                      <div></div>
                    </div>
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
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Сохранение...' : (user ? 'Сохранить' : 'Создать')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}