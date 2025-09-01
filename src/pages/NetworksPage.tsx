import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NetworkCreateDialog } from "@/components/dialogs/NetworkCreateDialog";
import { NetworkEditDialog } from "@/components/dialogs/NetworkEditDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { TradingPointCreateDialog } from "@/components/dialogs/TradingPointCreateDialog";
import { TradingPointEditDialog } from "@/components/dialogs/TradingPointEditDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MapPin, MoreHorizontal, Plus } from "lucide-react";
import { Network, NetworkInput } from "@/types/network";
import { TradingPoint, TradingPointInput, TradingPointUpdateInput } from "@/types/tradingpoint";
import { networksRepo } from "@/repositories";
import { tradingPointsRepo } from "@/repositories/tradingPointsRepo";
import { useToast } from "@/hooks/use-toast";

export default function NetworksPage() {
  const { toast } = useToast();
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [networks, setNetworks] = useState<Network[]>([]);
  const [tradingPoints, setTradingPoints] = useState<TradingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNetwork, setDeletingNetwork] = useState<Network | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Trading point dialogs state
  const [pointCreateDialogOpen, setPointCreateDialogOpen] = useState(false);
  const [pointEditDialogOpen, setPointEditDialogOpen] = useState(false);
  const [editingTradingPoint, setEditingTradingPoint] = useState<TradingPoint | null>(null);
  const [pointDeleteDialogOpen, setPointDeleteDialogOpen] = useState(false);
  const [deletingTradingPoint, setDeletingTradingPoint] = useState<TradingPoint | null>(null);
  const [pointActionLoading, setPointActionLoading] = useState<string | null>(null);

  // Load networks on component mount
  useEffect(() => {
    loadNetworks();
  }, []);

  // Load trading points when selected network changes
  useEffect(() => {
    if (selectedNetworkId) {
      loadTradingPoints(selectedNetworkId);
    } else {
      setTradingPoints([]);
    }
  }, [selectedNetworkId]);

  const loadNetworks = async () => {
    try {
      setLoading(true);
      const data = await networksRepo.list();
      setNetworks(data);
      
      // Set first network as selected if none selected
      if (!selectedNetworkId && data.length > 0) {
        setSelectedNetworkId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading networks:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список сетей",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTradingPoints = async (networkId: string) => {
    try {
      setPointsLoading(true);
      const points = await tradingPointsRepo.getByNetworkId(networkId);
      setTradingPoints(points);
    } catch (error) {
      console.error('Error loading trading points:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить торговые точки",
        variant: "destructive"
      });
    } finally {
      setPointsLoading(false);
    }
  };

  const handleCreate = async (input: NetworkInput) => {
    setActionLoading('create');
    try {
      const created = await networksRepo.create(input);
      setNetworks(prev => [created, ...prev]);
      
      toast({
        title: "Успешно",
        description: "Сеть создана"
      });
      
      // Select the newly created network
      setSelectedNetworkId(created.id);
    } catch (error) {
      console.error('Error creating network:', error);
      toast({
        title: "Ошибка", 
        description: "Не удалось создать сеть",
        variant: "destructive"
      });
      throw error; // Re-throw to let dialog handle loading state
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (network: Network) => {
    setEditingNetwork(network);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (id: string, input: NetworkInput) => {
    setActionLoading(`update-${id}`);
    try {
      const updated = await networksRepo.update(id, input);
      setNetworks(prev => prev.map(n => n.id === id ? updated : n));
      
      toast({
        title: "Успешно",
        description: "Сеть обновлена"
      });
    } catch (error) {
      console.error('Error updating network:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить сеть", 
        variant: "destructive"
      });
      throw error; // Re-throw to let dialog handle loading state
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (network: Network) => {
    setDeletingNetwork(network);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingNetwork) return;
    
    setDeleteLoading(true);
    setActionLoading(`delete-${deletingNetwork.id}`);
    try {
      await networksRepo.remove(deletingNetwork.id);
      
      // Remove from list and reset selection if it was selected
      setNetworks(prev => prev.filter(n => n.id !== deletingNetwork.id));
      if (selectedNetworkId === deletingNetwork.id) {
        // Auto-select first remaining network if any
        const remainingNetworks = networks.filter(n => n.id !== deletingNetwork.id);
        setSelectedNetworkId(remainingNetworks.length > 0 ? remainingNetworks[0].id : null);
      }
      
      toast({
        title: "Успешно",
        description: "Сеть и её торговые точки удалены"
      });
    } catch (error) {
      console.error('Error deleting network:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сеть",
        variant: "destructive"
      });
      throw error; // Re-throw to let dialog handle error state
    } finally {
      setDeleteLoading(false);
      setActionLoading(null);
      setDeletingNetwork(null);
    }
  };

  // Trading point handlers
  const handlePointCreate = async (input: TradingPointInput) => {
    if (!selectedNetworkId) return;

    setPointActionLoading('create');
    try {
      const created = await tradingPointsRepo.create(selectedNetworkId, input);
      setTradingPoints(prev => [created, ...prev]);
      
      // Update network points count
      await loadNetworks();
      
      toast({
        title: "Успешно",
        description: "Торговая точка создана"
      });
    } catch (error) {
      console.error('Error creating trading point:', error);
      toast({
        title: "Ошибка", 
        description: "Не удалось создать торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setPointActionLoading(null);
    }
  };

  const handlePointEdit = (point: TradingPoint) => {
    setEditingTradingPoint(point);
    setPointEditDialogOpen(true);
  };

  const handlePointUpdate = async (id: string, input: TradingPointUpdateInput) => {
    setPointActionLoading('edit');
    try {
      const updated = await tradingPointsRepo.update(id, input);
      setTradingPoints(prev => prev.map(p => p.id === id ? updated : p));
      
      toast({
        title: "Успешно",
        description: "Торговая точка обновлена"
      });
    } catch (error) {
      console.error('Error updating trading point:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setPointActionLoading(null);
      setEditingTradingPoint(null);
    }
  };

  const handlePointDelete = (point: TradingPoint) => {
    setDeletingTradingPoint(point);
    setPointDeleteDialogOpen(true);
  };

  const handlePointDeleteConfirm = async () => {
    if (!deletingTradingPoint) return;

    setPointActionLoading('delete');
    try {
      await tradingPointsRepo.delete(deletingTradingPoint.id);
      setTradingPoints(prev => prev.filter(p => p.id !== deletingTradingPoint.id));
      
      // Update network points count
      await loadNetworks();
      
      toast({
        title: "Успешно",
        description: "Торговая точка удалена"
      });
    } catch (error) {
      console.error('Error deleting trading point:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить торговую точку",
        variant: "destructive"
      });
      throw error;
    } finally {
      setPointActionLoading(null);
      setDeletingTradingPoint(null);
    }
  };

  // External codes handlers
  const handlePointAddExternalCode = async (pointId: string, system: string, code: string, description?: string) => {
    try {
      const updated = await tradingPointsRepo.addExternalCode(pointId, system, code, description);
      setTradingPoints(prev => prev.map(p => p.id === pointId ? updated : p));
      
      toast({
        title: "Успешно",
        description: "Внешний код добавлен"
      });
    } catch (error) {
      console.error('Error adding external code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить внешний код",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handlePointUpdateExternalCode = async (pointId: string, codeId: string, system: string, code: string, description?: string, isActive?: boolean) => {
    try {
      // Update external code through repository
      const point = tradingPoints.find(p => p.id === pointId);
      if (!point) return;

      const updatedCodes = point.externalCodes.map(ec => 
        ec.id === codeId 
          ? { ...ec, system, code, description, isActive: isActive ?? ec.isActive, updatedAt: new Date() }
          : ec
      );
      
      const updatedPoint = { ...point, externalCodes: updatedCodes, updatedAt: new Date() };
      setTradingPoints(prev => prev.map(p => p.id === pointId ? updatedPoint : p));
      
      toast({
        title: "Успешно",
        description: "Внешний код обновлен"
      });
    } catch (error) {
      console.error('Error updating external code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить внешний код",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handlePointRemoveExternalCode = async (pointId: string, codeId: string) => {
    try {
      const updated = await tradingPointsRepo.removeExternalCode(pointId, codeId);
      setTradingPoints(prev => prev.map(p => p.id === pointId ? updated : p));
      
      toast({
        title: "Успешно",
        description: "Внешний код удален"
      });
    } catch (error) {
      console.error('Error removing external code:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить внешний код",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);

  if (loading) {
    return (
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Настройки сетей и торговых точек</h1>
        </div>
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="text-white">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
      {/* Заголовок страницы */}
      <div className="mb-6 pt-4">
        <h1 className="text-2xl font-semibold text-white">Настройки сетей и торговых точек</h1>
      </div>

      {/* Панель торговых сетей */}
      <div className="bg-slate-800 mb-6 w-full rounded-lg">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🏪</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Торговые сети</h2>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              disabled={actionLoading === 'create'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
            >
              {actionLoading === 'create' ? 'Создание...' : '+ Создать сеть'}
            </Button>
          </div>
        </div>

        {networks.length === 0 && !loading ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Нет торговых сетей" 
              description="Создайте первую торговую сеть для начала работы"
              cta={
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать сеть
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block w-full">
              <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
            <table className="w-full text-sm min-w-full table-fixed">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '40%'}}>НАЗВАНИЕ</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ТИП</th>
                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '15%'}}>ТОЧЕК</th>
                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '20%'}}>ОБНОВЛЕНО</th>
                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800">
                {networks.map((network) => (
                  <tr
                    key={network.id}
                    onClick={() => setSelectedNetworkId(network.id)}
                    className={`border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors ${
                      selectedNetworkId === network.id ? 'bg-blue-600/20 border-blue-500' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-white text-base">{network.name}</div>
                        <div className="text-sm text-slate-400">{network.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                        {network.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">{network.pointsCount}</td>
                    <td className="px-6 py-4 text-right text-slate-400">Сегодня</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleEdit(network)}
                          disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                          onClick={() => handleDelete(network)}
                          disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {networks.map((network) => (
                <div
                  key={network.id}
                  onClick={() => setSelectedNetworkId(network.id)}
                  className={`bg-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-600 transition-colors border-2 ${
                    selectedNetworkId === network.id ? 'border-blue-500 bg-blue-600/20' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{network.name}</div>
                      <div className="text-sm text-slate-400 mb-2">{network.description}</div>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                          {network.type}
                        </Badge>
                        <span className="text-slate-400">Точек: {network.pointsCount}</span>
                        <span className="text-slate-400">Сегодня</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(network)}
                        disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handleDelete(network)}
                        disabled={actionLoading === `update-${network.id}` || actionLoading === `delete-${network.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Панель торговых точек */}
      <div className="bg-slate-800 w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                Торговые точки сети: {selectedNetwork?.name || 'Выберите сеть'}
              </h2>
            </div>
            {selectedNetworkId && (
              <Button 
                onClick={() => setPointCreateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить ТТ
              </Button>
            )}
          </div>
          
          {/* Поиск торговых точек */}
          {selectedNetworkId && (
            <div className="mb-4">
              <Input
                placeholder="Поиск торговых точек..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          )}
        </div>

        {!selectedNetworkId ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="В этой сети пока нет торговых точек" 
              className="py-16"
            />
          </div>
        ) : tradingPoints.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="В этой сети пока нет торговых точек" 
              className="py-16"
            />
          </div>
        ) : (
          <div>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block w-full">
              <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                <table className="w-full text-sm min-w-full table-fixed">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '30%'}}>НАЗВАНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '25%'}}>АДРЕС</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ТЕЛЕФОН</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '15%'}}>ОБНОВЛЕНО</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {pointsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          Загрузка торговых точек...
                        </td>
                      </tr>
                    ) : tradingPoints.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          Нет торговых точек в этой сети
                        </td>
                      </tr>
                    ) : (
                      tradingPoints.map((point) => (
                        <tr key={point.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-white font-medium text-base">{point.name}</div>
                              {point.description && (
                                <div className="text-xs text-slate-400 mt-1 line-clamp-2">{point.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{point.geolocation.address || `${point.geolocation.city}`}</td>
                          <td className="px-6 py-4 text-slate-400">{point.phone || '—'}</td>
                          <td className="px-6 py-4 text-right text-slate-400">
                            {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') : new Date(point.createdAt).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                onClick={() => handlePointEdit(point)}
                                disabled={pointActionLoading === `edit-${point.id}` || pointActionLoading === `delete-${point.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                onClick={() => handlePointDelete(point)}
                                disabled={pointActionLoading === `edit-${point.id}` || pointActionLoading === `delete-${point.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {pointsLoading ? (
                <div className="text-center text-slate-400 py-8">
                  Загрузка торговых точек...
                </div>
              ) : tradingPoints.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  Нет торговых точек в этой сети
                </div>
              ) : (
                tradingPoints.map((point) => (
                  <div
                    key={point.id}
                    className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{point.name}</div>
                      <div className="text-sm text-slate-400 mb-1">{point.geolocation.address || point.geolocation.city}</div>
                      {point.phone && (
                        <div className="text-sm text-slate-400 mb-2">{point.phone}</div>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <Badge className={point.isBlocked ? "bg-red-600 text-white" : point.isActive ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                          {point.isBlocked ? "Заблокирован" : point.isActive ? "Активный" : "Неактивный"}
                        </Badge>
                        <span className="text-slate-400">
                          {point.updatedAt ? new Date(point.updatedAt).toLocaleDateString('ru-RU') : new Date(point.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => handlePointEdit(point)}
                        disabled={pointActionLoading === `edit-${point.id}` || pointActionLoading === `delete-${point.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handlePointDelete(point)}
                        disabled={pointActionLoading === `edit-${point.id}` || pointActionLoading === `delete-${point.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <NetworkCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />
      
      <NetworkEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        network={editingNetwork}
        onSubmit={handleUpdate}
      />
      
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Удалить сеть?"
        description={`Вы действительно хотите удалить сеть "${deletingNetwork?.name}" и все её торговые точки? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />

      {/* Trading Point Dialogs */}
      <TradingPointCreateDialog
        open={pointCreateDialogOpen}
        onOpenChange={setPointCreateDialogOpen}
        networkId={selectedNetworkId!}
        onSubmit={handlePointCreate}
      />
      
      <TradingPointEditDialog
        open={pointEditDialogOpen}
        onOpenChange={setPointEditDialogOpen}
        tradingPoint={editingTradingPoint}
        onSubmit={handlePointUpdate}
        onAddExternalCode={handlePointAddExternalCode}
        onUpdateExternalCode={handlePointUpdateExternalCode}
        onRemoveExternalCode={handlePointRemoveExternalCode}
      />
      
      <ConfirmDialog
        open={pointDeleteDialogOpen}
        onOpenChange={setPointDeleteDialogOpen}
        title="Удалить торговую точку?"
        description={`Вы действительно хотите удалить торговую точку "${deletingTradingPoint?.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        loading={pointActionLoading === 'delete'}
        onConfirm={handlePointDeleteConfirm}
      />
      </div>
    </MainLayout>
  );
}