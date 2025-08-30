import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { 
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradingNetwork {
  id: number;
  name: string;
  description: string;
  type: "АЗС" | "АГЗС" | "Мойка";
  pointsCount: number;
}

type SortField = 'name' | 'pointsCount';
type SortOrder = 'asc' | 'desc';

const AdminNetworks = () => {
  const { toast } = useToast();
  
  // Состояния загрузки и ошибок
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Поиск и сортировка
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Mock данные для сетей
  const [networks, setNetworks] = useState<TradingNetwork[]>([
    {
      id: 1,
      name: "Ромашка-Нефть",
      description: "Крупнейшая сеть АЗС в регионе",
      type: "АЗС",
      pointsCount: 15
    },
    {
      id: 2,
      name: "ГазПром Газ",
      description: "Сеть автомобильных газовых заправочных станций",
      type: "АГЗС",
      pointsCount: 8
    },
    {
      id: 3,
      name: "Автомойка Люкс",
      description: "Премиальные автомойки",
      type: "Мойка",
      pointsCount: 5
    }
  ]);

  const [editingNetwork, setEditingNetwork] = useState<TradingNetwork | null>(null);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);

  // Форма для сети
  const [networkForm, setNetworkForm] = useState({
    name: "",
    description: "",
    type: "" as TradingNetwork["type"] | ""
  });

  // Фильтрованные и отсортированные данные
  const filteredAndSortedNetworks = useMemo(() => {
    let filtered = networks.filter(network => 
      network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      network.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const modifier = sortOrder === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      
      return (aVal > bVal ? 1 : -1) * modifier;
    });
  }, [networks, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const openNetworkDialog = (network?: TradingNetwork) => {
    if (network) {
      setEditingNetwork(network);
      setNetworkForm({
        name: network.name,
        description: network.description,
        type: network.type
      });
    } else {
      setEditingNetwork(null);
      setNetworkForm({ name: "", description: "", type: "" });
    }
    setNetworkDialogOpen(true);
  };

  const saveNetwork = () => {
    if (!networkForm.name || !networkForm.type) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    if (editingNetwork) {
      setNetworks(prev => prev.map(n => 
        n.id === editingNetwork.id 
          ? { ...n, name: networkForm.name, description: networkForm.description, type: networkForm.type as TradingNetwork["type"] }
          : n
      ));
      toast({
        title: "Успешно",
        description: "Сеть обновлена"
      });
    } else {
      const newNetwork: TradingNetwork = {
        id: Math.max(...networks.map(n => n.id)) + 1,
        name: networkForm.name,
        description: networkForm.description,
        type: networkForm.type as TradingNetwork["type"],
        pointsCount: 0
      };
      setNetworks(prev => [...prev, newNetwork]);
      toast({
        title: "Успешно",
        description: "Сеть создана"
      });
    }
    
    setNetworkDialogOpen(false);
  };

  const editNetwork = (id: string) => {
    const network = networks.find(n => n.id === parseInt(id));
    if (network) openNetworkDialog(network);
  };

  const duplicateNetwork = (id: string) => {
    const network = networks.find(n => n.id === parseInt(id));
    if (network) {
      const newNetwork: TradingNetwork = {
        ...network,
        id: Math.max(...networks.map(n => n.id)) + 1,
        name: `${network.name} (копия)`,
        pointsCount: 0
      };
      setNetworks(prev => [...prev, newNetwork]);
      toast({
        title: "Успешно",
        description: "Сеть дублирована"
      });
    }
  };

  const removeNetwork = (id: string) => {
    setNetworks(prev => prev.filter(n => n.id !== parseInt(id)));
    toast({
      title: "Успешно",
      description: "Сеть удалена"
    });
  };

  const RowActions = ({ id }: { id: string }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger 
          className="h-8 w-8 grid place-items-center rounded-md hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40"
          aria-label="Действия"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
          <DropdownMenuItem onClick={() => editNetwork(id)} className="hover:bg-slate-700">
            Редактировать
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateNetwork(id)} className="hover:bg-slate-700">
            Дублировать
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            className="text-rose-400 hover:bg-slate-700 focus:bg-slate-700" 
            onClick={() => removeNetwork(id)}
          >
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const refetch = () => {
    setError(null);
    // В реальном приложении здесь был бы запрос к API
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Сети и ТТ</h1>
            <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и торговыми точками</p>
          </div>
          <SkeletonTable rows={4} columns={5} />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="w-full space-y-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Сети и ТТ</h1>
            <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и торговыми точками</p>
          </div>
          <ErrorState onRetry={refetch} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6">
        {/* Шапка */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">Сети и ТТ</h1>
          <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и торговыми точками</p>
        </div>

        {/* Строка управления */}
        <div className="flex items-center justify-between gap-2 mb-3 sticky top-14 z-40 bg-slate-900/80 backdrop-blur">
          <Input 
            className="h-10 max-w-md" 
            placeholder="Поиск сетей…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Dialog open={networkDialogOpen} onOpenChange={setNetworkDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openNetworkDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Создать сеть
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle>
                  {editingNetwork ? "Редактировать сеть" : "Создать сеть"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Название сети *</Label>
                  <Input
                    id="name"
                    value={networkForm.name}
                    onChange={(e) => setNetworkForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Введите название сети"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={networkForm.description}
                    onChange={(e) => setNetworkForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание сети"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Тип сети *</Label>
                  <Select 
                    value={networkForm.type} 
                    onValueChange={(value) => setNetworkForm(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип сети" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="АЗС">АЗС</SelectItem>
                      <SelectItem value="АГЗС">АГЗС</SelectItem>
                      <SelectItem value="Мойка">Мойка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setNetworkDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={saveNetwork}>
                    Сохранить
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Контент */}
        {filteredAndSortedNetworks.length === 0 && searchQuery === "" ? (
          <EmptyState 
            title="Сетей нет" 
            cta={<Button onClick={() => openNetworkDialog()}>Создать сеть</Button>}
          />
        ) : filteredAndSortedNetworks.length === 0 ? (
          <EmptyState 
            title="Сети не найдены" 
            description="Попробуйте изменить поисковый запрос"
          />
        ) : (
          <>
            {/* Мобильная версия - карточки */}
            <div className="md:hidden space-y-2">
              {filteredAndSortedNetworks.map(network => (
                <Card key={network.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{network.name}</div>
                      <div className="text-xs text-slate-400 truncate">{network.description}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary">{network.type}</Badge>
                        <span className="text-xs text-slate-400">Точек: {network.pointsCount}</span>
                      </div>
                    </div>
                    <RowActions id={network.id.toString()} />
                  </div>
                </Card>
              ))}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="w-full max-w-none border rounded-lg table-condensed overflow-x-auto scroll-thin hidden md:block">
              <table>
                <thead>
                  <tr>
                    <th>
                      <button
                        className="flex items-center gap-1 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40 rounded"
                        onClick={() => handleSort('name')}
                        aria-label="Сортировать по названию"
                      >
                        Название
                        {getSortIcon('name')}
                      </button>
                    </th>
                    <th>Описание</th>
                    <th>Тип</th>
                    <th>
                      <button
                        className="flex items-center gap-1 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40 rounded"
                        onClick={() => handleSort('pointsCount')}
                        aria-label="Сортировать по количеству точек"
                      >
                        Точек
                        {getSortIcon('pointsCount')}
                      </button>
                    </th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedNetworks.map((network) => (
                    <tr key={network.id} role="row">
                      <td className="font-medium">{network.name}</td>
                      <td className="text-slate-400 max-w-xs truncate">
                        {network.description}
                      </td>
                      <td>
                        <Badge variant="secondary">
                          {network.type}
                        </Badge>
                      </td>
                      <td>
                        <span className="font-mono tabular-nums">{network.pointsCount}</span>
                      </td>
                      <td>
                        <RowActions id={network.id.toString()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminNetworks;
