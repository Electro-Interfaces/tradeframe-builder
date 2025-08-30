import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
}

// Mock данные пользователя
const mockUserData = {
  firstName: "Иван",
  lastName: "Петров",
  phone: "+7 (999) 123-45-67",
  email: "ivan.petrov@tradecontrol.ru",
  roles: [
    { name: "Администратор Сети", scope: "Ромашка-Нефть" },
    { name: "Оператор", scope: "АЗС-5" }
  ]
};

export default function Profile() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: mockUserData.firstName,
      lastName: mockUserData.lastName,
      phone: mockUserData.phone
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    
    // Симуляция сохранения данных
    setTimeout(() => {
      console.log("Profile updated:", data);
      
      toast({
        title: "Профиль успешно обновлен",
        description: "Ваши данные сохранены.",
      });
      
      reset(data);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
            Профиль пользователя
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            Управляйте своей личной информацией и настройками аккаунта
          </p>
        </div>

        {/* Profile Form */}
        <Card className={`${isMobile ? 'mx-0' : 'max-w-2xl'}`}>
          <CardHeader>
            <CardTitle>Информация профиля</CardTitle>
            <CardDescription>
              Обновите свои личные данные и просмотрите информацию об аккаунте
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Секция 1: Личная информация */}
              <div>
                <h3 className="text-lg font-medium mb-4">Личная информация</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Имя</Label>
                    <Input
                      id="firstName"
                      {...register("firstName", {
                        required: "Имя обязательно для заполнения"
                      })}
                      className={errors.firstName ? "border-destructive" : ""}
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Фамилия</Label>
                    <Input
                      id="lastName"
                      {...register("lastName", {
                        required: "Фамилия обязательна для заполнения"
                      })}
                      className={errors.lastName ? "border-destructive" : ""}
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 mt-4">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone", {
                      required: "Телефон обязателен для заполнения",
                      pattern: {
                        value: /^(\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/,
                        message: "Введите корректный номер телефона"
                      }
                    })}
                    placeholder="+7 (999) 123-45-67"
                    className={errors.phone ? "border-destructive" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Секция 2: Информация об аккаунте */}
              <div>
                <h3 className="text-lg font-medium mb-4">Информация об аккаунте</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={mockUserData.email}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-sm text-muted-foreground">
                      Email используется для входа и не может быть изменен
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Назначенные роли</Label>
                    <div className="flex flex-wrap gap-2">
                      {mockUserData.roles.map((role, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {role.name}: {role.scope}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Роли назначаются администратором системы
                    </p>
                  </div>
                </div>
              </div>

              {/* Кнопка сохранения */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={!isDirty || isLoading}
                  className="min-w-[150px]"
                >
                  {isLoading ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}