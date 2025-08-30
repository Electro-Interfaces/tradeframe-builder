import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkChat } from "@/components/messages/NetworkChat";
import { TechSupport } from "@/components/messages/TechSupport";

export default function Messages() {
  return (
    <MainLayout>
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 border-b">
          <h1 className="text-3xl font-bold text-foreground p-6 pb-4">Сообщения</h1>
          
          <Tabs defaultValue="network-chat" className="px-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="network-chat">Чат Сети</TabsTrigger>
              <TabsTrigger value="tech-support">Техподдержка</TabsTrigger>
            </TabsList>
            
            <TabsContent value="network-chat" className="mt-6 h-full">
              <NetworkChat />
            </TabsContent>
            
            <TabsContent value="tech-support" className="mt-6 h-full">
              <TechSupport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}