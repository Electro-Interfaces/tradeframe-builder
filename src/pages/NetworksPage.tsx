import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NetworkCreateDialog } from "@/components/dialogs/NetworkCreateDialog";
import { NetworkEditDialog } from "@/components/dialogs/NetworkEditDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MapPin, MoreHorizontal } from "lucide-react";
import { Network, NetworkInput } from "@/types/network";
import { networksRepo } from "@/repositories";
import { useToast } from "@/hooks/use-toast";

export default function NetworksPage() {
  const { toast } = useToast();
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNetwork, setDeletingNetwork] = useState<Network | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load networks on component mount
  useEffect(() => {
    loadNetworks();
  }, []);

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

  const handleCreate = async (input: NetworkInput) => {
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
    }
  };

  const handleEdit = (network: Network) => {
    setEditingNetwork(network);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (id: string, input: NetworkInput) => {
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
    }
  };

  const handleDelete = (network: Network) => {
    setDeletingNetwork(network);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingNetwork) return;
    
    setDeleteLoading(true);
    try {
      await networksRepo.remove(deletingNetwork.id);
      
      // Remove from list and reset selection if it was selected
      setNetworks(prev => prev.filter(n => n.id !== deletingNetwork.id));
      if (selectedNetworkId === deletingNetwork.id) {
        setSelectedNetworkId(null);
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
      setDeletingNetwork(null);
    }
  };
  
  const tradingPoints = [
    {
      id: "1",
      name: "АЗС №001 — Центральная",
      code: "A001",
      city: "Казань",
      status: "Активный",
      networkId: "2"
    },
    {
      id: "2",
      name: "АЗС №002 — Северная",
      code: "A002",
      city: "Казань",
      status: "Активный",
      networkId: "2"
    },
  ];
  
  const selectedNetwork = networks.find(n => n.id === selectedNetworkId);
  const selectedNetworkPoints = tradingPoints.filter(p => p.networkId === selectedNetworkId);

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
    <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
      {/* Заголовок страницы */}
      <div className="mb-6 px-6 pt-4">
        <h1 className="text-2xl font-semibold text-white">Настройки сетей и торговых точек</h1>
      </div>

      {/* Панель торговых сетей */}
      <div className="bg-slate-800 mb-6 w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🏪</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Торговые сети</h2>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
            >
              + Создать сеть
            </Button>
          </div>
        </div>

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
                      selectedNetworkId === network.id ? 'bg-slate-700' : ''
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(network)}
                            className="text-slate-200 hover:bg-slate-700"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(network)}
                            className="text-rose-400 hover:bg-slate-700 focus:bg-slate-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                selectedNetworkId === network.id ? 'border-blue-500 bg-slate-600' : 'border-transparent'
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => handleEdit(network)}
                      className="text-slate-200 hover:bg-slate-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem 
                      onClick={() => handleDelete(network)}
                      className="text-rose-400 hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0">
                + Добавить ТТ
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
        ) : selectedNetworkPoints.length === 0 ? (
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
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '40%'}}>НАЗВАНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>АДРЕС</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>СТАТУС</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '20%'}}>ОБНОВЛЕНО</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {selectedNetworkPoints.map((point) => (
                      <tr key={point.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 text-white font-medium text-base">{point.name}</td>
                        <td className="px-6 py-4 text-slate-400">{point.city}</td>
                        <td className="px-6 py-4">
                          <Badge className="bg-green-600 text-white">
                            {point.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-400">30.08.2025</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
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
              {selectedNetworkPoints.map((point) => (
                <div
                  key={point.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{point.name}</div>
                      <div className="text-sm text-slate-400 mb-2">{point.city}</div>
                      <div className="flex items-center gap-3 text-xs">
                        <Badge className="bg-green-600 text-white">
                          {point.status}
                        </Badge>
                        <span className="text-slate-400">30.08.2025</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
}