/**
 * Улучшенный диалог создания/редактирования пользователя
 * Версия 2.0: Упрощенный интерфейс с улучшенной читаемостью
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { User as UserIcon, Mail, KeyRound, Shield, Eye, EyeOff, Sparkles } from 'lucide-react'
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

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string; description: string; color: string }> = [
  { value: 'active', label: 'Активен', description: 'Может входить в систему', color: 'bg-green-600' },
  { value: 'inactive', label: 'Неактивен', description: 'Вход временно запрещен', color: 'bg-yellow-600' },
  { value: 'blocked', label: 'Заблокирован', description: 'Доступ полностью запрещен', color: 'bg-red-600' }
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
  const [showPassword, setShowPassword] = useState(false)

  // Инициализация формы
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
    } else {
      setFormData({
        email: '',
        name: '',
        password: '',
        confirmPassword: '',
        status: 'active'
      })
      setSelectedRole('')
    }
    setShowPassword(false)
  }, [user, open])

  const handleGeneratePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }
    setFormData(prev => ({ ...prev, password, confirmPassword: password }))
    toast({
      title: "Пароль сгенерирован",
      description: "Скопируйте его для передачи пользователю",
      duration: 3000
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    // Валидация
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните имя и email",
        variant: "destructive"
      })
      return
    }

    // Проверка пароля при создании
    if (!user) {
      if (!formData.password) {
        toast({
          title: "Ошибка",
          description: "Установите пароль для нового пользователя",
          variant: "destructive"
        })
        return
      }
      if (formData.password.length < 6) {
        toast({
          title: "Ошибка",
          description: "Пароль должен содержать минимум 6 символов",
          variant: "destructive"
        })
        return
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Ошибка",
          description: "Пароли не совпадают",
          variant: "destructive"
        })
        return
      }
    }

    // Проверка пароля при изменении
    if (user && formData.password) {
      if (formData.password.length < 6) {
        toast({
          title: "Ошибка",
          description: "Пароль должен содержать минимум 6 символов",
          variant: "destructive"
        })
        return
      }
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Ошибка",
          description: "Пароли не совпадают",
          variant: "destructive"
        })
        return
      }
    }

    try {
      setLoading(true)

      if (user) {
        // Редактирование
        await externalUsersService.updateUser(user.id, {
          email: formData.email,
          name: formData.name,
          status: formData.status
        })

        // Обновление роли
        const currentRoleId = user.roles.length > 0 ? user.roles[0].role_id : null
        if (currentRoleId !== selectedRole) {
          if (currentRoleId) {
            await externalRolesService.removeRoleFromUser(user.id, currentRoleId)
          }
          if (selectedRole) {
            await externalRolesService.assignRoleToUser(user.id, selectedRole)
          }
        }

        // Изменение пароля если указан
        if (formData.password) {
          await externalUsersService.changePassword(user.id, formData.password)
          toast({
            title: "Пароль изменен",
            description: `Новый пароль для ${user.name} установлен`,
            duration: 5000
          })
        }

        toast({
          title: "Успешно",
          description: "Данные пользователя обновлены"
        })
      } else {
        // Создание
        await externalUsersService.createUser({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          status: formData.status,
          roles: selectedRole ? [selectedRole] : []
        })

        toast({
          title: "Создано",
          description: "Новый пользователь успешно создан"
        })
      }

      onSaved()
    } catch (error: any) {
      let errorMessage = 'Не удалось сохранить пользователя'

      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('уже существует')) {
          errorMessage = 'Пользователь с таким email уже существует'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Ошибка соединения с сервером'
        }
      }

      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const activeRoles = (roles || []).filter(r => r.is_active)
  const selectedRoleData = activeRoles.find(r => r.id === selectedRole)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-3xl max-h-[90vh]'} overflow-hidden flex flex-col bg-slate-900 border-slate-700 text-white`}>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-400" />
            </div>
            {user ? 'Редактирование пользователя' : 'Новый пользователь'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-base">
            {user ? `Изменение данных пользователя ${user.name}` : 'Создание нового пользователя в системе'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6">
          {/* Основная информация */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Mail className="w-4 h-4" />
              Основная информация
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200 text-sm font-medium">
                  Имя пользователя <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Иван Петров"
                  required
                  className="h-11 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@company.com"
                  required
                  className="h-11 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 text-sm font-medium">Статус</Label>
              <RadioGroup value={formData.status} onValueChange={(value: UserStatus) => setFormData(prev => ({ ...prev, status: value }))}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {STATUS_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      className={`relative flex items-start space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        formData.status === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${option.color}`} />
                            <span className="font-medium text-white">{option.label}</span>
                          </div>
                          <p className="text-xs text-slate-400">{option.description}</p>
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Роль */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Shield className="w-4 h-4" />
              Назначение роли
            </div>

            {activeRoles.length === 0 ? (
              <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-slate-400">Нет доступных ролей</p>
              </div>
            ) : (
              <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
                <div className="grid grid-cols-1 gap-2">
                  {/* Без роли */}
                  <div
                    className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                      selectedRole === ''
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                    }`}
                    onClick={() => setSelectedRole('')}
                  >
                    <RadioGroupItem value="" id="no-role" className="mt-1" />
                    <Label htmlFor="no-role" className="cursor-pointer flex-1">
                      <span className="font-medium text-slate-200">Без роли</span>
                      <p className="text-sm text-slate-400 mt-0.5">Базовые права доступа</p>
                    </Label>
                  </div>

                  {/* Роли */}
                  {activeRoles.map(role => (
                    <div
                      key={role.id}
                      className={`relative flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                        selectedRole === role.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                      }`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <RadioGroupItem value={role.id} id={role.id} className="mt-1" />
                      <Label htmlFor={role.id} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{role.name}</span>
                          {role.is_system && (
                            <Badge variant="secondary" className="text-xs bg-slate-600 text-slate-300">
                              Системная
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-slate-400 mb-2">{role.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{role.permissions.length} разрешений</span>
                          <span>•</span>
                          <span>
                            {role.scope === 'global' ? 'Глобальная' :
                             role.scope === 'network' ? 'Сеть' :
                             role.scope === 'trading_point' ? 'Торговая точка' : 'Назначенная'}
                          </span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Пароль */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <KeyRound className="w-4 h-4" />
                {user ? 'Изменить пароль' : 'Установить пароль'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Сгенерировать
              </Button>
            </div>

            {user && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  💡 Оставьте поля пустыми, если не хотите изменять пароль
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                  {user ? 'Новый пароль' : 'Пароль'} {!user && <span className="text-red-400">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Минимум 6 символов"
                    required={!user}
                    className="h-11 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200 text-sm font-medium">
                  Подтверждение {!user && <span className="text-red-400">*</span>}
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Повторите пароль"
                  required={!user}
                  className={`h-11 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-400">Пароли не совпадают</p>
                )}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex-row gap-2 justify-end pt-6 border-t border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
          >
            {loading ? 'Сохранение...' : user ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
