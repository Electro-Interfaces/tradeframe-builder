import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Network, NetworkInput } from "@/types/network";

interface NetworkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  network: Network | null;
  onSubmit: (id: string, input: NetworkInput) => Promise<void>;
}

export function NetworkEditDialog({ open, onOpenChange, network, onSubmit }: NetworkEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NetworkInput>({
    name: "",
    description: "",
    type: ""
  });
  const [errors, setErrors] = useState<Partial<NetworkInput>>({});

  // Initialize form with network data when network changes
  useEffect(() => {
    if (network) {
      setFormData({
        name: network.name || "",
        description: network.description || "",
        type: network.type || ""
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
        type: network.type || ""
      });
    }
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Редактировать сеть</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">
              Название сети <span className="text-red-400">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название сети"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            {errors.name && (
              <p className="text-red-400 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание сети"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-slate-200">Тип сети</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите тип сети" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="АЗС" className="text-white hover:bg-slate-700">АЗС</SelectItem>
                <SelectItem value="АГЗС" className="text-white hover:bg-slate-700">АГЗС</SelectItem>
                <SelectItem value="Мойка" className="text-white hover:bg-slate-700">Мойка</SelectItem>
                <SelectItem value="Прочее" className="text-white hover:bg-slate-700">Прочее</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}