import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PriceHistoryPage() {
  const isMobile = useIsMobile();
  
  // Симулируем глобальные селекторы - в реальном приложении это будет из контекста
  const [selectedNetwork] = useState("network-1");
  const [selectedTradingPoint] = useState(null); // null = выбрана только сеть, string = конкретная точка

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  return (
    <MainLayout>
      <div className={`${isMobile ? 'w-full' : 'fixed top-16 left-64 right-0 bottom-0 overflow-y-auto'}`}>
        <div className={`space-y-6 w-full ${isMobile ? 'p-2' : 'p-4'}`}>
        {/* Заголовок страницы */}
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">История цен</h1>
          <p className="text-slate-400 mt-2">
            {isNetworkOnly && "История изменений цен по торговой сети"}
            {isTradingPointSelected && "История изменений цен торговой точки"}
            {!selectedNetwork && "Выберите сеть для просмотра истории цен"}
          </p>
        </div>

        {/* Карточка: История цен */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">💰</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Отчет по истории цен</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="text-slate-400 text-center py-8">
              Здесь будет отчет по истории изменений цен
            </div>
          </div>
        </div>
        </div>
      </div>
    </MainLayout>
  );
}