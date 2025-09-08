import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HelpButton } from "@/components/help/HelpButton";
import { SystemTelegramSettings } from "@/components/admin/SystemTelegramSettings";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SystemIntegrations() {
  const isMobile = useIsMobile();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
              Интеграции системы
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
              Настройка внешних интеграций и сервисов для всех пользователей системы
            </p>
          </div>
          <HelpButton helpKey="system-integrations" />
        </div>

        {/* Telegram интеграция */}
        <SystemTelegramSettings />

        {/* Можно добавить другие интеграции в будущем */}
        {/* 
        <WhatsAppSystemSettings />
        <EmailSystemSettings />  
        <SmsSystemSettings />
        */}
      </div>
    </MainLayout>
  );
}