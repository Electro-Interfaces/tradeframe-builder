import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { SelectTradingPointMessage } from '@/components/common/SelectTradingPointMessage';
import { LoadingState } from '@/components/common/PageStates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelection } from '@/contexts/SelectionContext';
import { useInventoryAdjustments } from '@/hooks/useInventoryAdjustments';
import type { InventoryAdjustment, InventoryAdjustmentStatus } from '@/types/inventoryAdjustment';
import { InventoryAdjustmentsTable } from './components/InventoryAdjustmentsTable';
import { InventoryAdjustmentsCards } from './components/InventoryAdjustmentsCards';

export default function InventoryAdjustmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const { selectedTradingPoint, selectedNetwork, selectedStation, isInitialized } = useSelection();
  const networkUuid = selectedStation?.networkId || selectedNetwork?.id;

  const [statusFilter, setStatusFilter] = useState<InventoryAdjustmentStatus | 'all'>('all');
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryAdjustment | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<InventoryAdjustment | null>(null);

  const filters = useMemo(
    () => ({
      networkId: networkUuid || undefined,
      tradingPointId: selectedTradingPoint || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    [networkUuid, selectedTradingPoint, statusFilter]
  );

  const { items, loading, removeDraft, cancelDraft } = useInventoryAdjustments(filters);

  // Если пришли с `?create=1` — перебрасываем сразу на форму создания.
  useEffect(() => {
    if (searchParams.get('create') === '1' && selectedTradingPoint && selectedTradingPoint !== 'all') {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
      navigate('/point/inventory-adjustments/new');
    }
  }, [searchParams, selectedTradingPoint, navigate, setSearchParams]);

  if (!isInitialized) {
    return (
      <MainLayout fullWidth>
        <LoadingState message="Инициализация данных..." />
      </MainLayout>
    );
  }

  if (!selectedTradingPoint || selectedTradingPoint === 'all') {
    return (
      <MainLayout fullWidth>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку для просмотра документов корректировки остатков" />
        </div>
      </MainLayout>
    );
  }

  const handleView = (item: InventoryAdjustment) => {
    navigate(`/point/inventory-adjustments/${item.id}`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    await removeDraft(deleteCandidate.id);
    setDeleteCandidate(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelCandidate) return;
    await cancelDraft(cancelCandidate.id);
    setCancelCandidate(null);
  };

  return (
    <MainLayout fullWidth>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        <div className="mb-6 pt-4 flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Инвентаризация остатков нефтепродуктов
          </h1>
          <Button
            size="sm"
            onClick={() => navigate('/point/inventory-adjustments/new')}
            disabled={!selectedTradingPoint || selectedTradingPoint === 'all'}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Создать документ</span>
            <span className="sm:hidden">Создать</span>
          </Button>
        </div>

        <div className="bg-card mb-6 rounded-lg border border-border">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-foreground" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Всего документов: {items.length}</div>
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as InventoryAdjustmentStatus | 'all')}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="draft">Черновики</SelectItem>
                  <SelectItem value="sent">Отправленные</SelectItem>
                  <SelectItem value="cancelled">Отменённые</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Загрузка документов..." />
        ) : (
          <>
            {!isMobile && (
              <InventoryAdjustmentsTable
                items={items}
                onView={handleView}
                onDelete={setDeleteCandidate}
                onCancel={setCancelCandidate}
              />
            )}
            {isMobile && (
              <InventoryAdjustmentsCards
                items={items}
                onView={handleView}
                onDelete={setDeleteCandidate}
                onCancel={setCancelCandidate}
              />
            )}
          </>
        )}

        <ConfirmDialog
          open={!!deleteCandidate}
          onOpenChange={(open) => !open && setDeleteCandidate(null)}
          title="Удалить черновик?"
          description={`Документ корректировки № ${deleteCandidate?.orderNumber || ''} будет удалён без возможности восстановления.`}
          onConfirm={handleConfirmDelete}
          confirmText="Удалить"
          variant="destructive"
        />

        <ConfirmDialog
          open={!!cancelCandidate}
          onOpenChange={(open) => !open && setCancelCandidate(null)}
          title="Отменить документ?"
          description={`Документ корректировки № ${cancelCandidate?.orderNumber || ''} будет помечен как отменённый. Применять его нельзя.`}
          onConfirm={handleConfirmCancel}
          confirmText="Отменить документ"
          variant="destructive"
        />

      </div>
    </MainLayout>
  );
}
