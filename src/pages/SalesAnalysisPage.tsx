import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SalesAnalysisSimple } from "@/components/reports/SalesAnalysisSimple";
import { SalesAnalysisChartsSimple } from "@/components/reports/SalesAnalysisChartsSimple";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";

export default function SalesAnalysisPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  return (
    <MainLayout fullWidth={true}>
      <div className="space-y-6 w-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Анализ продаж</h1>
          <p className="text-slate-400 mt-2">
            {isNetworkOnly && "Детальный анализ продаж по всей торговой сети"}
            {isTradingPointSelected && "Детальный анализ продаж торговой точки"}
            {!selectedNetwork && "Выберите сеть для просмотра анализа продаж"}
          </p>
        </div>

        {/* Карточка: Анализ продаж */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">📈</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Детальный анализ продаж</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-8">
              <SalesAnalysisSimple 
                selectedNetwork={selectedNetwork}
                selectedTradingPoint={selectedTradingPoint}
              />
              <SalesAnalysisChartsSimple 
                selectedNetwork={selectedNetwork}
                selectedTradingPoint={selectedTradingPoint}
              />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}