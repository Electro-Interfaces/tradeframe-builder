import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { UserService } from "@/services/userService";
import { Shield, Mail, Lock, User, Settings, Calendar, MapPin, Network, AlertCircle } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
}

interface EmailFormData {
  newEmail: string;
  confirmEmail: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Profile() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Форма профиля
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
    reset: resetProfile
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || ""
    }
  });

  // Форма смены email
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
    reset: resetEmail,
    watch: watchEmail
  } = useForm<EmailFormData>();

  // Форма смены пароля
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword
  } = useForm<PasswordFormData>();

  // Обработчик обновления профиля
  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      // Используем простое localStorage для демо версии
      const userData = {
        ...user,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone
      };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      await refreshUser();
      
      toast({
        title: "Профиль обновлен",
        description: "Ваши данные успешно сохранены.",
      });
      
      resetProfile(data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить профиль.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик смены email
  const onSubmitEmail = async (data: EmailFormData) => {
    if (data.newEmail !== data.confirmEmail) {
      toast({
        title: "Ошибка",
        description: "Email адреса не совпадают.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Демо версия - просто обновляем localStorage
      const userData = {
        ...user,
        email: data.newEmail
      };
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      await refreshUser();
      
      toast({
        title: "Email изменен",
        description: "Ваш email успешно обновлен.",
      });
      
      resetEmail();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить email.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      // В демо версии просто показываем успешное изменение
      // В реальной системе здесь был бы вызов API
      
      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно обновлен.",
      });
      
      resetPassword();
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

  // Получаем все разрешения пользователя
  const allPermissions = user?.permissions || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
              Профиль пользователя
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
              Управляйте своей личной информацией, безопасностью и правами доступа
            </p>
          </div>
          <HelpButton helpKey="profile" />
        </div>

        {/* Информационные карточки */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{user?.email}</div>
              <p className="text-xs text-muted-foreground">Логин для входа</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={user?.status === 'active' ? 'default' : 'secondary'}>
                {user?.status === 'active' ? 'Активен' : 'Неактивен'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Состояние аккаунта</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Роли</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user?.roles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Назначенных ролей</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Последний вход</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ru-RU') : 'Н/Д'}
              </div>
              <p className="text-xs text-muted-foreground">
                {user?.lastLogin ? new Date(user.lastLogin).toLocaleTimeString('ru-RU') : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Табы с настройками */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
            <TabsTrigger value="permissions">Права доступа</TabsTrigger>
            <TabsTrigger value="preferences">Предпочтения</TabsTrigger>
          </TabsList>

          {/* Вкладка Профиль */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Личная информация</CardTitle>
                <CardDescription>
                  Обновите свои личные данные
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Имя</Label>
                      <Input
                        id="firstName"
                        {...registerProfile("firstName", {
                          required: "Имя обязательно"
                        })}
                        placeholder="Иван"
                      />
                      {profileErrors.firstName && (
                        <p className="text-sm text-red-500">{profileErrors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Фамилия</Label>
                      <Input
                        id="lastName"
                        {...registerProfile("lastName", {
                          required: "Фамилия обязательна"
                        })}
                        placeholder="Иванов"
                      />
                      {profileErrors.lastName && (
                        <p className="text-sm text-red-500">{profileErrors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      {...registerProfile("phone")}
                      placeholder="+7 (999) 123-45-67"
                      type="tel"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={!isProfileDirty || isLoading}
                  >
                    {isLoading ? "Сохранение..." : "Сохранить изменения"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Вкладка Безопасность */}
          <TabsContent value="security" className="space-y-4">
            {/* Смена email */}
            <Card>
              <CardHeader>
                <CardTitle>Изменить Email (логин)</CardTitle>
                <CardDescription>
                  Изменение email адреса для входа в систему
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Новый Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      {...registerEmail("newEmail", {
                        required: "Email обязателен",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Неверный формат email"
                        }
                      })}
                      placeholder="новый@email.ru"
                    />
                    {emailErrors.newEmail && (
                      <p className="text-sm text-red-500">{emailErrors.newEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmEmail">Подтвердите Email</Label>
                    <Input
                      id="confirmEmail"
                      type="email"
                      {...registerEmail("confirmEmail", {
                        required: "Подтвердите email",
                        validate: value => value === watchEmail("newEmail") || "Email не совпадают"
                      })}
                      placeholder="новый@email.ru"
                    />
                    {emailErrors.confirmEmail && (
                      <p className="text-sm text-red-500">{emailErrors.confirmEmail.message}</p>
                    )}
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Изменение..." : "Изменить Email"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Смена пароля */}
            <Card>
              <CardHeader>
                <CardTitle>Изменить пароль</CardTitle>
                <CardDescription>
                  Регулярно меняйте пароль для безопасности аккаунта
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Текущий пароль</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      {...registerPassword("currentPassword", {
                        required: "Введите текущий пароль"
                      })}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Новый пароль</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      {...registerPassword("newPassword", {
                        required: "Введите новый пароль",
                        minLength: {
                          value: 8,
                          message: "Минимум 8 символов"
                        }
                      })}
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...registerPassword("confirmPassword", {
                        required: "Подтвердите пароль",
                        validate: value => value === watchPassword("newPassword") || "Пароли не совпадают"
                      })}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Изменение..." : "Изменить пароль"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Вкладка Права доступа */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Ваши права доступа</CardTitle>
                <CardDescription>
                  Роли и разрешения, назначенные вашему аккаунту
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Роли */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Назначенные роли</h3>
                  <div className="space-y-2">
                    {user?.roles?.map((role, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium">{role.roleName}</p>
                            <p className="text-sm text-muted-foreground">
                              Область: {role.scope} {role.scopeValue && `- ${role.scopeValue}`}
                            </p>
                          </div>
                        </div>
                        <Badge>{role.permissions.length} разрешений</Badge>
                      </div>
                    )) || (
                      <p className="text-muted-foreground">Нет назначенных ролей</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Разрешения */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Все разрешения</h3>
                  <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {allPermissions.length > 0 ? (
                        allPermissions.map((perm, index) => (
                          <div key={index} className="text-sm">
                            <code className="bg-muted px-2 py-1 rounded">
                              {perm}
                            </code>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground">Нет назначенных разрешений</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Вкладка Предпочтения */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Настройки интерфейса</CardTitle>
                <CardDescription>
                  Настройте интерфейс под свои предпочтения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Последняя выбранная сеть</p>
                      <p className="text-sm text-muted-foreground">
                        {user?.preferences?.lastSelectedNetwork || 'Не выбрана'}
                      </p>
                    </div>
                    <Network className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Последняя выбранная торговая точка</p>
                      <p className="text-sm text-muted-foreground">
                        {user?.preferences?.lastSelectedTradingPoint || 'Не выбрана'}
                      </p>
                    </div>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Язык интерфейса</p>
                      <p className="text-sm text-muted-foreground">Русский</p>
                    </div>
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          Автоматическое сохранение
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Ваши предпочтения сохраняются автоматически при выборе сети или торговой точки
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}