import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesAnalysis } from "@/components/reports/SalesAnalysis";
import { OperationsTransactions } from "@/components/reports/OperationsTransactions";
import { PriceHistory } from "@/components/reports/PriceHistory";
import { FuelStocks } from "@/components/reports/FuelStocks";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NetworkOverview() {
  const isMobile = useIsMobile();
  
  // Симулируем глобальные селекторы - в реальном приложении это будет из контекста
  const [selectedNetwork] = useState("network-1");
  const [selectedTradingPoint] = useState(null); // null = выбрана только сеть, string = конкретная точка

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
            Отчеты по сети
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
            {isNetworkOnly && "Аналитика по всей торговой сети"}
            {isTradingPointSelected && "Детальная аналитика торговой точки"}
            {!selectedNetwork && "Выберите сеть для просмотра отчетов"}
          </p>
        </div>

        {/* Reports Tabs */}
        <Tabs defaultValue="sales-analysis" className="space-y-4">
          {isMobile ? (
            <TabsList className="grid w-full grid-cols-2 h-auto gap-2">
              <TabsTrigger 
                value="sales-analysis" 
                className="text-xs py-2 px-1 data-[state=active]:bg-primary"
              >
                Анализ продаж
              </TabsTrigger>
              <TabsTrigger 
                value="operations"
                className="text-xs py-2 px-1 data-[state=active]:bg-primary"
              >
                Операции
              </TabsTrigger>
              <TabsTrigger 
                value="price-history"
                className="text-xs py-2 px-1 data-[state=active]:bg-primary"
              >
                Цены
              </TabsTrigger>
              <TabsTrigger 
                value="fuel-stocks"
                className="text-xs py-2 px-1 data-[state=active]:bg-primary"
              >
                Остатки
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList>
              <TabsTrigger value="sales-analysis">Анализ продаж</TabsTrigger>
              <TabsTrigger value="operations">Операции и Транзакции</TabsTrigger>
              <TabsTrigger value="price-history">История изменений цен</TabsTrigger>
              <TabsTrigger value="fuel-stocks">Остатки топлива</TabsTrigger>
            </TabsList>
          )}
          
          <TabsContent value="sales-analysis">
            <SalesAnalysis 
              isNetworkOnly={isNetworkOnly} 
              isTradingPointSelected={isTradingPointSelected}
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
          </TabsContent>
          
          <TabsContent value="operations">
            <OperationsTransactions 
              isNetworkOnly={isNetworkOnly} 
              isTradingPointSelected={isTradingPointSelected}
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
          </TabsContent>
          
          <TabsContent value="price-history">
            <PriceHistory 
              isNetworkOnly={isNetworkOnly} 
              isTradingPointSelected={isTradingPointSelected}
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
          </TabsContent>
          
          <TabsContent value="fuel-stocks">
            <FuelStocks 
              isNetworkOnly={isNetworkOnly} 
              isTradingPointSelected={isTradingPointSelected}
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}