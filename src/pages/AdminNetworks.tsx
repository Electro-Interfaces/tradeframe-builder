import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Network, 
  Plus, 
  Edit,
  Trash2,
  MapPin,
  Building
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradingNetwork {
  id: number;
  name: string;
  description: string;
  type: "АЗС" | "АГЗС" | "Мойка";
  pointsCount: number;
}

interface TradingPoint {
  id: number;
  networkId: number;
  name: string;
  shortName: string;
  accountingName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

const AdminNetworks = () => {
  const { toast } = useToast();
  
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

  // Mock данные для торговых точек
  const [tradingPoints, setTradingPoints] = useState<TradingPoint[]>([
    {
      id: 1,
      networkId: 1,
      name: "АЗС-1 на Ленина",
      shortName: "АЗС-1",
      accountingName: "АЗС №1 ул. Ленина",
      address: "г. Москва, ул. Ленина, д. 25",
      latitude: 55.7558,
      longitude: 37.6176,
      isActive: true
    },
    {
      id: 2,
      networkId: 1,
      name: "АЗС-2 на Пушкина",
      shortName: "АЗС-2",
      accountingName: "АЗС №2 ул. Пушкина",
      address: "г. Москва, ул. Пушкина, д. 12",
      latitude: 55.7512,
      longitude: 37.6184,
      isActive: true
    },
    {
      id: 3,
      networkId: 2,
      name: "АГЗС Центральная",
      shortName: "АГЗС-Ц",
      accountingName: "АГЗС Центральная",
      address: "г. Москва, проспект Мира, д. 45",
      latitude: 55.7701,
      longitude: 37.6402,
      isActive: false
    }
  ]);

  const [selectedNetwork, setSelectedNetwork] = useState<TradingNetwork | null>(null);
  const [networkDialogOpen, setNetworkDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<TradingNetwork | null>(null);
  const [editingPoint, setEditingPoint] = useState<TradingPoint | null>(null);

  // Форма для сети
  const [networkForm, setNetworkForm] = useState({
    name: "",
    description: "",
    type: "" as TradingNetwork["type"] | ""
  });

  // Форма для торговой точки
  const [pointForm, setPointForm] = useState({
    name: "",
    shortName: "",
    accountingName: "",
    address: "",
    latitude: "",
    longitude: "",
    isActive: true
  });

  const getNetworkTypeColor = (type: string) => {
    switch (type) {
      case "АЗС": return "default";
      case "АГЗС": return "secondary";
      case "Мойка": return "outline";
      default: return "outline";
    }
  };

  const handleNetworkClick = (network: TradingNetwork) => {
    setSelectedNetwork(network);
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

  const openPointDialog = (point?: TradingPoint) => {
    if (point) {
      setEditingPoint(point);
      setPointForm({
        name: point.name,
        shortName: point.shortName,
        accountingName: point.accountingName,
        address: point.address,
        latitude: point.latitude?.toString() || "",
        longitude: point.longitude?.toString() || "",
        isActive: point.isActive
      });
    } else {
      setEditingPoint(null);
      setPointForm({
        name: "",
        shortName: "",
        accountingName: "",
        address: "",
        latitude: "",
        longitude: "",
        isActive: true
      });
    }
    setPointDialogOpen(true);
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
      // Обновление
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
      // Создание
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

  const savePoint = () => {
    if (!pointForm.name) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive"
      });
      return;
    }

    if (!selectedNetwork) return;

    const pointData = {
      ...pointForm,
      latitude: pointForm.latitude ? parseFloat(pointForm.latitude) : undefined,
      longitude: pointForm.longitude ? parseFloat(pointForm.longitude) : undefined,
      networkId: selectedNetwork.id
    };

    if (editingPoint) {
      // Обновление
      setTradingPoints(prev => prev.map(p => 
        p.id === editingPoint.id 
          ? { ...p, ...pointData }
          : p
      ));
      toast({
        title: "Успешно",
        description: "Торговая точка обновлена"
      });
    } else {
      // Создание
      const newPoint: TradingPoint = {
        id: Math.max(...tradingPoints.map(p => p.id)) + 1,
        ...pointData
      };
      setTradingPoints(prev => [...prev, newPoint]);
      
      // Обновляем счетчик точек в сети
      setNetworks(prev => prev.map(n => 
        n.id === selectedNetwork.id 
          ? { ...n, pointsCount: n.pointsCount + 1 }
          : n
      ));
      
      toast({
        title: "Успешно",
        description: "Торговая точка создана"
      });
    }
    
    setPointDialogOpen(false);
  };

  const deleteNetwork = (network: TradingNetwork) => {
    setNetworks(prev => prev.filter(n => n.id !== network.id));
    setTradingPoints(prev => prev.filter(p => p.networkId !== network.id));
    if (selectedNetwork?.id === network.id) {
      setSelectedNetwork(null);
    }
    toast({
      title: "Успешно",
      description: "Сеть удалена"
    });
  };

  const deletePoint = (point: TradingPoint) => {
    setTradingPoints(prev => prev.filter(p => p.id !== point.id));
    setNetworks(prev => prev.map(n => 
      n.id === point.networkId 
        ? { ...n, pointsCount: Math.max(0, n.pointsCount - 1) }
        : n
    ));
    toast({
      title: "Успешно",
      description: "Торговая точка удалена"
    });
  };

  const filteredPoints = selectedNetwork 
    ? tradingPoints.filter(p => p.networkId === selectedNetwork.id)
    : [];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
            <Network className="h-8 w-8" />
            Сети и ТТ
          </h1>
          <p className="text-muted-foreground text-lg">
            Управление торговыми сетями и торговыми точками
          </p>
        </div>

        {/* Trading Networks Section */}
        <Card className="shadow-soft border-border/50">
          <CardHeader>
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Торговые сети
              </CardTitle>
              
              <Dialog open={networkDialogOpen} onOpenChange={setNetworkDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openNetworkDialog()} className="gap-2 lg:w-auto w-full">
                    <Plus className="h-4 w-4" />
                    Создать сеть
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                        <SelectContent>
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название сети</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Кол-во точек</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {networks.map((network) => (
                    <TableRow 
                      key={network.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedNetwork?.id === network.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleNetworkClick(network)}
                    >
                      <TableCell className="font-medium">{network.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {network.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getNetworkTypeColor(network.type)}>
                          {network.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{network.pointsCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNetworkDialog(network);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить сеть?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите удалить сеть "{network.name}"? 
                                  Все связанные торговые точки также будут удалены. 
                                  Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteNetwork(network)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Trading Points Section */}
        {selectedNetwork && (
          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Торговые точки сети "{selectedNetwork.name}"
                </CardTitle>
                
                <Dialog open={pointDialogOpen} onOpenChange={setPointDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openPointDialog()} className="gap-2 lg:w-auto w-full">
                      <Plus className="h-4 w-4" />
                      Добавить ТТ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPoint ? "Редактировать торговую точку" : "Добавить торговую точку"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pointName">Название точки *</Label>
                          <Input
                            id="pointName"
                            value={pointForm.name}
                            onChange={(e) => setPointForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="АЗС-1 на Ленина"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shortName">Краткое наименование</Label>
                          <Input
                            id="shortName"
                            value={pointForm.shortName}
                            onChange={(e) => setPointForm(prev => ({ ...prev, shortName: e.target.value }))}
                            placeholder="АЗС-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="accountingName">Бухгалтерское наименование</Label>
                        <Input
                          id="accountingName"
                          value={pointForm.accountingName}
                          onChange={(e) => setPointForm(prev => ({ ...prev, accountingName: e.target.value }))}
                          placeholder="АЗС №1 ул. Ленина"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="address">Почтовый адрес</Label>
                        <Textarea
                          id="address"
                          value={pointForm.address}
                          onChange={(e) => setPointForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="г. Москва, ул. Ленина, д. 25"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="latitude">Широта (Latitude)</Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={pointForm.latitude}
                            onChange={(e) => setPointForm(prev => ({ ...prev, latitude: e.target.value }))}
                            placeholder="55.7558"
                          />
                        </div>
                        <div>
                          <Label htmlFor="longitude">Долгота (Longitude)</Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={pointForm.longitude}
                            onChange={(e) => setPointForm(prev => ({ ...prev, longitude: e.target.value }))}
                            placeholder="37.6176"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={pointForm.isActive}
                          onCheckedChange={(checked) => setPointForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="isActive">Активна</Label>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPointDialogOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={savePoint}>
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название точки</TableHead>
                      <TableHead>Адрес</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{point.name}</div>
                            {point.shortName && (
                              <div className="text-sm text-muted-foreground">{point.shortName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {point.address}
                        </TableCell>
                        <TableCell>
                          <Badge variant={point.isActive ? "default" : "secondary"}>
                            {point.isActive ? "Активна" : "Неактивна"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openPointDialog(point)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить торговую точку?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Вы уверены, что хотите удалить торговую точку "{point.name}"? 
                                    Все связанные с ней данные будут заархивированы. 
                                    Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deletePoint(point)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredPoints.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    У данной сети пока нет торговых точек
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default AdminNetworks;