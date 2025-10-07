/**
 * Компонент фильтров для страницы обзора сети
 */

import { RefreshCw, Calendar, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NetworkFiltersProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  loading: boolean;
  onRefresh: () => void;
}

export function NetworkFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  filtersOpen,
  onFiltersOpenChange,
  loading,
  onRefresh
}: NetworkFiltersProps) {
  return (
    <Collapsible open={filtersOpen} onOpenChange={onFiltersOpenChange}>
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-lg">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 md:px-6 py-3 hover:bg-slate-700/50 transition-colors group">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                Фильтры
              </span>
            </div>
            {filtersOpen ? (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-transform" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-transform" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 md:px-6 pb-4 space-y-4 border-t border-slate-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Дата начала
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Дата окончания
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={onRefresh}
                disabled={loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Обновление...' : 'Применить'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
