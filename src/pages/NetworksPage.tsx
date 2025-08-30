import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function NetworksPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const qs = new URLSearchParams(loc.search);
  const [selectedId, setSelectedId] = useState<string | null>(qs.get("id"));

  function selectNet(id: string) {
    setSelectedId(id);
    const sp = new URLSearchParams(loc.search);
    sp.set("id", id);
    nav({ search: sp.toString() }, { replace: true });
  }

  // Временные данные для заглушки
  const networks = [
    { id: "0", name: "Автомойка Люкс" },
    { id: "1", name: "ГазПром Газ" },
    { id: "2", name: "Ромашка-Нефть" },
  ];
  
  const selectedNet = networks.find(n => n.id === selectedId);

  return (
    <div className="w-full min-w-0 h-full p-4 text-base">
      <h1 className="text-3xl font-semibold mb-1">Сети и ТТ</h1>
      <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и точками</p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-4">
        <Input
          className="h-10 w-full"
          placeholder="Поиск сетей…"
        />
        <Button className="h-10 rounded-lg md:w-auto w-full">
          + Создать сеть
        </Button>
      </div>

      <section className="w-full">
        <div className="w-full space-y-6">
          <div className="w-full">
          {/* Список сетей (верхняя таблица, full-width) */}
          <div className="panel w-full min-w-0 max-w-none min-h-[24rem]">
          {/* Десктоп: таблица */}
          <div className="hidden md:block">
            <div className="w-full min-w-0 max-w-none overflow-x-auto scroll-thin">
            <table className="w-full table-fixed text-sm">
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
                {networks.map((network, i) => (
                  <tr
                    key={network.id}
                    onClick={() => selectNet(network.id)}
                    aria-selected={selectedId === network.id}
                    className={`h-11 border-b border-slate-800 cursor-pointer hover:bg-slate-800 ${
                      selectedId === network.id ? "bg-slate-800/80" : ""
                    }`}
                  >
                    <td className="pr-2">{network.name}</td>
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
          </div>

          {/* Мобайл: карточки */}
          <div className="md:hidden space-y-2">
            {networks.map((network, i) => (
              <Card
                key={network.id}
                className={`p-3 cursor-pointer ${
                  selectedId === network.id ? "bg-slate-800/80" : ""
                }`}
                onClick={() => selectNet(network.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{network.name}</div>
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

          {/* Торговые точки выбранной сети (нижняя таблица, full-width) */}
          </div>
          <div className="panel w-full min-w-0 max-w-none min-h-[24rem]">
            <h2 className="text-lg font-semibold mb-3">Торговые точки выбранной сети</h2>
            {!selectedId ? (
              <EmptyState title="Выберите сеть слева" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">
                    Торговые точки — {selectedNet?.name ?? "…"}
                  </h2>
                  <Button className="h-10 rounded-lg">+ Создать точку</Button>
                </div>
                <div className="w-full min-w-0 max-w-none overflow-x-auto scroll-thin">
                  <table className="w-full table-fixed text-sm">
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
      </section>
    </div>
  );
}
