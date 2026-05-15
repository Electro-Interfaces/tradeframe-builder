/**
 * Admin: настройка email-рассылки приказов корректировки остатков по сетям.
 * Видна только пользователям с административным доступом (см. ProtectedRoute requireAdmin).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingState } from '@/components/common/PageStates';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { networksService } from '@/services/networksService';
import { inventoryAdjustmentsService } from '@/services/inventoryAdjustmentsService';
import { EmailRecipientsDialog } from '@/pages/InventoryAdjustments/components/EmailRecipientsDialog';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';
import type { Network } from '@/types/network';

interface RowData {
  network: Network;
  recipients: string[];
  cc: string[];
  fromAddress: string | null;
}

type ConfigStatus = 'all' | 'configured' | 'unconfigured';

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function hasRecipientsConfig(row: RowData): boolean {
  return row.recipients.length > 0 || row.cc.length > 0 || Boolean(row.fromAddress);
}

function getConfigBadgeClass(row: RowData): string {
  return hasRecipientsConfig(row)
    ? 'bg-secondary text-foreground border-border'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
}

function getConfigBadgeLabel(row: RowData): string {
  return hasRecipientsConfig(row) ? 'Настроено' : 'Не настроено';
}

export default function InventoryRecipientsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowData[]>([]);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [configStatus, setConfigStatus] = useState<ConfigStatus>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const networks = await networksService.getAll();
      const data = await Promise.all(
        networks.map(async (network) => {
          try {
            const cfg = await inventoryAdjustmentsService.getEmailRecipients(network.id);
            return {
              network,
              recipients: cfg.recipients || [],
              cc: cfg.cc || [],
              fromAddress: cfg.fromAddress || null,
            };
          } catch {
            return { network, recipients: [], cc: [], fromAddress: null };
          }
        })
      );
      setRows(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось загрузить настройки',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = configStatus === 'all'
        || (configStatus === 'configured' && hasRecipientsConfig(row))
        || (configStatus === 'unconfigured' && !hasRecipientsConfig(row));

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        row.network.name,
        row.network.code,
        row.fromAddress ?? '',
        ...row.recipients,
        ...row.cc,
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [configStatus, rows, searchTerm]);

  return (
    <MainLayout fullWidth>
      <div className="w-full px-4 md:px-6 lg:px-8 py-4">
        <div className="mb-6 pt-2">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Рассылка приказов инвентаризации
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Адреса, на которые уходит email с PDF-приказом при отправке документа корректировки остатков.
            Настраивается отдельно по каждой сети.
          </p>
        </div>

        <div className={`${FILTER_PANEL_CLASS} mb-6`}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
              <span className="text-sm text-muted-foreground">
                Найдено: {formatInteger(filteredRows.length)}
              </span>
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label htmlFor="inventory-recipients-search" className="text-xs text-muted-foreground">
                Поиск
              </Label>
              <Input
                id="inventory-recipients-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Сеть, код, email"
                className={FILTER_PANEL_CONTROL_CLASS}
              />
            </div>

            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="inventory-recipients-status" className="text-xs text-muted-foreground">
                Статус
              </Label>
              <Select value={configStatus} onValueChange={(value) => setConfigStatus(value as ConfigStatus)}>
                <SelectTrigger id="inventory-recipients-status" className={FILTER_PANEL_CONTROL_CLASS}>
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="configured">Настроено</SelectItem>
                  <SelectItem value="unconfigured">Не настроено</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:flex-none sm:min-w-[180px] sm:self-end`}>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchTerm('');
                  setConfigStatus('all');
                }}
              >
                Сбросить
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Загрузка настроек..." />
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card">
            <EmptyState
              className="py-16"
              title="Сети не найдены"
              description={rows.length === 0
                ? 'Список сетей пуст.'
                : 'Нет записей, соответствующих выбранным фильтрам.'}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Сеть</TableHead>
                    <TableHead className="w-[140px]">Статус</TableHead>
                    <TableHead>Основные получатели (TO)</TableHead>
                    <TableHead>Копия (CC)</TableHead>
                    <TableHead className="w-[220px]">Адрес отправителя</TableHead>
                    <TableHead className="w-[120px] text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const { network, recipients, cc, fromAddress } = row;

                    return (
                      <TableRow key={network.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{network.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{network.code || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConfigBadgeClass(row)}>
                            {getConfigBadgeLabel(row)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {recipients.length === 0 ? (
                            <span className="text-muted-foreground">Не указаны</span>
                          ) : (
                            <div className="space-y-1">
                              {recipients.map((recipient) => (
                                <div key={recipient} className="text-xs font-mono">
                                  {recipient}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-foreground/80">
                          {cc.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="space-y-1">
                              {cc.map((recipient) => (
                                <div key={recipient} className="text-xs font-mono">
                                  {recipient}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground/80">
                          {fromAddress || 'По умолчанию'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditTarget({ id: network.id, name: network.name })}
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            {recipients.length === 0 ? 'Настроить' : 'Изменить'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сеть</TableHead>
                    <TableHead className="w-[88px] text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const { network, recipients, cc, fromAddress } = row;

                    return (
                      <TableRow key={network.id} className="align-top">
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium text-foreground">{network.name}</div>
                              <div className="text-xs font-mono text-muted-foreground">{network.code || '—'}</div>
                            </div>

                            <Badge className={getConfigBadgeClass(row)}>
                              {getConfigBadgeLabel(row)}
                            </Badge>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div>
                                TO: {recipients.length > 0 ? formatInteger(recipients.length) : '0'}
                              </div>
                              <div>
                                CC: {cc.length > 0 ? formatInteger(cc.length) : '0'}
                              </div>
                              <div className="font-mono text-foreground/80 break-all">
                                {fromAddress || 'По умолчанию'}
                              </div>
                            </div>

                            {recipients.length > 0 && (
                              <div className="space-y-1">
                                {recipients.map((recipient) => (
                                  <div key={recipient} className="text-xs font-mono text-foreground/80 break-all">
                                    {recipient}
                                  </div>
                                ))}
                              </div>
                            )}

                            {cc.length > 0 && (
                              <div className="space-y-1 border-t border-border pt-2">
                                <div className="text-xs text-muted-foreground">Копия (CC)</div>
                                {cc.map((recipient) => (
                                  <div key={recipient} className="text-xs font-mono text-foreground/80 break-all">
                                    {recipient}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditTarget({ id: network.id, name: network.name })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {editTarget && (
        <EmailRecipientsDialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) {
              setEditTarget(null);
              void load();
            }
          }}
          networkId={editTarget.id}
          networkName={editTarget.name}
        />
      )}
    </MainLayout>
  );
}
