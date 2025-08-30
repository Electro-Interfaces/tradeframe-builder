import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NetworksPage() {
  const nav = useNavigate();
  const q = new URLSearchParams(useLocation().search);
  const [selectedId, setSelectedId] = useState<string | null>(q.get("id"));

  const onSelect = (id: string) => {
    setSelectedId(id);
    const sp = new URLSearchParams(location.search);
    sp.set("id", id);
    nav({ search: sp.toString() }, { replace: true });
  };

  return (
    <div className="w-full px-4 md:px-6 py-4 text-base">
      <h1 className="text-3xl font-semibold mb-1">Сети и ТТ</h1>
      <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и точками</p>

      <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
        <Input className="h-10 w-full" placeholder="Поиск сетей…" />
        <Button className="h-10 rounded-lg">+ Создать сеть</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(22rem,28rem)_1fr] gap-4">
        {/* ЛЕВАЯ КОЛОНКА — список сетей */}
        <div className="panel overflow-auto scroll-thin">
          {/* Десктоп: таблица */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="h-11 border-b border-slate-700">
                  <th className="text-left">Название</th>
                  <th className="text-left">Описание</th>
                  <th className="text-left">Тип</th>
                  <th className="text-right">Точек</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {/* TEMP-заглушки; позже заменим привязкой к данным */}
                {["Автомойка Люкс", "ГазПром Газ", "Ромашка-Нефть"].map((n, i) => (
                  <tr
                    key={i}
                    role="row"
                    onClick={() => onSelect(String(i))}
                    className={`h-11 border-b border-slate-800 cursor-pointer hover:bg-slate-800 ${
                      selectedId === String(i) ? "bg-slate-800/80" : ""
                    }`}
                  >
                    <td className="pr-2">{n}</td>
                    <td className="pr-2 text-slate-400">Описание…</td>
                    <td className="pr-2">
                      <span className="badge info">АЗС</span>
                    </td>
                    <td className="text-right tabular-nums font-mono">{i * 3 + 5}</td>
                    <td className="text-right">⋯</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Мобайл: карточки */}
          <div className="md:hidden space-y-2">
            {["Автомойка Люкс", "ГазПром Газ", "Ромашка-Нефть"].map((n, i) => (
              <Card key={i} className="p-3" onClick={() => onSelect(String(i))}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{n}</div>
                    <div className="text-xs text-slate-400 truncate">Описание…</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="badge info">АЗС</span>
                      <span className="text-xs text-slate-400">Точек: {i * 3 + 5}</span>
                    </div>
                  </div>
                  <button className="h-8 w-8 rounded-md hover:bg-slate-800">⋯</button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — точки выбранной сети */}
        <div className="panel min-h-[24rem]">
          {!selectedId ? (
            <EmptyState title="Выберите сеть слева" />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Торговые точки</h2>
                <Button className="h-10 rounded-lg">+ Создать точку</Button>
              </div>
              <div className="overflow-auto scroll-thin">
                {/* Заглушка таблицы точек; заменим данными и колонками Название | Код | Город | Статус | Удобства | ⋯ */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="h-11 border-b border-slate-700">
                      <th className="text-left">Название</th>
                      <th className="text-left">Код</th>
                      <th className="text-left">Город</th>
                      <th className="text-left">Статус</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2].map((i) => (
                      <tr key={i} className="h-11 border-b border-slate-800">
                        <td>АЗС №00{i} — Центральная</td>
                        <td>A00{i}</td>
                        <td>Казань</td>
                        <td>
                          <span className="badge success">Активный</span>
                        </td>
                        <td className="text-right">⋯</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}