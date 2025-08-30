import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NetworkInput } from "@/types/network";

interface NetworkCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NetworkInput) => Promise<void>;
}

export function NetworkCreateDialog({ open, onOpenChange, onSubmit }: NetworkCreateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NetworkInput>({
    name: "",
    description: "",
    type: ""
  });
  const [errors, setErrors] = useState<Partial<NetworkInput>>({});

  const validate = (data: NetworkInput): boolean => {
    const newErrors: Partial<NetworkInput> = {};
    
    if (!data.name.trim()) {
      newErrors.name = "Название сети обязательно";
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
        type: ""
      });
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating network:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      description: "",
      type: ""
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Создать сеть</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-200 block">
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

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-200 block">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание сети"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-slate-200 block">Тип сети</Label>
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