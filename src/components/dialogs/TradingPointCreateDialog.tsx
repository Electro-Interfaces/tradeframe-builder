import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TradingPointInput>({
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
    } catch (error) {
      console.error('Error creating trading point:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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
      <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Создать торговую точку</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Основная информация</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200 block">
                Название <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Введите название торговой точки"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-200 block">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание торговой точки"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                rows={3}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Геолокация</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-slate-200 block">
                  Широта <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.geolocation.latitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, latitude: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="55.7558"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-slate-200 block">
                  Долгота <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.geolocation.longitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, longitude: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="49.2077"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {errors.geolocation && (
              <p className="text-red-400 text-sm mt-1">{errors.geolocation}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="region" className="text-slate-200 block">Регион</Label>
                <Input
                  id="region"
                  value={formData.geolocation.region}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, region: e.target.value }
                  }))}
                  placeholder="Республика Татарстан"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-slate-200 block">Город</Label>
                <Input
                  id="city"
                  value={formData.geolocation.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation, city: e.target.value }
                  }))}
                  placeholder="Казань"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-200 block">Адрес</Label>
              <Input
                id="address"
                value={formData.geolocation.address}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  geolocation: { ...prev.geolocation, address: e.target.value }
                }))}
                placeholder="ул. Баумана, 10"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Контактная информация</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-200 block">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+7 (843) 123-45-67"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
                {errors.phone && (
                  <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="point@company.ru"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-slate-200 block">Веб-сайт</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.ru"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
              className="border-slate-600 text-slate-200 hover:bg-slate-700"
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