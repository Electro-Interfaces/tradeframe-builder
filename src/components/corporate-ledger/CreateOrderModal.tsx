/**
 * Модалка оформления корпоративного заказа топлива.
 * MVP: создаёт локальную запись (ведомость). Отправка в MSTO — фаза 2 (заглушена).
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { tradingPointsService } from '@/services/tradingPointsService';
import { stsProxyClient } from '@/services/stsProxyClient';
import { corporateOrdersService } from '@/services/corporateOrdersService';
import type { TradingPoint } from '@/types/tradingpoint';
import {
  FUEL_OPTIONS,
  type CorporateClient,
  type CorporateOrderMode,
} from '@/types/corporateLedger';

interface CreateOrderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  networkId: string;
  networkExternalId: string;
  clients: CorporateClient[];
  onCreated: () => void;
}

export function CreateOrderModal({ isOpen, onOpenChange, networkId, networkExternalId, clients, onCreated }: CreateOrderModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<TradingPoint[]>([]);
  const [columns, setColumns] = useState<{ pos: number; nozzle: number; fuelName: string }[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);

  const [clientId, setClientId] = useState('');
  const [pointId, setPointId] = useState('');
  const [fuelCode, setFuelCode] = useState('');
  const [columnNumber, setColumnNumber] = useState('');
  const [mode, setMode] = useState<CorporateOrderMode>('liters');
  const [quantity, setQuantity] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen && networkId) {
      tradingPointsService.getByNetworkId(networkId).then(setPoints).catch(() => setPoints([]));
      setClientId('');
      setPointId('');
      setFuelCode('');
      setColumnNumber('');
      setMode('liters');
      setQuantity('');
      setComment('');
    }
  }, [isOpen, networkId]);

  // Колонки/пистолеты выбранной АЗС по видам топлива — из транзакций станции.
  // STS не отдаёт /v1/pumps (404); берём фактические pos/nozzle/fuel за 30 дней.
  useEffect(() => {
    setColumnNumber('');
    setColumns([]);
    if (!isOpen || !pointId || !networkExternalId) return;
    const point = points.find((p) => p.id === pointId);
    if (!point?.external_id) return;
    const now = new Date();
    const dtEnd = now.toISOString().slice(0, 10);
    const dtBeg = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    setColumnsLoading(true);
    stsProxyClient.get<any[]>('/v2/transactions', {
      system: networkExternalId,
      station: point.external_id,
      dt_beg: dtBeg,
      dt_end: dtEnd,
    })
      .then((data) => {
        const seen = new Set<string>();
        const out: { pos: number; nozzle: number; fuelName: string }[] = [];
        for (const st of Array.isArray(data) ? data : []) {
          for (const it of (st?.items || [])) {
            const pos = Number(it.pos);
            const nozzle = Number(it.nozzle);
            const fuelName = it.fuel_name || '';
            if (!pos || !fuelName) continue;
            const key = `${pos}-${nozzle}-${fuelName}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ pos, nozzle, fuelName });
          }
        }
        out.sort((a, b) => a.pos - b.pos || a.nozzle - b.nozzle);
        setColumns(out);
      })
      .catch(() => setColumns([]))
      .finally(() => setColumnsLoading(false));
  }, [pointId, networkExternalId, isOpen, points]);

  const activeClients = useMemo(() => clients.filter((c) => c.isActive), [clients]);
  const selectedFuelLabel = FUEL_OPTIONS.find((f) => String(f.code) === fuelCode)?.label || '';
  // Колонки/пистолеты, доступные для выбранного вида топлива на этой АЗС
  const fuelColumns = useMemo(() => {
    if (!fuelCode) return [];
    const lbl = selectedFuelLabel.toLowerCase();
    return columns.filter((c) => {
      const fn = c.fuelName.toLowerCase();
      return fn === lbl || fn.includes(lbl) || lbl.includes(fn);
    });
  }, [columns, fuelCode, selectedFuelLabel]);
  const qtyNum = parseFloat(quantity);
  const isValid = !!clientId && !!pointId && !!fuelCode && !isNaN(qtyNum) && qtyNum > 0;

  const buildPayload = () => {
    const point = points.find((p) => p.id === pointId);
    const fuel = FUEL_OPTIONS.find((f) => String(f.code) === fuelCode);
    return {
      corporateClientId: clientId,
      networkId,
      tradingPointId: pointId,
      stationCode: point?.external_id || '',
      stationName: point?.name,
      fuelCode: Number(fuelCode),
      fuelName: fuel?.label,
      columnNumber: columnNumber ? Number(columnNumber.split('-')[0]) : null,
      mode,
      quantity: qtyNum,
      comment: comment.trim() || undefined,
    };
  };

  const handleCreate = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await corporateOrdersService.create(buildPayload());
      toast({ title: 'Заказ оформлен' });
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Оформление заказа</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Корпоративный клиент *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Выберите клиента" /></SelectTrigger>
              <SelectContent>
                {activeClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>АЗС *</Label>
            <Select value={pointId} onValueChange={setPointId}>
              <SelectTrigger><SelectValue placeholder="Выберите АЗС" /></SelectTrigger>
              <SelectContent>
                {points.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Вид топлива *</Label>
              <Select value={fuelCode} onValueChange={(v) => { setFuelCode(v); setColumnNumber(''); }}>
                <SelectTrigger><SelectValue placeholder="Топливо" /></SelectTrigger>
                <SelectContent>
                  {FUEL_OPTIONS.map((f) => <SelectItem key={f.code} value={String(f.code)}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Колонка / пистолет</Label>
              <Select value={columnNumber} onValueChange={setColumnNumber} disabled={!pointId || !fuelCode || columnsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !pointId ? 'Сначала выберите АЗС'
                      : !fuelCode ? 'Сначала выберите топливо'
                        : columnsLoading ? 'Загрузка…'
                          : (fuelColumns.length ? 'Колонка' : 'Нет данных')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {fuelColumns.map((c) => (
                    <SelectItem key={`${c.pos}-${c.nozzle}`} value={`${c.pos}-${c.nozzle}`}>
                      Колонка {c.pos} · пистолет {c.nozzle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Единица</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as CorporateOrderMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="liters">Литры</SelectItem>
                  <SelectItem value="rubles">Рубли</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="co-qty">{mode === 'liters' ? 'Количество, л *' : 'Сумма, ₽ *'}</Label>
              <Input id="co-qty" type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="co-comment">Комментарий</Label>
            <Input id="co-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Отмена</Button>
          <Button onClick={handleCreate} disabled={!isValid || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Оформить заказ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
