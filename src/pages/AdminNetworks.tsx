import { useState, useMemo, useEffect } from "react";
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
import { NetworksDebugSimple } from "@/components/debug/NetworksDebugSimple";
import { Network, NetworkInput } from "@/types/network";
import { networksService } from "@/services/networksService";
import { 
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SortField = 'name' | 'pointsCount' | 'external_id';
type SortOrder = 'asc' | 'desc';

const AdminNetworks = () => {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Состояния загрузки и ошибок
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Поиск и сортировка
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Данные сетей из Supabase
  const [networks, setNetworks] = useState<Network[]>([]);

  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);

  // Форма для сети
  const [networkForm, setNetworkForm] = useState({
    name: "",
    description: "",
    type: "",
    external_id: "",
    code: "",
    status: "active"
  });

  // Фильтрованные и отсортированные данные
  const filteredAndSortedNetworks = useMemo(() => {
    const filtered = networks.filter(network => 
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

  // Загрузка сетей из базы данных
  const loadNetworks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await networksService.getAll();
      setNetworks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки сетей');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка при монтировании компонента
  useEffect(() => {
    loadNetworks();
  }, []);

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

  const openNetworkDialog = (network?: Network) => {
    if (network) {
      setEditingNetwork(network);
      setNetworkForm({
        name: network.name,
        description: network.description || "",
        type: network.type || "АЗС",
        external_id: network.external_id || "",
        code: network.code || "",
        status: network.status || "active"
      });
    } else {
      setEditingNetwork(null);
      setNetworkForm({ 
        name: "", 
        description: "", 
        type: "АЗС", 
        external_id: "",
        code: "",
        status: "active"
      });
    }
    setNetworkDialogOpen(true);
  };

  const saveNetwork = async () => {
    if (!networkForm.name || !networkForm.type) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingNetwork) {
        // Обновление существующей сети
        await networksService.update(editingNetwork.id, networkForm as NetworkInput);
        toast({
          title: "Успешно",
          description: "Торговая сеть обновлена"
        });
      } else {
        // Создание новой сети
        await networksService.create(networkForm as NetworkInput);
        toast({
          title: "Успешно", 
          description: "Торговая сеть создана"
        });
      }
      
      // Перезагружаем данные
      await loadNetworks();
      setNetworkDialogOpen(false);
      setEditingNetwork(null);
      setNetworkForm({ 
        name: "", 
        description: "", 
        type: "АЗС", 
        external_id: "",
        code: "",
        status: "active"
      });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Ошибка сохранения сети",
        variant: "destructive"
      });
    }
  };

  const editNetwork = (id: string) => {
    const network = networks.find(n => n.id === id);
    if (network) openNetworkDialog(network);
  };

  const duplicateNetwork = async (id: string) => {
    const network = networks.find(n => n.id === id);
    if (network) {
      try {
        const duplicateInput: NetworkInput = {
          name: `${network.name} (копия)`,
          description: network.description,
          type: network.type,
          external_id: network.external_id ? `${network.external_id}_copy` : undefined,
          code: network.code ? `${network.code}_copy` : undefined,
          status: network.status
        };
        await networksService.create(duplicateInput);
        await loadNetworks();
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
        <div className="col-span-12 xl:col-span-8 2xl:col-span-9">
        
        {/* Отладочный компонент для диагностики */}
        <NetworksDebugSimple />
        
        {/* Шапка */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">Сети и ТТ</h1>
          <p className="text-sm text-slate-400 mb-4">Управление торговыми сетями и торговыми точками</p>
        </div>

        {/* Строка управления */}
        <div className="flex items-center justify-between gap-2 mb-3 sticky top-14 z-40 bg-slate-900/80 backdrop-blur">
          <Input 
            className="h-10 w-full" 
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
                <div>
                  <Label htmlFor="external_id">ID для API</Label>
                  <Input
                    id="external_id"
                    value={networkForm.external_id}
                    onChange={(e) => setNetworkForm(prev => ({ ...prev, external_id: e.target.value }))}
                    placeholder="ID для синхронизации с торговым API"
                  />
                </div>
                <div>
                  <Label htmlFor="code">Код сети</Label>
                  <Input
                    id="code"
                    value={networkForm.code}
                    onChange={(e) => setNetworkForm(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Уникальный код сети"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select 
                    value={networkForm.status} 
                    onValueChange={(value) => setNetworkForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="active">Активная</SelectItem>
                      <SelectItem value="inactive">Неактивная</SelectItem>
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
        <div className="panel w-full min-w-0 max-w-none min-h-[24rem]">
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
            <div className="md:hidden space-y-3">
              {filteredAndSortedNetworks.map(network => (
                <Card 
                  key={network.id} 
                  className="p-4 bg-card border-border hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(network.id)}
                >
                  <div className="space-y-3">
                    {/* Заголовок с действиями */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{network.name}</h3>
                        {network.external_id && (
                          <p className="text-xs text-blue-400 font-mono mt-1">
                            ID: {network.external_id}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {network.description}
                        </p>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <RowActions id={network.id.toString()} />
                      </div>
                    </div>
                    
                    {/* Метаданные */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {network.type}
                        </Badge>
                        <Badge variant={network.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {network.status === 'active' ? 'Активная' : 'Неактивная'}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground font-medium">
                        {network.pointsCount || 0} точек
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Десктопная версия - таблица */}
            <div className="w-full min-w-0 max-w-none overflow-x-auto scroll-thin border rounded-lg table-condensed hidden md:block">
              <table className="w-full table-fixed text-sm">
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
                    <th>
                      <button
                        className="flex items-center gap-1 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40 rounded"
                        onClick={() => handleSort('external_id')}
                        aria-label="Сортировать по ID"
                      >
                        ID
                        {getSortIcon('external_id')}
                      </button>
                    </th>
                    <th>Описание</th>
                    <th>Тип</th>
                    <th>Статус</th>
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
                    <tr
                      key={network.id}
                      role="row"
                      onClick={() => setSelectedId(network.id)}
                      className="cursor-pointer hover:bg-slate-800"
                      aria-selected={selectedId === network.id}
                    >
                      <td className="font-medium">{network.name}</td>
                      <td className="font-mono text-blue-400">
                        {network.external_id || '—'}
                      </td>
                      <td className="text-slate-400 max-w-xs truncate">
                        {network.description}
                      </td>
                      <td>
                        <Badge variant="secondary">
                          {network.type}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={network.status === 'active' ? 'default' : 'secondary'}>
                          {network.status === 'active' ? 'Активная' : 'Неактивная'}
                        </Badge>
                      </td>
                      <td>
                        <span className="font-mono tabular-nums">{network.pointsCount || 0}</span>
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
        </div>
        <div className="hidden">
          <div className="panel w-full min-w-0 max-w-none min-h-[24rem]">
            <h2 className="text-lg font-semibold mb-2">Детали сети</h2>
            <p className="text-sm text-slate-400">Выберите сеть слева для просмотра деталей.</p>
          </div>
        </div>
        {/* Таблица: Торговые точки выбранной сети */}
        <div className="panel w-full min-w-0 max-w-none min-h-[24rem]">
          <h2 className="text-lg font-semibold mb-3">Торговые точки выбранной сети</h2>
          {!selectedId ? (
            <EmptyState title="Выберите сеть выше" />
          ) : (
            <>
              {/* Мобильная версия ТТ - карточки */}
              <div className="md:hidden space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 bg-card border-border">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground">АЗС №{String(i).padStart(3, '0')}</h4>
                          <p className="text-sm text-muted-foreground">Код: A0{i}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            Город, Ул. Примерная, д. {i}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                          Активна
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Десктопная версия ТТ - таблица */}
              <div className="hidden md:block w-full min-w-0 max-w-none overflow-x-auto scroll-thin">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="h-11 border-b border-slate-700">
                      <th className="text-left">Наименование</th>
                      <th className="text-left">Код</th>
                      <th className="text-left">Адрес</th>
                      <th className="text-left">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="h-11 border-b border-slate-800">
                        <td>АЗС №{String(i).padStart(3, '0')}</td>
                        <td>A0{i}</td>
                        <td>Город, Ул. Примерная, д. {i}</td>
                        <td>
                          <span className="badge success">Активна</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminNetworks;
