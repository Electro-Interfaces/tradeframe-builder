import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X } from "lucide-react";
import { EquipmentFilters as IEquipmentFilters, EquipmentTemplate, EquipmentStatus } from "@/types/equipment";

interface EquipmentFiltersProps {
  filters: IEquipmentFilters;
  onFiltersChange: (filters: IEquipmentFilters) => void;
  templates: EquipmentTemplate[];
  loading?: boolean;
}

const statusOptions: Array<{ value: EquipmentStatus; label: string; color: string }> = [
  { value: "online", label: "Онлайн", color: "bg-green-500" },
  { value: "offline", label: "Офлайн", color: "bg-yellow-500" },
  { value: "error", label: "Ошибка", color: "bg-red-500" },
  { value: "disabled", label: "Отключено", color: "bg-gray-500" },
  { value: "archived", label: "Архив", color: "bg-slate-500" },
];

const systemTypeOptions = [
  { value: "fuel_tank", label: "Резервуары" },
  { value: "self_service_terminal", label: "Терминалы самообслуживания" },
  { value: "control_system", label: "Системы управления" },
  { value: "price_display", label: "Табло цен" },
  { value: "surveillance", label: "Видеонаблюдение" },
  { value: "audio_system", label: "Звуковое сопровождение" },
];

export function EquipmentFilters({ 
  filters, 
  onFiltersChange, 
  templates,
  loading = false 
}: EquipmentFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || "");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleTemplateChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      template_id: value === "all" ? undefined : value 
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      status: value === "all" ? undefined : value as EquipmentStatus 
    });
  };

  const handleSystemTypeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      system_type: value === "all" ? undefined : value 
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    onFiltersChange({});
  };

  const activeFiltersCount = [
    filters.search,
    filters.template_id,
    filters.status,
    filters.system_type,
  ].filter(Boolean).length;

  const selectedTemplate = templates.find(t => t.id === filters.template_id);
  const selectedStatus = statusOptions.find(s => s.value === filters.status);
  const selectedSystemType = systemTypeOptions.find(s => s.value === filters.system_type);

  return (
    <div className="space-y-4">
      {/* Строка поиска */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Поиск по названию или серийному номеру..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          disabled={loading}
        />
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Тип оборудования */}
        <Select 
          value={filters.template_id || "all"} 
          onValueChange={handleTemplateChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Тип оборудования" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Статус */}
        <Select 
          value={filters.status || "all"} 
          onValueChange={handleStatusChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${status.color}`} />
                  {status.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Тип системы */}
        <Select 
          value={filters.system_type || "all"} 
          onValueChange={handleSystemTypeChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Тип системы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все системы</SelectItem>
            {systemTypeOptions.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Кнопка очистки фильтров */}
        {activeFiltersCount > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearFilters}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-2" />
            Очистить ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Активные фильтры как badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Поиск: "{filters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSearchChange("")}
              />
            </Badge>
          )}
          
          {selectedTemplate && (
            <Badge variant="secondary" className="gap-1">
              Тип: {selectedTemplate.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleTemplateChange("all")}
              />
            </Badge>
          )}
          
          {selectedStatus && (
            <Badge variant="secondary" className="gap-1">
              <div className={`w-2 h-2 rounded-full ${selectedStatus.color}`} />
              {selectedStatus.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleStatusChange("all")}
              />
            </Badge>
          )}
          
          {selectedSystemType && (
            <Badge variant="secondary" className="gap-1">
              Система: {selectedSystemType.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSystemTypeChange("all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}