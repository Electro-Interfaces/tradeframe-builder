/**
 * Admin: настройка email-рассылки приказов корректировки остатков по сетям.
 * Видна только пользователям с административным доступом (см. ProtectedRoute requireAdmin).
 */

import { useCallback, useEffect, useState } from 'react';
import { Mail, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingState } from '@/components/common/PageStates';
import { useToast } from '@/hooks/use-toast';
import { networksService } from '@/services/networksService';
import { inventoryAdjustmentsService } from '@/services/inventoryAdjustmentsService';
import { EmailRecipientsDialog } from '@/pages/InventoryAdjustments/components/EmailRecipientsDialog';
import type { Network } from '@/types/network';

interface RowData {
  network: Network;
  recipients: string[];
  cc: string[];
  fromAddress: string | null;
}

export default function InventoryRecipientsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowData[]>([]);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);

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

        {loading ? (
          <LoadingState message="Загрузка настроек..." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Сеть</th>
                  <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Основные получатели (TO)</th>
                  <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Копия (CC)</th>
                  <th className="px-4 py-3 text-left text-foreground font-medium text-xs uppercase">Адрес отправителя</th>
                  <th className="px-4 py-3 text-right text-foreground font-medium text-xs uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {rows.map(({ network, recipients, cc, fromAddress }) => (
                  <tr key={network.id} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{network.name}</div>
                      <div className="text-xs text-muted-foreground">{network.code}</div>
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {recipients.length === 0 ? (
                        <span className="text-muted-foreground italic">не настроено</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {recipients.map((r) => (
                            <span key={r} className="text-xs">{r}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {cc.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {cc.map((r) => (
                            <span key={r} className="text-xs">{r}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/80 text-xs">
                      {fromAddress || <span className="text-muted-foreground">по умолчанию</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => setEditTarget({ id: network.id, name: network.name })}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        {recipients.length === 0 ? 'Настроить' : 'Изменить'}
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Сети не найдены
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
