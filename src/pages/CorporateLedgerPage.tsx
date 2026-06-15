/**
 * Раздел «Ведомости» — корпоративные клиенты ГИГ и корпоративные заказы топлива.
 * MVP: реестр клиентов + ведомость заказов (план/факт). Отправка в MSTO — фаза 2.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelection } from '@/contexts/SelectionContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, Pencil, Trash2, Download, RefreshCw, Users, FileText } from 'lucide-react';
import { corporateClientsService } from '@/services/corporateClientsService';
import { corporateOrdersService } from '@/services/corporateOrdersService';
import { ClientFormModal } from '@/components/corporate-ledger/ClientFormModal';
import { CreateOrderModal } from '@/components/corporate-ledger/CreateOrderModal';
import {
  ORDER_STATUS_LABELS,
  type CorporateClient,
  type CorporateOrder,
  type CorporateOrderStatus,
} from '@/types/corporateLedger';
import { todayString } from '@/utils/dateUtils';

const STATUS_VARIANT: Record<CorporateOrderStatus, string> = {
  draft: 'bg-secondary text-foreground',
  sent: 'bg-primary text-primary-foreground',
  fulfilled: 'bg-emerald-600 text-white',
  partial: 'bg-amber-600 text-white',
  cancelled: 'bg-secondary text-muted-foreground',
  failed: 'bg-red-600 text-white',
};

function fmt(n: number): string {
  return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CorporateLedgerPage() {
  const { selectedNetwork } = useSelection();
  const networkId = selectedNetwork?.id || '';

  const [view, setView] = useState<'ledger' | 'clients'>('ledger');
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [orders, setOrders] = useState<CorporateOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Фильтры ведомости
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>(() => todayString());

  // Модалки
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<CorporateClient | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const loadClients = useCallback(() => {
    if (!networkId) return;
    corporateClientsService.list({ networkId }).then(setClients).catch(() => setClients([]));
  }, [networkId]);

  const loadOrders = useCallback(() => {
    if (!networkId) return;
    setLoading(true);
    corporateOrdersService.list({
      networkId,
      clientId: filterClientId !== 'all' ? filterClientId : undefined,
      dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    })
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [networkId, filterClientId, dateFrom, dateTo]);

  useEffect(() => { loadClients(); }, [loadClients]);
  useEffect(() => { loadOrders(); }, [loadOrders]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        acc.ordered += o.mode === 'liters' ? o.orderedVolume : o.orderedAmount;
        acc.actual += o.actualVolume;
        return acc;
      },
      { ordered: 0, actual: 0 },
    );
  }, [orders]);

  const handleDeleteClient = async (c: CorporateClient) => {
    if (!confirm(`Удалить клиента «${c.name}»?`)) return;
    try { await corporateClientsService.remove(c.id); loadClients(); } catch (e: any) { alert(e.message); }
  };

  const handleDeleteOrder = async (o: CorporateOrder) => {
    if (!confirm('Удалить заказ из ведомости?')) return;
    try { await corporateOrdersService.remove(o.id); loadOrders(); } catch (e: any) { alert(e.message); }
  };

  const handleExport = () => {
    const header = ['Дата', 'Клиент', 'АЗС', 'Топливо', 'Колонка', 'Заказано', 'Ед.', 'Факт, л', 'Статус'];
    const rows = orders.map((o) => [
      new Date(o.createdAt).toLocaleString('ru-RU'),
      o.corporateClientName,
      o.stationName || o.stationCode,
      o.fuelName || o.fuelCode,
      o.columnNumber ?? '',
      o.mode === 'liters' ? o.orderedVolume : o.orderedAmount,
      o.mode === 'liters' ? 'л' : '₽',
      o.actualVolume,
      ORDER_STATUS_LABELS[o.status],
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ведомость_${todayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!networkId) {
    return (
      <MainLayout fullWidth>
        <div className="w-full px-4 md:px-6 lg:px-8 pt-6">
          <h1 className="text-xl font-bold text-foreground mb-4">Ведомости</h1>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Выберите торговую сеть для работы с корпоративными клиентами и заказами.</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth>
      <div className="w-full px-4 md:px-6 lg:px-8 pt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-foreground">Ведомости · {selectedNetwork?.name}</h1>
          <div className="flex gap-2">
            <Button variant={view === 'ledger' ? 'default' : 'outline'} size="sm" onClick={() => setView('ledger')}>
              <FileText className="h-4 w-4 mr-2" />Ведомость
            </Button>
            <Button variant={view === 'clients' ? 'default' : 'outline'} size="sm" onClick={() => setView('clients')}>
              <Users className="h-4 w-4 mr-2" />Клиенты
            </Button>
          </div>
        </div>

        {view === 'clients' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Корпоративные клиенты ({clients.length})</h2>
              <Button size="sm" onClick={() => { setEditClient(null); setClientModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Добавить клиента
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Наименование</TableHead>
                  <TableHead>ИНН</TableHead>
                  <TableHead>Контакт</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Клиентов нет</TableCell></TableRow>
                ) : clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.inn || '—'}</TableCell>
                    <TableCell>{c.contactPerson || '—'}</TableCell>
                    <TableCell>{c.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge className={c.isActive ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'}>
                        {c.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditClient(c); setClientModalOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteClient(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {view === 'ledger' && (
          <Card className="p-4">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Клиент</Label>
                  <Select value={filterClientId} onValueChange={setFilterClientId}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все клиенты</SelectItem>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">С</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">По</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
                <Button variant="outline" size="icon" onClick={loadOrders} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport} disabled={orders.length === 0}>
                  <Download className="h-4 w-4 mr-2" />Экспорт
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOrderModalOpen(true)}
                  disabled={clients.filter((c) => c.isActive).length === 0}
                  title={clients.filter((c) => c.isActive).length === 0 ? 'Сначала добавьте корпоративного клиента' : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />Создать заказ
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>АЗС</TableHead>
                  <TableHead>Топливо</TableHead>
                  <TableHead className="text-center">Колонка</TableHead>
                  <TableHead className="text-right">Заказано</TableHead>
                  <TableHead className="text-right">Факт, л</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Заказов нет</TableCell></TableRow>
                ) : orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm">{new Date(o.createdAt).toLocaleString('ru-RU')}</TableCell>
                    <TableCell className="font-medium">{o.corporateClientName}</TableCell>
                    <TableCell>{o.stationName || o.stationCode}</TableCell>
                    <TableCell>{o.fuelName || o.fuelCode}</TableCell>
                    <TableCell className="text-center">{o.columnNumber ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {o.mode === 'liters' ? `${fmt(o.orderedVolume)} л` : `${fmt(o.orderedAmount)} ₽`}
                    </TableCell>
                    <TableCell className="text-right font-mono">{o.actualVolume > 0 ? fmt(o.actualVolume) : '—'}</TableCell>
                    <TableCell><Badge className={STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></TableCell>
                    <TableCell>
                      {o.status === 'draft' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteOrder(o)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {orders.length > 0 && (
              <div className="mt-3 text-sm text-muted-foreground text-right">
                Заказов: <b className="text-foreground">{orders.length}</b> · Заказано (л): <b className="text-foreground">{fmt(totals.ordered)}</b> · Факт (л): <b className="text-foreground">{fmt(totals.actual)}</b>
              </div>
            )}
          </Card>
        )}
      </div>

      <ClientFormModal
        isOpen={clientModalOpen}
        onOpenChange={setClientModalOpen}
        networkId={networkId}
        client={editClient}
        onSaved={loadClients}
      />
      <CreateOrderModal
        isOpen={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        networkId={networkId}
        clients={clients}
        onCreated={loadOrders}
      />
    </MainLayout>
  );
}
