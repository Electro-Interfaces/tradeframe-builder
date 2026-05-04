/**
 * Создание / просмотр / редактирование документа корректировки остатков.
 * - Без id в URL — режим создания: подтягиваются текущие резервуары АЗС из STS.
 * - С id — режим просмотра/редактирования: загружается существующий документ.
 *   Редактирование возможно только в статусе draft.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Save, Send, Trash2, XCircle } from 'lucide-react';
import { getBackendOrigin } from '@/utils/backendUrl';
import { getToken } from '@/utils/authStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingState } from '@/components/common/PageStates';
import { SelectTradingPointMessage } from '@/components/common/SelectTradingPointMessage';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/contexts/SelectionContext';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useStationNetworkId } from '@/hooks/useStationNetworkId';
import { stsApiService } from '@/services/stsApi';
import { inventoryAdjustmentsService } from '@/services/inventoryAdjustmentsService';
import type {
  InventoryAdjustment,
  InventoryAdjustmentItem,
} from '@/types/inventoryAdjustment';
import {
  formatDateTimeRu,
  formatStatus,
  getStatusBadgeClass,
  formatLitersDelta,
} from './utils/formatters';

interface ItemDraft {
  tankNumber: number;
  fuelName: string;
  bookVolumeL: number;
  bookMassKg: number | null;
  // Поле ввода: корректировка со знаком (например "-80" или "+30").
  // Пустая строка = резервуар не попал в приказ.
  deltaVolumeLInput: string;
  deltaMassKgInput: string;
}

interface HeaderDraft {
  orderNumber: string;
  orderDate: string;
  inventoryDate: string;
  effectiveAt: string;
  comment: string;
}

const EMPTY_HEADER: HeaderDraft = {
  orderNumber: '',
  orderDate: '',
  inventoryDate: '',
  effectiveAt: '',
  comment: '',
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function fromDateTimeLocalToIso(value: string): string {
  if (!value) return '';
  // input value: "2026-05-04T15:30" — трактуем как локальное время
  const local = new Date(value);
  if (Number.isNaN(local.getTime())) return '';
  return local.toISOString();
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed.replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function itemDraftToPayload(item: ItemDraft) {
  // На UI пользователь вводит корректировку (delta), backend хранит итоговый остаток (fact = book + delta).
  const deltaVolume = parseNullableNumber(item.deltaVolumeLInput);
  const deltaMass = parseNullableNumber(item.deltaMassKgInput);

  return {
    tankNumber: item.tankNumber,
    fuelName: item.fuelName,
    bookVolumeL: item.bookVolumeL,
    bookMassKg: item.bookMassKg ?? null,
    factVolumeL: deltaVolume === null ? null : item.bookVolumeL + deltaVolume,
    factMassKg: deltaMass === null || item.bookMassKg === null ? null : item.bookMassKg + deltaMass,
  };
}

export default function InventoryAdjustmentEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const { toast } = useToast();

  const { selectedTradingPoint, selectedNetwork, selectedStation, isInitialized } = useSelection();
  const networkExternalId = useStationNetworkId();
  const { user: currentUser } = useNewAuth();
  // UUID сети — для записи в БД (отличается от external_id из useStationNetworkId)
  const networkUuid = selectedStation?.networkId || selectedNetwork?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<InventoryAdjustment | null>(null);
  const [header, setHeader] = useState<HeaderDraft>(EMPTY_HEADER);
  const [items, setItems] = useState<ItemDraft[]>([]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);

  const isEditable = isNew || existing?.status === 'draft';

  // Первичная загрузка: либо документ по id, либо пустая форма с резервуарами
  useEffect(() => {
    let aborted = false;

    async function loadForCreate() {
      if (!networkExternalId || !selectedTradingPoint || selectedTradingPoint === 'all') {
        setLoading(false);
        return;
      }

      // STS требует external_id станции (как в useEquipment)
      let stationExternalId: string | undefined = selectedStation?.external_id;
      if (!stationExternalId) {
        const parts = selectedTradingPoint.split('-azs-');
        if (parts.length === 2 && parts[1]) {
          stationExternalId = parts[1];
        }
      }
      if (!stationExternalId) {
        setLoading(false);
        toast({
          title: 'Не удалось определить станцию',
          description: 'У торговой точки нет external_id для STS',
          variant: 'destructive',
        });
        return;
      }

      try {
        setLoading(true);
        const tanks = await stsApiService.getTanks({
          networkId: networkExternalId,
          tradingPointId: stationExternalId,
        });
        if (aborted) return;
        const drafts: ItemDraft[] = tanks
          .map((tank) => ({
            tankNumber: Number(tank.id),
            fuelName: tank.fuelType || '—',
            bookVolumeL: tank.apiData?.volume_begin ?? tank.currentLevelLiters ?? 0,
            bookMassKg: tank.apiData?.amount_begin ?? null,
            deltaVolumeLInput: '',
            deltaMassKgInput: '',
          }))
          .sort((a, b) => a.tankNumber - b.tankNumber);
        setItems(drafts);
        setHeader({
          ...EMPTY_HEADER,
          orderDate: new Date().toISOString().slice(0, 10),
          inventoryDate: new Date().toISOString().slice(0, 10),
          effectiveAt: toDateTimeLocalValue(new Date().toISOString()),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast({
          title: 'Не удалось загрузить резервуары',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    async function loadExisting(documentId: string) {
      try {
        setLoading(true);
        const doc = await inventoryAdjustmentsService.getById(documentId);
        if (aborted) return;
        setExisting(doc);
        setHeader({
          orderNumber: doc.orderNumber,
          orderDate: toDateInputValue(doc.orderDate),
          inventoryDate: toDateInputValue(doc.inventoryDate),
          effectiveAt: toDateTimeLocalValue(doc.effectiveAt),
          comment: doc.comment ?? '',
        });
        setItems(
          (doc.items || []).map((it: InventoryAdjustmentItem) => ({
            tankNumber: it.tankNumber,
            fuelName: it.fuelName,
            bookVolumeL: it.bookVolumeL ?? 0,
            bookMassKg: it.bookMassKg,
            // На UI показываем корректировку (delta). При загрузке восстанавливаем из дельты,
            // вычисленной БД (или из разности fact - book как fallback).
            deltaVolumeLInput:
              it.deltaVolumeL !== null && it.deltaVolumeL !== undefined ? String(it.deltaVolumeL) : '',
            deltaMassKgInput:
              it.deltaMassKg !== null && it.deltaMassKg !== undefined ? String(it.deltaMassKg) : '',
          }))
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        toast({
          title: 'Не удалось загрузить документ',
          description: error.message,
          variant: 'destructive',
        });
        navigate('/point/inventory-adjustments');
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    if (isNew) {
      void loadForCreate();
    } else if (id) {
      void loadExisting(id);
    }

    return () => {
      aborted = true;
    };
  }, [id, isNew, networkExternalId, selectedTradingPoint, selectedStation?.external_id, toast, navigate]);

  const filledRowsCount = useMemo(
    () => items.filter((it) => parseNullableNumber(it.deltaVolumeLInput) !== null).length,
    [items]
  );

  const computeAdjustedVolume = useCallback((it: ItemDraft) => {
    const delta = parseNullableNumber(it.deltaVolumeLInput);
    if (delta === null) return null;
    return it.bookVolumeL + delta;
  }, []);

  const computeAdjustedMass = useCallback((it: ItemDraft) => {
    const delta = parseNullableNumber(it.deltaMassKgInput);
    if (delta === null || it.bookMassKg === null) return null;
    return it.bookMassKg + delta;
  }, []);

  const handleItemChange = (tankNumber: number, field: 'delta' | 'mass', value: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.tankNumber === tankNumber
          ? { ...it, ...(field === 'delta' ? { deltaVolumeLInput: value } : { deltaMassKgInput: value }) }
          : it
      )
    );
  };

  const validateHeader = (): string | null => {
    if (!header.orderNumber.trim()) return 'Заполните номер приказа';
    if (!header.orderDate) return 'Укажите дату приказа';
    if (!header.inventoryDate) return 'Укажите дату фактической инвентаризации';
    if (!header.effectiveAt) return 'Укажите время начала действия';
    return null;
  };

  const handleSaveDraft = async () => {
    const err = validateHeader();
    if (err) {
      toast({ title: 'Проверьте поля', description: err, variant: 'destructive' });
      return;
    }
    if (!networkUuid || !selectedTradingPoint) {
      toast({
        title: 'Не выбрана АЗС',
        description: 'Перед сохранением выберите торговую точку',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        networkId: networkUuid,
        tradingPointId: selectedTradingPoint,
        orderNumber: header.orderNumber.trim(),
        orderDate: header.orderDate,
        inventoryDate: header.inventoryDate,
        effectiveAt: fromDateTimeLocalToIso(header.effectiveAt),
        comment: header.comment.trim() || null,
        items: items.map(itemDraftToPayload),
      };

      let saved: InventoryAdjustment;
      if (isNew) {
        saved = await inventoryAdjustmentsService.create(payload);
        toast({ title: 'Документ сохранён', description: 'Черновик создан.' });
        navigate(`/point/inventory-adjustments/${saved.id}`, { replace: true });
      } else {
        saved = await inventoryAdjustmentsService.update(id!, payload);
        setExisting(saved);
        toast({ title: 'Документ сохранён' });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Ошибка сохранения',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await inventoryAdjustmentsService.remove(id);
      toast({ title: 'Документ удалён' });
      navigate('/point/inventory-adjustments');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось удалить',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSend = async () => {
    if (!id) return;
    setSending(true);
    try {
      const updated = await inventoryAdjustmentsService.send(id);
      setExisting(updated);
      toast({
        title: 'Документ отправлен',
        description: `Email отправлен на ${updated.emailTo?.length ?? 0} адресов.`,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось отправить',
        description: error.message,
        variant: 'destructive',
      });
      // При ошибке backend выставил email_status='failed' и email_error.
      // Перечитываем документ, чтобы UI показал плашку об ошибке и кнопку «Повторить отправку».
      try {
        const refreshed = await inventoryAdjustmentsService.getById(id);
        setExisting(refreshed);
      } catch {
        // ignore
      }
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const token = getToken();
      const response = await fetch(`${getBackendOrigin()}/api${inventoryAdjustmentsService.pdfUrl(id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-adjustment-${existing?.orderNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось скачать PDF',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      const updated = await inventoryAdjustmentsService.cancel(id);
      setExisting(updated);
      toast({ title: 'Документ отменён' });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось отменить',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!isInitialized) {
    return (
      <MainLayout fullWidth>
        <LoadingState message="Инициализация данных..." />
      </MainLayout>
    );
  }

  if (isNew && (!selectedTradingPoint || selectedTradingPoint === 'all')) {
    return (
      <MainLayout fullWidth>
        <div className="p-6">
          <SelectTradingPointMessage message="Выберите торговую точку для создания документа корректировки остатков" />
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout fullWidth>
        <LoadingState message="Загрузка документа..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth>
      <div className="w-full px-4 md:px-6 lg:px-8 py-4 max-w-6xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/point/inventory-adjustments')}
          className="mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">
              {isNew
                ? 'Инвентаризация остатков нефтепродуктов'
                : `Инвентаризация остатков нефтепродуктов · приказ № ${existing?.orderNumber || ''}`}
            </h1>
            {existing ? (
              <div className="text-xs text-muted-foreground mt-1">
                Создан {formatDateTimeRu(existing.createdAt)} · автор {existing.createdByName || existing.createdByEmail}
              </div>
            ) : (
              currentUser && (
                <div className="text-xs text-muted-foreground mt-1">
                  Будет зафиксирован как автор: {currentUser.name || currentUser.email}
                </div>
              )
            )}
          </div>
          {existing && (
            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(existing.status)}`}>
              {formatStatus(existing.status)}
            </Badge>
          )}
        </div>

        {/* Шапка документа */}
        <section className="rounded-lg border border-border bg-card p-4 md:p-6 mb-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Реквизиты приказа</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderNumber">Номер приказа *</Label>
              <Input
                id="orderNumber"
                value={header.orderNumber}
                onChange={(e) => setHeader((h) => ({ ...h, orderNumber: e.target.value }))}
                disabled={!isEditable || saving}
                placeholder="например, 145-к"
              />
            </div>
            <div>
              <Label htmlFor="orderDate">Дата приказа *</Label>
              <Input
                id="orderDate"
                type="date"
                value={header.orderDate}
                onChange={(e) => setHeader((h) => ({ ...h, orderDate: e.target.value }))}
                disabled={!isEditable || saving}
              />
            </div>
            <div>
              <Label htmlFor="inventoryDate">Дата фактической инвентаризации *</Label>
              <Input
                id="inventoryDate"
                type="date"
                value={header.inventoryDate}
                onChange={(e) => setHeader((h) => ({ ...h, inventoryDate: e.target.value }))}
                disabled={!isEditable || saving}
              />
            </div>
            <div>
              <Label htmlFor="effectiveAt">Время начала действия *</Label>
              <Input
                id="effectiveAt"
                type="datetime-local"
                value={header.effectiveAt}
                onChange={(e) => setHeader((h) => ({ ...h, effectiveAt: e.target.value }))}
                disabled={!isEditable || saving}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Информационное поле для исполнителя — указывается в PDF приказа.
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="comment">Комментарий, причина расхождения</Label>
              <Textarea
                id="comment"
                value={header.comment}
                onChange={(e) => setHeader((h) => ({ ...h, comment: e.target.value }))}
                disabled={!isEditable || saving}
                rows={3}
                placeholder="Свободный текст"
              />
            </div>
          </div>
        </section>

        {/* Таблица резервуаров */}
        <section className="rounded-lg border border-border bg-card p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-foreground">Корректировка по резервуарам</h2>
            <div className="text-xs text-muted-foreground">
              Заполнено строк: {filledRowsCount} из {items.length}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Заполняйте только те резервуары, по которым приказом утверждена корректировка.
            Корректировка по массе (кг) — опциональна, заполняется только если указана в приказе.
          </p>

          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isNew
                ? 'STS не вернул данных о резервуарах для этой торговой точки'
                : 'В документе нет строк'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-2 py-2 text-left text-foreground font-medium text-xs uppercase">№</th>
                    <th className="px-2 py-2 text-left text-foreground font-medium text-xs uppercase">Топливо</th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs uppercase">Книжный, л</th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs uppercase">Корректировка, л *</th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs uppercase">Итог, л</th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs uppercase">Книжная, кг</th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs normal-case lowercase">
                      Корректировка, кг <span className="text-muted-foreground normal-case">(опц.)</span>
                    </th>
                    <th className="px-2 py-2 text-right text-foreground font-medium text-xs uppercase">Итог, кг</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const deltaV = parseNullableNumber(item.deltaVolumeLInput);
                    const deltaM = parseNullableNumber(item.deltaMassKgInput);
                    const adjustedV = computeAdjustedVolume(item);
                    const adjustedM = computeAdjustedMass(item);
                    const deltaClass = (d: number | null) =>
                      d === null
                        ? 'text-foreground/50'
                        : d > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : d < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-foreground/80';
                    return (
                      <tr key={item.tankNumber} className="border-b border-border">
                        <td className="px-2 py-2 font-medium text-foreground">{item.tankNumber}</td>
                        <td className="px-2 py-2 text-foreground/80">{item.fuelName}</td>
                        <td className="px-2 py-2 text-right text-foreground/80">
                          {item.bookVolumeL.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-2 py-2 text-right ${deltaClass(deltaV)}`}>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.deltaVolumeLInput}
                            onChange={(e) => handleItemChange(item.tankNumber, 'delta', e.target.value)}
                            disabled={!isEditable || saving}
                            className="text-right h-8 w-28 ml-auto"
                            placeholder="±"
                            title="Введите корректировку со знаком (например, -80 или 30)"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-foreground/80 text-xs">
                          {adjustedV !== null
                            ? adjustedV.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
                            : '—'}
                        </td>
                        <td className="px-2 py-2 text-right text-foreground/80">
                          {item.bookMassKg !== null
                            ? item.bookMassKg.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
                            : '—'}
                        </td>
                        <td className={`px-2 py-2 text-right ${deltaClass(deltaM)}`}>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.deltaMassKgInput}
                            onChange={(e) => handleItemChange(item.tankNumber, 'mass', e.target.value)}
                            disabled={!isEditable || saving || item.bookMassKg === null}
                            className="text-right h-8 w-28 ml-auto"
                            placeholder="±"
                            title="Введите корректировку массы со знаком"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-foreground/80 text-xs">
                          {adjustedM !== null
                            ? adjustedM.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Действия */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {existing?.status === 'draft' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить черновик
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                disabled={saving}
                className="hover:text-amber-500"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Отменить документ
              </Button>
            </>
          )}
          {isEditable && (
            <Button onClick={handleSaveDraft} disabled={saving} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Сохранить черновик
            </Button>
          )}
          {existing && existing.status !== 'cancelled' && existing.pdfPath && (
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Скачать PDF
            </Button>
          )}
          {existing?.status === 'draft' && (
            <Button onClick={() => setConfirmSend(true)} disabled={saving || sending} size="sm">
              <Send className="w-4 h-4 mr-2" />
              {existing.emailStatus === 'failed' ? 'Повторить отправку' : 'Отправить'}
            </Button>
          )}
        </div>

        {existing?.emailStatus === 'failed' && existing.emailError && (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <strong>Предыдущая отправка не удалась:</strong> {existing.emailError}
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Удалить черновик?"
          description="Документ будет удалён без возможности восстановления."
          onConfirm={handleDelete}
          confirmText="Удалить"
          variant="destructive"
        />

        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="Отменить документ?"
          description="Документ будет помечен как отменённый. Применять его нельзя."
          onConfirm={handleCancel}
          confirmText="Отменить документ"
          variant="destructive"
        />

        <ConfirmDialog
          open={confirmSend}
          onOpenChange={setConfirmSend}
          title="Отправить документ на выполнение?"
          description="После отправки документ переходит в статус «Отправлен» и не может быть отменён или изменён. Если потребуется откатить корректировку — оформите новый сторнирующий документ с противоположным знаком."
          onConfirm={handleSend}
          confirmText="Отправить"
        />
      </div>
    </MainLayout>
  );
}
