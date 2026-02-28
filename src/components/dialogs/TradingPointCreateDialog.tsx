import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TradingPointInput, NetworkId } from "@/types/tradingpoint";

interface TradingPointCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networkId: NetworkId;
  onSubmit: (input: TradingPointInput) => Promise<void>;
}

export function TradingPointCreateDialog({ 
  open, 
  onOpenChange, 
  networkId, 
  onSubmit 
}: TradingPointCreateDialogProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [latitudeInput, setLatitudeInput] = useState<string>('');
  const [longitudeInput, setLongitudeInput] = useState<string>('');
  const [formData, setFormData] = useState<TradingPointInput>({
    networkId: networkId,
    name: "",
    description: "",
    geolocation: {
      latitude: 0,
      longitude: 0,
      region: "",
      city: "",
      address: ""
    },
    phone: "",
    email: "",
    website: "",
    isBlocked: false,
    schedule: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: "",
      isAlwaysOpen: false,
      specialScheduleNote: ""
    },
    services: {
      selfServiceTerminal: false,
      airPump: false,
      waterService: false,
      lubricants: false,
      carWash: false,
      shop: false,
      cafe: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: false,
      other: []
    }
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TradingPointInput, string>>>({});

  const validate = (data: TradingPointInput): boolean => {
    const newErrors: Partial<Record<keyof TradingPointInput, string>> = {};
    
    if (!data.name.trim()) {
      newErrors.name = "Название торговой точки обязательно";
    }
    
    if (!data.geolocation.latitude || !data.geolocation.longitude) {
      newErrors.geolocation = "Координаты обязательны";
    }

    if (data.phone && !data.phone.match(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/)) {
      newErrors.phone = "Неверный формат телефона. Используйте формат: +7 (XXX) XXX-XX-XX";
    }

    if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Неверный формат email";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate(formData)) return;

    setLoading(true);
    try {
      await onSubmit(formData);

      // Reset form
      setLatitudeInput('');
      setLongitudeInput('');
      setFormData({
        name: "",
        description: "",
        geolocation: {
          latitude: 0,
          longitude: 0,
          region: "",
          city: "",
          address: ""
        },
        phone: "",
        email: "",
        website: "",
        isBlocked: false,
        schedule: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
          isAlwaysOpen: false,
          specialScheduleNote: ""
        },
        services: {
          selfServiceTerminal: false,
          airPump: false,
          waterService: false,
          lubricants: false,
          carWash: false,
          shop: false,
          cafe: false,
          gasBottleExchange: false,
          electricCharging: false,
          truckParking: false,
          other: []
        }
      });
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating trading point:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLatitudeInput('');
    setLongitudeInput('');
    setFormData({
      name: "",
      description: "",
      geolocation: {
        latitude: 0,
        longitude: 0,
        region: "",
        city: "",
        address: ""
      },
      phone: "",
      email: "",
      website: "",
      isActive: true,
      schedule: {
        monday: "",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
        saturday: "",
        sunday: "",
        isAlwaysOpen: false,
        specialScheduleNote: ""
      },
      services: {
        selfServiceTerminal: false,
        airPump: false,
        waterService: false,
        lubricants: false,
        carWash: false,
        shop: false,
        cafe: false,
        gasBottleExchange: false,
        electricCharging: false,
        truckParking: false,
        other: []
      }
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[90vh]'} bg-card border-border overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Создать торговую точку</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Добавьте новую торговую точку с геолокацией и контактными данными
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Основная информация</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground block">
                Название <span className="text-red-600 dark:text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите название торговой точки"
                className="bg-secondary border-border text-foreground placeholder-muted-foreground"
              />
              {errors.name && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground block">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание торговой точки"
                className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                rows={3}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Геолокация</h3>
            
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-foreground block">
                  Широта <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Input
                  id="latitude"
                  type="text"
                  inputMode="decimal"
                  value={latitudeInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Разрешаем любой ввод, сохраняем в строковом состоянии
                    setLatitudeInput(value);
                    // Парсим только если это валидное число
                    if (value === '' || value === '-' || value === '.' || value === '-.') {
                      setFormData(prev => ({
                        ...prev,
                        geolocation: { ...prev.geolocation, latitude: 0 }
                      }));
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData(prev => ({
                          ...prev,
                          geolocation: { ...prev.geolocation, latitude: numValue }
                        }));
                      }
                    }
                  }}
                  placeholder="55.7558"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-foreground block">
                  Долгота <span className="text-red-600 dark:text-red-400">*</span>
                </Label>
                <Input
                  id="longitude"
                  type="text"
                  inputMode="decimal"
                  value={longitudeInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Разрешаем любой ввод, сохраняем в строковом состоянии
                    setLongitudeInput(value);
                    // Парсим только если это валидное число
                    if (value === '' || value === '-' || value === '.' || value === '-.') {
                      setFormData(prev => ({
                        ...prev,
                        geolocation: { ...prev.geolocation, longitude: 0 }
                      }));
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData(prev => ({
                          ...prev,
                          geolocation: { ...prev.geolocation, longitude: numValue }
                        }));
                      }
                    }
                  }}
                  placeholder="49.2077"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            {errors.geolocation && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.geolocation}</p>
            )}

            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              <div className="space-y-2">
                <Label htmlFor="region" className="text-foreground block">Регион</Label>
                <Input
                  id="region"
                  value={formData.geolocation.region}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, region: e.target.value }
                  }))}
                  placeholder="Республика Татарстан"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-foreground block">Город</Label>
                <Input
                  id="city"
                  value={formData.geolocation.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, city: e.target.value }
                  }))}
                  placeholder="Казань"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-foreground block">Адрес</Label>
              <Input
                id="address"
                value={formData.geolocation.address}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  geolocation: { ...prev.geolocation, address: e.target.value }
                }))}
                placeholder="ул. Баумана, 10"
                className="bg-secondary border-border text-foreground placeholder-muted-foreground"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground">Контактная информация</h3>
            
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-3'}`}>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground block">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+7 (843) 123-45-67"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
                {errors.phone && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="point@company.ru"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
                {errors.email && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-foreground block">Веб-сайт</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.ru"
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
              className="border-border text-foreground hover:bg-secondary"
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}