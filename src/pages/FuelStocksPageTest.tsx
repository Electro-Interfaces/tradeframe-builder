import React from "react";

// Debug log for module loading
console.log('🚀 FuelStocksPageTest: Модуль тест загружается!');

export default function FuelStocksPageTest() {
  console.log('🔥 FuelStocksPageTest: КОМПОНЕНТ РЕНДЕРИТСЯ!');
  
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">🧪 Тест страницы остатков топлива</h1>
      <p className="text-green-400">✅ Если вы видите это сообщение, компонент работает правильно!</p>
      <div className="mt-4 p-4 bg-slate-800 rounded">
        <p className="text-slate-300">Тестовое содержимое страницы остатков топлива.</p>
        <p className="text-slate-400">Время загрузки: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}