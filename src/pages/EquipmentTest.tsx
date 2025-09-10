import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/context/SelectionContext";

export default function EquipmentTest() {
  const { selectedTradingPoint } = useSelection();

  return (
    <MainLayout>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Тестовая страница оборудования</h1>
          <p className="text-slate-400 mt-1">
            Торговая точка: {selectedTradingPoint || 'Не выбрана'}
          </p>
        </div>
        
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Статус</h2>
          <p className="text-slate-300">
            ✅ Страница загружается без ошибок
          </p>
        </div>
      </div>
    </MainLayout>
  );
}