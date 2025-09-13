import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, X, Check } from "lucide-react";
import { TradingPointExternalCode } from "@/types/tradingpoint";

interface ExternalCodesManagerProps {
  externalCodes: TradingPointExternalCode[];
  onAdd: (system: string, code: string, description?: string) => void;
  onUpdate: (codeId: string, system: string, code: string, description?: string, isActive?: boolean) => void;
  onRemove: (codeId: string) => void;
  readonly?: boolean;
}

interface EditingCode {
  id?: string;
  system: string;
  code: string;
  description: string;
  isActive: boolean;
}

export function ExternalCodesManager({ 
  externalCodes, 
  onAdd, 
  onUpdate, 
  onRemove, 
  readonly = false 
}: ExternalCodesManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<EditingCode | null>(null);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingCode({
      system: "",
      code: "",
      description: "",
      isActive: true
    });
  };

  const handleStartEdit = (externalCode: TradingPointExternalCode) => {
    setEditingCode({
      id: externalCode.id,
      system: externalCode.system,
      code: externalCode.code,
      description: externalCode.description || "",
      isActive: externalCode.isActive
    });
  };

  const handleSave = () => {
    if (!editingCode || !editingCode.system.trim() || !editingCode.code.trim()) return;

    if (editingCode.id) {
      // Update existing code
      onUpdate(
        editingCode.id,
        editingCode.system,
        editingCode.code,
        editingCode.description || undefined,
        editingCode.isActive
      );
    } else {
      // Add new code
      onAdd(
        editingCode.system,
        editingCode.code,
        editingCode.description || undefined
      );
    }

    setEditingCode(null);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setEditingCode(null);
    setIsAdding(false);
  };

  const handleRemove = (codeId: string) => {
    onRemove(codeId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Внешние коды</h3>
        {!readonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartAdd}
            disabled={isAdding || !!editingCode}
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Добавить код
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingCode) && (
        <div className="bg-slate-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-200 block">
                Система <span className="text-red-400">*</span>
              </Label>
              <Input
                value={editingCode?.system || ""}
                onChange={(e) => setEditingCode(prev => prev ? { ...prev, system: e.target.value } : null)}
                placeholder="ЕГАИС"
                className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200 block">
                Код <span className="text-red-400">*</span>
              </Label>
              <Input
                value={editingCode?.code || ""}
                onChange={(e) => setEditingCode(prev => prev ? { ...prev, code: e.target.value } : null)}
                placeholder="KZ-001"
                className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200 block">Описание</Label>
            <Input
              value={editingCode?.description || ""}
              onChange={(e) => setEditingCode(prev => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Код в системе ЕГАИС"
              className="bg-slate-600 border-slate-500 text-white placeholder-slate-400"
            />
          </div>

          {editingCode?.id && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={editingCode.isActive}
                onCheckedChange={(checked) => setEditingCode(prev => prev ? { ...prev, isActive: checked } : null)}
              />
              <span className="text-slate-200">Активен</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <X className="h-4 w-4 mr-2" />
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editingCode?.system.trim() || !editingCode?.code.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              {editingCode?.id ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </div>
      )}

      {/* External Codes List */}
      <div className="space-y-3">
        {externalCodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            Нет внешних кодов
          </div>
        ) : (
          externalCodes.map((externalCode) => (
            <div
              key={externalCode.id}
              className="bg-slate-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-white">{externalCode.system}</span>
                  <Badge 
                    variant="secondary" 
                    className="bg-slate-600 text-slate-200"
                  >
                    {externalCode.code}
                  </Badge>
                  <Badge 
                    className={externalCode.isActive ? "bg-green-600 text-white" : "bg-gray-600 text-white"}
                  >
                    {externalCode.isActive ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
                {externalCode.description && (
                  <p className="text-sm text-slate-400">{externalCode.description}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Создан: {new Date(externalCode.createdAt).toLocaleDateString('ru-RU')}
                  {externalCode.updatedAt && (
                    <span> • Обновлен: {new Date(externalCode.updatedAt).toLocaleDateString('ru-RU')}</span>
                  )}
                </p>
              </div>
              
              {!readonly && (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(externalCode)}
                    disabled={isAdding || !!editingCode}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(externalCode.id)}
                    disabled={isAdding || !!editingCode}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}