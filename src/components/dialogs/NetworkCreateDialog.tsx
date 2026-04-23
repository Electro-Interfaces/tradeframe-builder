import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NetworkInput } from "@/types/network";

interface NetworkCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: NetworkInput) => Promise<void>;
}

export function NetworkCreateDialog({ open, onOpenChange, onSubmit }: NetworkCreateDialogProps) {
  const isMobile = useIsMobile();
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
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-2xl'} bg-card border-border overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">Создать сеть</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Добавьте новую торговую сеть в систему
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
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

          <div className="flex justify-end gap-3 pt-6">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
              
            >
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-primary hover:bg-primary/80 text-white"
            >
              {loading ? "Создание..." : "Создать"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}