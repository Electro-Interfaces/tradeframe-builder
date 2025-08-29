import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Gauge, 
  Plus, 
  FileText, 
  Thermometer, 
  Droplets, 
  CheckCircle, 
  XCircle,
  Fuel 
} from "lucide-react";

// Mock data with improved structure
const mockTanks = [
  {
    id: 1,
    name: "Резервуар №1",
    fuelType: "АИ-95",
    currentLevelLiters: 25000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 15,
    waterLevelMm: 5,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ]
  },
  {
    id: 2,
    name: "Резервуар №2", 
    fuelType: "АИ-92",
    currentLevelLiters: 8000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 14,
    waterLevelMm: 3,
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "error" }
    ]
  },
  {
    id: 3,
    name: "Резервуар №3",
    fuelType: "ДТ",
    currentLevelLiters: 3000,
    capacityLiters: 40000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 16,
    waterLevelMm: 2,
    sensors: [
      { name: "Уровень", status: "error" },
      { name: "Температура", status: "ok" }
    ]
  }
];

const mockDrainageLog = [
  {
    id: 1,
    date: "07.12.2024 09:30",
    tankName: "Резервуар №1",
    fuelType: "АИ-95",
    volume: 20000,
    truckNumber: "А123БВ77",
    driverName: "Иванов А.И.",
    status: "Завершено"
  },
  {
    id: 2,
    date: "06.12.2024 14:15",
    tankName: "Резервуар №2",
    fuelType: "АИ-92", 
    volume: 25000,
    truckNumber: "В456ГД77",
    driverName: "Петров С.П.",
    status: "Завершено"
  }
];

// Enhanced Progress Component with threshold markers
const TankProgressIndicator = ({ percentage, minLevel, criticalLevel, isMobile }: {
  percentage: number;
  minLevel: number;
  criticalLevel: number;
  isMobile: boolean;
}) => {
  const getProgressColor = (percent: number) => {
    if (percent > minLevel) return "hsl(var(--primary))"; // Blue
    if (percent >= criticalLevel) return "hsl(45, 93%, 47%)"; // Yellow 
    return "hsl(0, 84%, 60%)"; // Red
  };

  const progressColor = getProgressColor(percentage);

  return (
    <TooltipProvider>
      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-4"
          style={{
            background: 'rgb(55, 65, 81)',
          }}
        />
        
        {/* Custom progress bar with dynamic color */}
        <div 
          className="absolute top-0 left-0 h-4 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: progressColor,
          }}
        />
        
        {/* Threshold markers */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="absolute top-0 h-4 w-0.5 bg-gray-300 cursor-help"
              style={{ left: `${minLevel}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Минимальный уровень ({minLevel}%)</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="absolute top-0 h-4 w-0.5 bg-red-400 cursor-help"
              style={{ left: `${criticalLevel}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Критический уровень ({criticalLevel}%)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

const drainageFormSchema = z.object({
  tankId: z.string().min(1, "Выберите резервуар"),
  volume: z.number().min(1, "Введите объем больше 0"),
  truckNumber: z.string().optional(),
  driverName: z.string().optional(),
});

type DrainageFormData = z.infer<typeof drainageFormSchema>;

export default function Tanks() {
  const [selectedTradingPoint] = useState("АЗС-5 на Ленина"); // Mock selected point
  const [drainageDialogOpen, setDrainageDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [drainageLog, setDrainageLog] = useState(mockDrainageLog);
  const isMobile = useIsMobile();

  const form = useForm<DrainageFormData>({
    resolver: zodResolver(drainageFormSchema),
    defaultValues: {
      tankId: "",
      volume: 0,
      truckNumber: "",
      driverName: "",
    },
  });

  const getProgressColor = (percentage: number) => {
    if (percentage > 20) return "hsl(var(--primary))"; // Blue
    if (percentage >= 10) return "hsl(45, 93%, 47%)"; // Yellow
    return "hsl(0, 84%, 60%)"; // Red
  };

  const getPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getFuelTypeColor = (fuelType: string) => {
    switch (fuelType) {
      case "АИ-95": return "text-blue-400";
      case "АИ-92": return "text-green-400"; 
      case "ДТ": return "text-orange-400";
      default: return "text-gray-400";
    }
  };

  const onSubmitDrainage = (data: DrainageFormData) => {
    const selectedTank = mockTanks.find(tank => tank.id.toString() === data.tankId);
    if (selectedTank) {
      const newLogEntry = {
        id: drainageLog.length + 1,
        date: new Date().toLocaleString("ru-RU"),
        tankName: selectedTank.name,
        fuelType: selectedTank.fuelType,
        volume: data.volume,
        truckNumber: data.truckNumber || "—",
        driverName: data.driverName || "—",
        status: "Завершено"
      };
      
      setDrainageLog([newLogEntry, ...drainageLog]);
      setDrainageDialogOpen(false);
      form.reset();
      
      toast({
        title: "Операция слива успешно зарегистрирована",
        description: `${data.volume} л ${selectedTank.fuelType} в ${selectedTank.name}`,
      });
    }
  };

  // Empty state if no trading point selected
  if (!selectedTradingPoint) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Gauge className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-100 mb-2">
              Торговая точка не выбрана
            </h2>
            <p className="text-gray-400">
              Пожалуйста, выберите торговую точку для просмотра данных о резервуарах
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-gray-100`}>
              Резервуары на ТТ "{selectedTradingPoint}"
            </h1>
            <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
              Мониторинг запасов топлива и управление операциями
            </p>
          </div>
          
          <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
            <Dialog open={drainageDialogOpen} onOpenChange={setDrainageDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className={`bg-blue-600 hover:bg-blue-700 ${isMobile ? 'flex-1' : ''}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isMobile ? 'Слив' : 'Зарегистрировать слив'}
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isMobile ? 'w-full mx-4' : 'max-w-md'}`}>
                <DialogHeader>
                  <DialogTitle>Регистрация слива топлива</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmitDrainage)} className="space-y-4">
                  <div>
                    <Label htmlFor="tankId">Резервуар</Label>
                    <Select 
                      value={form.watch("tankId")} 
                      onValueChange={(value) => form.setValue("tankId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите резервуар" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTanks.map((tank) => (
                          <SelectItem key={tank.id} value={tank.id.toString()}>
                            {tank.name} - {tank.fuelType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.tankId && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.tankId.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="volume">Объем по накладной (литры) *</Label>
                    <Input
                      id="volume"
                      type="number"
                      {...form.register("volume", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {form.formState.errors.volume && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.volume.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="truckNumber">Номер бензовоза</Label>
                    <Input
                      id="truckNumber"
                      {...form.register("truckNumber")}
                      placeholder="А123БВ77"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="driverName">Имя водителя</Label>
                    <Input
                      id="driverName"
                      {...form.register("driverName")}
                      placeholder="Иванов А.И."
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDrainageDialogOpen(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                    <Button type="submit" className="flex-1">
                      Сохранить
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className={isMobile ? 'flex-1' : ''}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isMobile ? 'Журнал' : 'Журнал сливов'}
                </Button>
              </DialogTrigger>
              <DialogContent className={`${isMobile ? 'w-full mx-4 max-h-[80vh] overflow-y-auto' : 'max-w-4xl max-h-[80vh] overflow-y-auto'}`}>
                <DialogHeader>
                  <DialogTitle>Журнал операций слива</DialogTitle>
                </DialogHeader>
                <div className={isMobile ? 'overflow-x-auto' : ''}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={isMobile ? 'text-xs' : ''}>Дата и время</TableHead>
                        <TableHead className={isMobile ? 'text-xs' : ''}>Резервуар</TableHead>
                        {!isMobile && <TableHead>Вид топлива</TableHead>}
                        <TableHead className={isMobile ? 'text-xs' : ''}>Объем (л)</TableHead>
                        {!isMobile && <TableHead>Номер бензовоза</TableHead>}
                        <TableHead className={isMobile ? 'text-xs' : ''}>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drainageLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className={`font-medium ${isMobile ? 'text-xs' : ''}`}>
                            {entry.date}
                          </TableCell>
                          <TableCell className={isMobile ? 'text-xs' : ''}>
                            {entry.tankName}
                            {isMobile && (
                              <div className="text-xs text-gray-400">{entry.fuelType}</div>
                            )}
                          </TableCell>
                          {!isMobile && <TableCell>{entry.fuelType}</TableCell>}
                          <TableCell className={isMobile ? 'text-xs' : ''}>{entry.volume.toLocaleString()}</TableCell>
                          {!isMobile && <TableCell>{entry.truckNumber}</TableCell>}
                          <TableCell className={isMobile ? 'text-xs' : ''}>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {entry.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tanks Grid */}
        {mockTanks.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Fuel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Резервуары не найдены
                </h3>
                <p className="text-gray-400">
                  Для этой торговой точки не добавлено ни одного резервуара. 
                  Добавьте их в разделе "Оборудование"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {mockTanks.map((tank) => {
              const percentage = getPercentage(tank.currentLevelLiters, tank.capacityLiters);
              
              return (
                <Card key={tank.id} className="bg-gray-800 border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <CardHeader className={`pb-3 ${isMobile ? 'pb-2' : ''}`}>
                    <CardTitle className={`flex items-center gap-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                      <Gauge className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-blue-400`} />
                      <div className="flex-1">
                        <div className="text-gray-100 font-semibold">{tank.name}</div>
                        <div className={`${isMobile ? 'text-lg font-bold' : 'text-xl font-bold'} ${getFuelTypeColor(tank.fuelType)}`}>
                          {tank.fuelType}
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Enhanced Progress Indicator */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-200`}>
                          Уровень топлива
                        </span>
                        <span className={`${isMobile ? 'text-lg font-bold' : 'text-xl font-bold'} ${
                          percentage > tank.minLevelPercent ? 'text-blue-400' :
                          percentage >= tank.criticalLevelPercent ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {percentage}%
                        </span>
                      </div>
                      
                      <TankProgressIndicator 
                        percentage={percentage} 
                        minLevel={tank.minLevelPercent}
                        criticalLevel={tank.criticalLevelPercent}
                        isMobile={isMobile}
                      />
                      
                      <div className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-300 font-medium`}>
                        {tank.currentLevelLiters.toLocaleString()} / {tank.capacityLiters.toLocaleString()} л
                      </div>
                    </div>
                    
                    {/* Tank Data */}
                    <div className={`grid grid-cols-2 gap-4 ${isMobile ? 'text-sm' : ''}`}>
                      <div className="flex items-center gap-2">
                        <Thermometer className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-400`} />
                        <div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>Температура</div>
                          <div className="font-semibold text-gray-100">{tank.temperature} °C</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Droplets className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-cyan-400`} />
                        <div>
                          <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-400`}>Подтоварная вода</div>
                          <div className="font-semibold text-gray-100">{tank.waterLevelMm} мм</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Sensor Status */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                      <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-gray-300`}>Статус датчиков:</span>
                      <div className="flex gap-4">
                        {tank.sensors.map((sensor, index) => (
                          <TooltipProvider key={index}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  {sensor.status === "ok" ? (
                                    <CheckCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-green-400`} />
                                  ) : (
                                    <XCircle className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-red-400`} />
                                  )}
                                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                                    sensor.status === "ok" ? 'text-green-400' : 'text-red-400'
                                  } font-medium`}>
                                    {sensor.name}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Датчик {sensor.name.toLowerCase()}: {sensor.status === "ok" ? "Работает нормально" : "Ошибка"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}