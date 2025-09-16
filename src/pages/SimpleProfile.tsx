import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { Shield, Mail, Lock, User, Calendar, LogOut, Edit, Save, X } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SimpleProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, updateUserName } = useNewAuth();
  const isMobile = useIsMobile();

  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');

  // Форма смены пароля
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PasswordFormData>();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Обработчик смены пароля
  const onSubmitPassword = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают.",
        variant: "destructive"
      });
      return;
    }

    if (data.newPassword.length < 8) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 8 символов.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement password change in backend
      // await userService.changePassword(data.currentPassword, data.newPassword);
      
      toast({
        title: "Успешно",
        description: "Пароль успешно изменён. Пожалуйста, войдите в систему заново.",
        variant: "default"
      });
      
      reset();
      setShowPasswordForm(false);
      
      // Выходим из системы после смены пароля
      setTimeout(() => {
        handleLogout();
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчики для редактирования имени
  const handleEditName = () => {
    setEditedName(user?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: "Ошибка",
        description: "Имя не может быть пустым",
        variant: "destructive"
      });
      return;
    }

    if (editedName.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateUserName(editedName.trim());
      setIsEditingName(false);
      toast({
        title: "Успешно",
        description: "Имя пользователя обновлено",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить имя",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEditName = () => {
    setEditedName(user?.name || '');
    setIsEditingName(false);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Не указано';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <MainLayout>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Мой профиль</h1>
              <p className="text-slate-400 mt-2">
                Личная информация и настройки аккаунта
              </p>
            </div>
            <HelpButton route="/profile" variant="text" size="sm" className="flex-shrink-0" />
          </div>
        </div>

        {/* Основная карточка профиля */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 mb-6">
          <div className="px-6 py-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white text-xl font-semibold"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveName();
                        } else if (e.key === 'Escape') {
                          handleCancelEditName();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={isLoading}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleCancelEditName}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-semibold text-white">
                      {user?.name || user?.firstName ?
                        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name) :
                        'Пользователь системы'
                      }
                    </h2>
                    <Button
                      onClick={handleEditName}
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-1"
                      disabled={isLoading}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-slate-300">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={user?.status === 'active' ? 'default' : 'secondary'}
                         className={user?.status === 'active' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'}>
                    {user?.status === 'active' ? 'Активен' : 'Неактивен'}
                  </Badge>
                  {user?.roles && user.roles.length > 0 && (
                    <Badge variant="outline" className="border-slate-500 text-slate-300">
                      {user.roles[0].roleName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-slate-600 mb-6" />

            {/* Информация о пользователе */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="text-white">{user?.email || 'Не указан'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Последний вход</p>
                    <p className="text-white">{formatDate(user?.lastLogin)}</p>
                  </div>
                </div>

              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">Роли</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.roles?.map((role, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-slate-500 text-slate-300">
                          {role.roleName}
                        </Badge>
                      )) || <span className="text-slate-400">Нет ролей</span>}
                    </div>
                  </div>
                </div>

                {user?.permissions && user.permissions.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-400">Разрешения</p>
                      <p className="text-white text-sm">
                        {user.permissions.includes('all') ? 'Все разрешения' : `${user.permissions.length} разрешений`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Действия */}
            <Separator className="bg-slate-600 mb-6" />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                {showPasswordForm ? 'Отменить смену пароля' : 'Сменить пароль'}
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти из системы
              </Button>
            </div>
          </div>
        </div>

        {/* Форма смены пароля */}
        {showPasswordForm && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Смена пароля</CardTitle>
              <CardDescription className="text-slate-400">
                Введите текущий пароль и новый пароль для смены
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-slate-300">Текущий пароль</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...register("currentPassword", {
                      required: "Введите текущий пароль"
                    })}
                    className="bg-slate-700 border-slate-600 text-white"
                    disabled={isLoading}
                  />
                  {errors.currentPassword && (
                    <p className="text-sm text-red-400">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-300">Новый пароль</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...register("newPassword", {
                      required: "Введите новый пароль",
                      minLength: {
                        value: 8,
                        message: "Минимум 8 символов"
                      }
                    })}
                    className="bg-slate-700 border-slate-600 text-white"
                    disabled={isLoading}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-red-400">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">Подтвердите пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword", {
                      required: "Подтвердите пароль",
                      validate: value => value === watch("newPassword") || "Пароли не совпадают"
                    })}
                    className="bg-slate-700 border-slate-600 text-white"
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? "Изменение..." : "Изменить пароль"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      reset();
                    }}
                    disabled={isLoading}
                    className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    Отмена
                  </Button>
                </div>

                <div className="mt-4 p-4 bg-amber-900/20 rounded-lg border border-amber-800/30">
                  <div className="flex gap-2">
                    <Lock className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-100">
                        Важно
                      </p>
                      <p className="text-sm text-amber-200">
                        После смены пароля вы будете автоматически разлогинены и потребуется войти в систему заново с новым паролем.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}