import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradingPoint, TradingPointUpdateInput } from "@/types/tradingpoint";
import { ExternalCodesManager } from "@/components/external-codes/ExternalCodesManager";

interface TradingPointEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradingPoint: TradingPoint | null;
  onSubmit: (id: string, input: TradingPointUpdateInput) => Promise<void>;
  onAddExternalCode?: (pointId: string, system: string, code: string, description?: string) => Promise<void>;
  onUpdateExternalCode?: (pointId: string, codeId: string, system: string, code: string, description?: string, isActive?: boolean) => Promise<void>;
  onRemoveExternalCode?: (pointId: string, codeId: string) => Promise<void>;
}

export function TradingPointEditDialog({ 
  open, 
  onOpenChange, 
  tradingPoint, 
  onSubmit,
  onAddExternalCode,
  onUpdateExternalCode,
  onRemoveExternalCode
}: TradingPointEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'codes'>('basic');
  const [formData, setFormData] = useState<TradingPointUpdateInput>({
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
    isBlocked: false,
    blockReason: "",
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
  const [errors, setErrors] = useState<Partial<Record<keyof TradingPointUpdateInput, string>>>({});

  // Initialize form with trading point data when tradingPoint changes
  useEffect(() => {
    if (tradingPoint) {
      setFormData({
        name: tradingPoint.name || "",
        description: tradingPoint.description || "",
        geolocation: {
          latitude: tradingPoint.geolocation.latitude || 0,
          longitude: tradingPoint.geolocation.longitude || 0,
          region: tradingPoint.geolocation.region || "",
          city: tradingPoint.geolocation.city || "",
          address: tradingPoint.geolocation.address || ""
        },
        phone: tradingPoint.phone || "",
        email: tradingPoint.email || "",
        website: tradingPoint.website || "",
        isActive: tradingPoint.isActive,
        isBlocked: tradingPoint.isBlocked,
        blockReason: tradingPoint.blockReason || "",
        schedule: tradingPoint.schedule || {
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
        services: tradingPoint.services || {
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
    }
  }, [tradingPoint]);

  const validate = (data: TradingPointUpdateInput): boolean => {
    const newErrors: Partial<Record<keyof TradingPointUpdateInput, string>> = {};
    
    if (!data.name?.trim()) {
      newErrors.name = "Название торговой точки обязательно";
    }
    
    if (!data.geolocation?.latitude || !data.geolocation?.longitude) {
      newErrors.geolocation = "Координаты обязательны";
    }

    if (data.phone && !data.phone.match(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/)) {
      newErrors.phone = "Неверный формат телефона. Используйте формат: +7 (XXX) XXX-XX-XX";
    }

    if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Неверный формат email";
    }

    if (data.isBlocked && !data.blockReason?.trim()) {
      newErrors.blockReason = "Причина блокировки обязательна при блокировке";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!tradingPoint || !validate(formData)) return;
    
    setLoading(true);
    try {
      await onSubmit(tradingPoint.id, formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating trading point:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (tradingPoint) {
      setFormData({
        name: tradingPoint.name || "",
        description: tradingPoint.description || "",
        geolocation: {
          latitude: tradingPoint.geolocation.latitude || 0,
          longitude: tradingPoint.geolocation.longitude || 0,
          region: tradingPoint.geolocation.region || "",
          city: tradingPoint.geolocation.city || "",
          address: tradingPoint.geolocation.address || ""
        },
        phone: tradingPoint.phone || "",
        email: tradingPoint.email || "",
        website: tradingPoint.website || "",
        isActive: tradingPoint.isActive,
        isBlocked: tradingPoint.isBlocked,
        blockReason: tradingPoint.blockReason || "",
        schedule: tradingPoint.schedule || {
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
        services: tradingPoint.services || {
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
    }
    setErrors({});
    onOpenChange(false);
  };

  // External codes handlers
  const handleAddExternalCode = async (system: string, code: string, description?: string) => {
    if (!tradingPoint || !onAddExternalCode) return;
    await onAddExternalCode(tradingPoint.id, system, code, description);
  };

  const handleUpdateExternalCode = async (codeId: string, system: string, code: string, description?: string, isActive?: boolean) => {
    if (!tradingPoint || !onUpdateExternalCode) return;
    await onUpdateExternalCode(tradingPoint.id, codeId, system, code, description, isActive);
  };

  const handleRemoveExternalCode = async (codeId: string) => {
    if (!tradingPoint || !onRemoveExternalCode) return;
    await onRemoveExternalCode(tradingPoint.id, codeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Редактировать торговую точку</DialogTitle>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'basic' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-600'
            }`}
          >
            Основная информация
          </button>
          <button
            onClick={() => setActiveTab('codes')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'codes' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-600'
            }`}
          >
            Внешние коды
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === 'basic' && (
            <>
              {/* Basic Information */}
              <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Основная информация</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label className="text-slate-200 block">Активна</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <span className="text-slate-200">{formData.isActive ? "Да" : "Нет"}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-200 block">Заблокирована</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isBlocked}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      isBlocked: checked,
                      blockReason: checked ? prev.blockReason : ""
                    }))}
                  />
                  <span className="text-slate-200">{formData.isBlocked ? "Да" : "Нет"}</span>
                </div>
              </div>

              {formData.isBlocked && (
                <div className="space-y-2">
                  <Label htmlFor="blockReason" className="text-slate-200 block">
                    Причина блокировки <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="blockReason"
                    value={formData.blockReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, blockReason: e.target.value }))}
                    placeholder="Введите причину блокировки"
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                  {errors.blockReason && (
                    <p className="text-red-400 text-sm mt-1">{errors.blockReason}</p>
                  )}
                </div>
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
                  value={formData.geolocation?.latitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation!, latitude: parseFloat(e.target.value) || 0 }
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
                  value={formData.geolocation?.longitude}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation!, longitude: parseFloat(e.target.value) || 0 }
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
                  value={formData.geolocation?.region}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation!, region: e.target.value }
                  }))}
                  placeholder="Республика Татарстан"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-slate-200 block">Город</Label>
                <Input
                  id="city"
                  value={formData.geolocation?.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    geolocation: { ...prev.geolocation!, city: e.target.value }
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
                value={formData.geolocation?.address}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  geolocation: { ...prev.geolocation!, address: e.target.value }
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
            </>
          )}

          {activeTab === 'codes' && (
            <ExternalCodesManager
              externalCodes={tradingPoint?.externalCodes || []}
              onAdd={handleAddExternalCode}
              onUpdate={handleUpdateExternalCode}
              onRemove={handleRemoveExternalCode}
              readonly={!onAddExternalCode || !onUpdateExternalCode || !onRemoveExternalCode}
            />
          )}

          {activeTab === 'basic' && (
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
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          )}

          {activeTab === 'codes' && (
            <div className="flex justify-end gap-3 pt-6">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={loading}
                className="border-slate-600 text-slate-200 hover:bg-slate-700"
              >
                Закрыть
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}