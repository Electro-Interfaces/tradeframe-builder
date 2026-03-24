import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Network, NetworkInput } from "@/types/network";

interface NetworkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: Network | null;
  onSubmit: (id: string, input: NetworkInput) => Promise<void>;
}

export function NetworkEditDialog({ open, onOpenChange, network, onSubmit }: NetworkEditDialogProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NetworkInput>({
    name: "",
    description: "",
    type: "",
    external_id: "",
    code: "",
    status: "active"
  });
  const [errors, setErrors] = useState<Partial<NetworkInput>>({});

  // Initialize form with network data when network changes
  useEffect(() => {
    if (network) {
      setFormData({
        name: network.name || "",
        description: network.description || "",
        type: network.type || "",
        external_id: network.external_id || "",
        code: network.code || "",
        status: network.status || "active"
      });
      setErrors({});
    }
  }, [network]);

  const validate = (data: NetworkInput): boolean => {
    const newErrors: Partial<NetworkInput> = {};
    
    if (!data.name.trim()) {
      newErrors.name = "Название сети обязательно";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!network || !validate(formData)) return;
    
    setLoading(true);
    try {
      await onSubmit(network.id, formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating network:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (network) {
      setFormData({
        name: network.name || "",
        description: network.description || "",
        type: network.type || "",
        external_id: network.external_id || "",
        code: network.code || "",
        status: network.status || "active"
      });
    }
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl'} bg-card border-border overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Редактировать сеть</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Измените параметры торговой сети
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="uuid" className="text-foreground block">
              UUID (база данных)
            </Label>
            <Input
              id="uuid"
              value={network?.id || ""}
              readOnly
              className="bg-background border-border text-muted-foreground font-mono text-sm cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external_id" className="text-foreground block">
              ID для API <span className="text-blue-600 dark:text-blue-400">*</span>
            </Label>
            <Input
              id="external_id"
              value={formData.external_id}
              onChange={(e) => setFormData(prev => ({ ...prev, external_id: e.target.value }))}
              placeholder="ID для синхронизации с торговым API (например, 1, 15)"
              className="bg-secondary border-border text-foreground placeholder-muted-foreground font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Используется для синхронизации с торговой системой. Демо = 1, БТО = 15, ВиБенз = 19
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground block">
              Название сети <span className="text-red-600 dark:text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название сети"
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
              placeholder="Описание сети"
              className="bg-secondary border-border text-foreground placeholder-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-foreground block">Тип сети</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Выберите тип сети" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="АЗС" className="text-foreground hover:bg-secondary">АЗС</SelectItem>
                <SelectItem value="АГЗС" className="text-foreground hover:bg-secondary">АГЗС</SelectItem>
                <SelectItem value="Мойка" className="text-foreground hover:bg-secondary">Мойка</SelectItem>
                <SelectItem value="Прочее" className="text-foreground hover:bg-secondary">Прочее</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code" className="text-foreground block">Код сети</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Уникальный код сети"
              className="bg-secondary border-border text-foreground placeholder-muted-foreground font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-foreground block">Статус</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="active" className="text-foreground hover:bg-secondary">Активная</SelectItem>
                <SelectItem value="inactive" className="text-foreground hover:bg-secondary">Неактивная</SelectItem>
              </SelectContent>
            </Select>
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
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}