import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Edit, 
  Archive, 
  ArchiveRestore, 
  Trash2,
  FileText
} from "lucide-react";
import { nomenclatureService } from '@/services/nomenclatureService';
import { FuelNomenclature, FuelNomenclatureFilters } from '@/types/nomenclature';
import { useSelection } from "@/context/SelectionContext";

interface NomenclatureListProps {
  onEdit?: (item: FuelNomenclature) => void;
  onCreate?: () => void;
}

export const NomenclatureList: React.FC<NomenclatureListProps> = ({ onEdit, onCreate }) => {
  const { selectedNetwork } = useSelection();
  const [nomenclature, setNomenclature] = useState<FuelNomenclature[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<FuelNomenclatureFilters>({
    status: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    if (selectedNetwork) {
      loadNomenclature();
    } else {
      setNomenclature([]);
      setLoading(false);
    }
  }, [filters, selectedNetwork]);

  const loadNomenclature = async () => {
    if (!selectedNetwork) {
      setNomenclature([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await nomenclatureService.getNomenclature({
        ...filters,
        networkId: selectedNetwork.id
      });
      setNomenclature(data);
    } catch (error) {
      console.error('Failed to load nomenclature:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      setActionLoading(`archive-${id}`);
      await nomenclatureService.archiveNomenclature(id);
      await loadNomenclature();
    } catch (error) {
      console.error('Failed to archive nomenclature:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(`activate-${id}`);
      await nomenclatureService.activateNomenclature(id);
      await loadNomenclature();
    } catch (error) {
      console.error('Failed to activate nomenclature:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту номенклатуру?')) {
      try {
        setActionLoading(`delete-${id}`);
        await nomenclatureService.deleteNomenclature(id);
        await loadNomenclature();
      } catch (error) {
        console.error('Failed to delete nomenclature:', error);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const formatDate = (date: Date | string) => {
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      
      // Проверяем, что дата валидна
      if (isNaN(validDate.getTime())) {
        return 'Нет данных';
      }
      
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(validDate);
    } catch (error) {
      console.warn('Invalid date value:', date);
      return 'Нет данных';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Номенклатура топлива</h1>
        </div>
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <div className="text-white">Загрузка...</div>
          </div>
        </div>
      </div>
    );
  }

  // Проверка выбора торговой сети
  if (!selectedNetwork) {
    return (
      <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
        <div className="mb-6 px-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Номенклатура топлива</h1>
        </div>
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-6 py-4">
            <EmptyState 
              title="Выберите торговую сеть" 
              description="Для просмотра номенклатуры топлива необходимо выбрать торговую сеть из выпадающего списка выше"
              className="py-16"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full -mr-4 md:-mr-6 lg:-mr-8 pl-1">
      {/* Заголовок страницы */}
      <div className="mb-6 px-6 pt-4">
        <h1 className="text-2xl font-semibold text-white">Номенклатура топлива</h1>
        <p className="text-slate-400 mt-2">
          Справочник видов топлива для сети: {selectedNetwork?.name}
        </p>
      </div>

      {/* Панель номенклатуры */}
      <div className="bg-slate-800 mb-6 w-full">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white">Справочник видов топлива</h2>
            </div>
            <Button 
              onClick={onCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>

        </div>

        {nomenclature.length === 0 && !loading ? (
          <div className="px-6 pb-6">
            <EmptyState 
              title="Номенклатура не найдена" 
              description="Создайте первый вид топлива для начала работы"
              cta={
                <Button 
                  onClick={onCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить вид топлива
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block w-full">
              <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
                <table className="w-full text-sm min-w-full table-fixed">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '25%'}}>НАЗВАНИЕ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ВНУТРЕННИЙ КОД</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '20%'}}>СЕТЬ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ВНЕШНИЕ КОДЫ</th>
                      <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>СТАТУС</th>
                      <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '15%'}}>ДЕЙСТВИЯ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800">
                    {nomenclature.map((item) => (
                      <tr key={item.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-white text-base">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-slate-400 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <code className="bg-slate-600 text-slate-200 px-2 py-1 rounded text-sm font-mono">
                            {item.internalCode}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-slate-400">{item.networkName}</td>
                        <td className="px-6 py-4">
                          {item.externalCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.externalCodes.slice(0, 2).map((code) => (
                                <TooltipProvider key={code.id}>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs bg-slate-600 text-slate-200 border-slate-500">
                                        {code.systemType}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p><strong>{code.systemType}:</strong> {code.externalCode}</p>
                                      {code.description && <p className="text-sm">{code.description}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                              {item.externalCodes.length > 2 && (
                                <Badge variant="outline" className="text-xs bg-slate-600 text-slate-200 border-slate-500">
                                  +{item.externalCodes.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={item.status === 'active' ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                            {item.status === 'active' ? 'Активен' : 'Архив'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              onClick={() => onEdit?.(item)}
                              disabled={actionLoading?.includes(item.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {item.status === 'active' ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400"
                                onClick={() => handleArchive(item.id)}
                                disabled={actionLoading === `archive-${item.id}`}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                                onClick={() => handleActivate(item.id)}
                                disabled={actionLoading === `activate-${item.id}`}
                              >
                                <ArchiveRestore className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              onClick={() => handleDelete(item.id)}
                              disabled={actionLoading === `delete-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {nomenclature.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{item.name}</div>
                      <div className="text-sm text-slate-400 mb-1">
                        {item.networkName} • <code className="bg-slate-600 px-1 rounded">{item.internalCode}</code>
                      </div>
                      {item.description && (
                        <div className="text-sm text-slate-400 mb-2">{item.description}</div>
                      )}
                      <div className="flex items-center gap-3 text-xs mb-2">
                        <Badge className={item.status === 'active' ? "bg-green-600 text-white" : "bg-yellow-600 text-white"}>
                          {item.status === 'active' ? 'Активен' : 'Архив'}
                        </Badge>
                        <span className="text-slate-400">{formatDate(item.updatedAt)}</span>
                      </div>
                      {item.externalCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.externalCodes.map((code) => (
                            <Badge key={code.id} variant="outline" className="text-xs bg-slate-600 text-slate-200 border-slate-500">
                              {code.systemType}: {code.externalCode}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        onClick={() => onEdit?.(item)}
                        disabled={actionLoading?.includes(item.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {item.status === 'active' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-yellow-400"
                          onClick={() => handleArchive(item.id)}
                          disabled={actionLoading === `archive-${item.id}`}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-green-400"
                          onClick={() => handleActivate(item.id)}
                          disabled={actionLoading === `activate-${item.id}`}
                        >
                          <ArchiveRestore className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading === `delete-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};