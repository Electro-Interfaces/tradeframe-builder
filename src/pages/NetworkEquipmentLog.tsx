/**
 * Страница "Журнал оборудования" для торговой сети
 * Содержит 3 вкладки: Оборудование, Компоненты, Команды
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/context/SelectionContext";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Settings, 
  Layers3, 
  Command, 
  Search, 
  Network,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PowerOff,
  Archive,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

// Импортируем существующие сервисы
import { currentEquipmentAPI } from '@/services/equipment';
import { currentComponentsAPI } from '@/services/components';
import { commandsService } from '@/services/commandsService';
import { tradingPointsService } from '@/services/tradingPointsService';
import { networksService } from '@/services/networksService';

// Типы данных
interface NetworkEquipmentItem {
  id: string;
  name: string;
  type: string;
  serialNumber?: string;
  status: string;
  tradingPointId: string;
  tradingPointName: string;
  lastUpdate: string;
  componentsCount?: number;
}

interface NetworkComponentItem {
  id: string;
  name: string;
  type: string;
  equipmentId: string;
  equipmentName: string;
  tradingPointId: string;
  tradingPointName: string;
  status: string;
  lastUpdate: string;
}

interface NetworkCommandItem {
  id: string;
  name: string;
  targetType: 'equipment' | 'component';
  targetId: string;
  targetName: string;
  tradingPointId: string;
  tradingPointName: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: string;
  executedAt?: string;
}

// Утилиты для статусов
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'online': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'offline': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'disabled': return <PowerOff className="w-4 h-4 text-slate-400" />;
    case 'archived': return <Archive className="w-4 h-4 text-slate-500" />;
    case 'pending': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    case 'executing': return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
    default: return <Settings className="w-4 h-4 text-slate-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
    case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'offline':
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'error':
    case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'executing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'disabled': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'archived': return 'bg-slate-600/20 text-slate-500 border-slate-600/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'error': return 'Ошибка';
    case 'disabled': return 'Отключено';
    case 'archived': return 'Архив';
    case 'pending': return 'Ожидает';
    case 'executing': return 'Выполняется';
    case 'completed': return 'Завершена';
    case 'failed': return 'Ошибка';
    default: return status;
  }
};

export default function NetworkEquipmentLog() {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Состояния данных
  const [equipment, setEquipment] = useState<NetworkEquipmentItem[]>([]);
  const [components, setComponents] = useState<NetworkComponentItem[]>([]);
  const [commands, setCommands] = useState<NetworkCommandItem[]>([]);
  const [tradingPoints, setTradingPoints] = useState<any[]>([]);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  
  // Состояния загрузки и поиска
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('equipment');

  // Загружаем информацию о сети
  useEffect(() => {
    if (selectedNetwork) {
      networksService.getById(selectedNetwork).then(setNetworkInfo);
    }
  }, [selectedNetwork]);

  // Загружаем торговые точки сети
  useEffect(() => {
    if (selectedNetwork) {
      loadTradingPoints();
    }
  }, [selectedNetwork]);

  // Загружаем данные при смене вкладки
  useEffect(() => {
    if (selectedNetwork && tradingPoints.length > 0) {
      loadData();
    }
  }, [selectedNetwork, tradingPoints, activeTab]);

  const loadTradingPoints = async () => {
    try {
      const points = await tradingPointsService.getByNetworkId(selectedNetwork);
      setTradingPoints(points);
    } catch (error) {
      console.error('Failed to load trading points:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить торговые точки",
        variant: "destructive"
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'equipment':
          await loadEquipment();
          break;
        case 'components':
          await loadComponents();
          break;
        case 'commands':
          await loadCommands();
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${activeTab}:`, error);
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить данные`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    const equipmentItems: NetworkEquipmentItem[] = [];
    
    for (const point of tradingPoints) {
      try {
        const response = await currentEquipmentAPI.list({
          trading_point_id: point.id
        });
        
        for (const eq of response.data) {
          equipmentItems.push({
            id: eq.id,
            name: eq.display_name || eq.name,
            type: eq.name || eq.system_type,
            serialNumber: eq.serial_number,
            status: eq.status,
            tradingPointId: point.id,
            tradingPointName: point.name,
            lastUpdate: eq.updated_at,
            componentsCount: eq.componentsCount || 0
          });
        }
      } catch (error) {
        console.warn(`Failed to load equipment for point ${point.id}:`, error);
      }
    }
    
    setEquipment(equipmentItems);
  };

  const loadComponents = async () => {
    const componentItems: NetworkComponentItem[] = [];
    
    for (const point of tradingPoints) {
      try {
        const response = await currentComponentsAPI.list({
          trading_point_id: point.id
        });
        
        for (const comp of response.data) {
          componentItems.push({
            id: comp.id,
            name: comp.name,
            type: comp.template?.name || 'Неизвестный тип',
            equipmentId: comp.equipment_id,
            equipmentName: comp.equipment?.display_name || 'Неизвестное оборудование',
            tradingPointId: point.id,
            tradingPointName: point.name,
            status: comp.status,
            lastUpdate: comp.updated_at
          });
        }
      } catch (error) {
        console.warn(`Failed to load components for point ${point.id}:`, error);
      }
    }
    
    setComponents(componentItems);
  };

  const loadCommands = async () => {
    // Пока что заглушка - в реальности нужно будет создать API для команд по сети
    const mockCommands: NetworkCommandItem[] = [];
    setCommands(mockCommands);
  };

  // Фильтрация по поиску
  const filteredEquipment = useMemo(() => 
    equipment.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tradingPointName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [equipment, searchTerm]
  );

  const filteredComponents = useMemo(() => 
    components.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tradingPointName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [components, searchTerm]
  );

  const filteredCommands = useMemo(() => 
    commands.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tradingPointName.toLowerCase().includes(searchTerm.toLowerCase())
    ), [commands, searchTerm]
  );

  // Если сеть не выбрана
  if (!selectedNetwork) {
    return (
      <MainLayout fullWidth={true}>
        <EmptyState
          icon={Network}
          title="Выберите торговую сеть" 
          description="Для просмотра журнала оборудования необходимо выбрать торговую сеть в селекторе."
          className="py-16"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4 px-6">
          <h1 className="text-2xl font-semibold text-white">Журнал оборудования</h1>
          <p className="text-slate-400 mt-2">
            {networkInfo ? `${networkInfo.name} - Просмотр оборудования, компонентов и команд по всем торговым точкам` : 'Загрузка информации о сети...'}
          </p>
        </div>

        <div className="px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full grid-cols-3 ${isMobile ? 'h-10' : 'h-12'}`}>
            <TabsTrigger value="equipment" className={isMobile ? 'text-sm' : ''}>
              <Settings className="w-4 h-4 mr-2" />
              Оборудование ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="components" className={isMobile ? 'text-sm' : ''}>
              <Layers3 className="w-4 h-4 mr-2" />
              Компоненты ({components.length})
            </TabsTrigger>
            <TabsTrigger value="commands" className={isMobile ? 'text-sm' : ''}>
              <Command className="w-4 h-4 mr-2" />
              Команды ({commands.length})
            </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Вкладка "Оборудование" */}
          <TabsContent value="equipment" className="space-y-6">
            <div className="bg-slate-800 mb-6 w-full">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Оборудование по торговым точкам</h2>
                      <p className="text-sm text-slate-400">Общий обзор оборудования сети</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Таблица оборудования */}
            <div className="bg-slate-800 border-0 border-t border-slate-600 w-full">
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Список оборудования</h3>
                    <p className="text-sm text-slate-400">Найдено единиц: {filteredEquipment.length}</p>
                  </div>
                  <div className="relative flex-1 w-full max-w-sm ml-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Поиск оборудования..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-400">Загрузка...</span>
                </div>
              ) : isMobile ? (
                <div className="p-6 space-y-4">
                  {filteredEquipment.map((item) => (
                    <Card key={item.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">{item.name}</h3>
                              <p className="text-sm text-slate-300">{item.type}</p>
                            </div>
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-400">
                              <MapPin className="w-4 h-4 mr-1" />
                              {item.tradingPointName}
                            </div>
                            {item.serialNumber && (
                              <p className="text-xs text-slate-400">S/N: {item.serialNumber}</p>
                            )}
                            {item.componentsCount > 0 && (
                              <div className="flex items-center text-sm text-slate-400">
                                <Layers3 className="w-4 h-4 mr-1" />
                                Компонентов: {item.componentsCount}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Название</TableHead>
                        <TableHead className="text-slate-300">Тип</TableHead>
                        <TableHead className="text-slate-300">Серийный номер</TableHead>
                        <TableHead className="text-slate-300">Торговая точка</TableHead>
                        <TableHead className="text-slate-300">Компоненты</TableHead>
                        <TableHead className="text-slate-300">Статус</TableHead>
                        <TableHead className="text-slate-300">Обновлено</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment.map((item) => (
                        <TableRow key={item.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-white">{item.name}</TableCell>
                          <TableCell className="text-slate-300">{item.type}</TableCell>
                          <TableCell className="text-slate-400">{item.serialNumber || "—"}</TableCell>
                          <TableCell className="text-slate-300">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                              {item.tradingPointName}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {item.componentsCount > 0 ? (
                              <div className="flex items-center">
                                <Layers3 className="w-4 h-4 mr-1" />
                                {item.componentsCount}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(item.lastUpdate).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Вкладка "Компоненты" */}
          <TabsContent value="components" className="space-y-6">
            <div className="bg-slate-800 mb-6 w-full">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Layers3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Компоненты оборудования</h2>
                      <p className="text-sm text-slate-400">Детализированный список компонентов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Таблица компонентов */}
            <div className="bg-slate-800 border-0 border-t border-slate-600 w-full">
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Список компонентов</h3>
                    <p className="text-sm text-slate-400">Найдено компонентов: {filteredComponents.length}</p>
                  </div>
                  <div className="relative flex-1 w-full max-w-sm ml-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Поиск компонентов..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-400">Загрузка...</span>
                </div>
              ) : isMobile ? (
                <div className="p-6 space-y-4">
                  {filteredComponents.map((item) => (
                    <Card key={item.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-white">{item.name}</h3>
                              <p className="text-sm text-slate-300">{item.type}</p>
                            </div>
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-slate-400">
                              <Settings className="w-4 h-4 mr-1" />
                              {item.equipmentName}
                            </div>
                            <div className="flex items-center text-sm text-slate-400">
                              <MapPin className="w-4 h-4 mr-1" />
                              {item.tradingPointName}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-slate-300">Название</TableHead>
                        <TableHead className="text-slate-300">Тип</TableHead>
                        <TableHead className="text-slate-300">Оборудование</TableHead>
                        <TableHead className="text-slate-300">Торговая точка</TableHead>
                        <TableHead className="text-slate-300">Статус</TableHead>
                        <TableHead className="text-slate-300">Обновлено</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComponents.map((item) => (
                        <TableRow key={item.id} className="border-slate-700 hover:bg-slate-700/50">
                          <TableCell className="font-medium text-white">{item.name}</TableCell>
                          <TableCell className="text-slate-300">{item.type}</TableCell>
                          <TableCell className="text-slate-400">
                            <div className="flex items-center">
                              <Settings className="w-4 h-4 mr-1" />
                              {item.equipmentName}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                              {item.tradingPointName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(item.status)}>
                              {getStatusText(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">
                            {new Date(item.lastUpdate).toLocaleDateString('ru-RU')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Вкладка "Команды" */}
          <TabsContent value="commands" className="space-y-6">
            <div className="bg-slate-800 mb-6 w-full">
              <div className="px-4 md:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Command className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Команды управления</h2>
                      <p className="text-sm text-slate-400">История команд по всем устройствам</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Таблица команд */}
            <div className="bg-slate-800 border-0 border-t border-slate-600 w-full">
              <div className="px-6 py-4 border-b border-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Журнал команд</h3>
                    <p className="text-sm text-slate-400">Найдено команд: {filteredCommands.length}</p>
                  </div>
                  <div className="relative flex-1 w-full max-w-sm ml-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Поиск команд..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 text-center">
                <Command className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Команды скоро появятся</h3>
                <p className="text-slate-400">
                  Функционал управления командами находится в разработке
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}