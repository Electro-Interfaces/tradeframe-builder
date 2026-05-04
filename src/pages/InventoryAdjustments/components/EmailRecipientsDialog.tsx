/**
 * Диалог настройки списка email-получателей приказа корректировки для текущей сети.
 * Отдельный документ-конфиг хранится в `inventory_adjustment_email_recipients` по `network_id`.
 */

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { inventoryAdjustmentsService } from '@/services/inventoryAdjustmentsService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networkId: string;
  networkName?: string;
}

function parseEmailList(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function EmailRecipientsDialog({ open, onOpenChange, networkId, networkName }: Props) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');
  const [ccText, setCcText] = useState('');
  const [fromAddress, setFromAddress] = useState('');

  useEffect(() => {
    if (!open || !networkId) return;
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const cfg = await inventoryAdjustmentsService.getEmailRecipients(networkId);
        if (aborted) return;
        setRecipientsText((cfg.recipients || []).join('\n'));
        setCcText((cfg.cc || []).join('\n'));
        setFromAddress(cfg.fromAddress || '');
      } catch (err) {
        if (aborted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        toast({
          title: 'Не удалось загрузить настройки',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [open, networkId, toast]);

  const handleSave = async () => {
    const recipients = parseEmailList(recipientsText);
    const cc = parseEmailList(ccText);

    if (recipients.length === 0) {
      toast({
        title: 'Заполните основной список',
        description: 'Нужен хотя бы один основной получатель',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await inventoryAdjustmentsService.saveEmailRecipients(networkId, {
        recipients,
        cc,
        fromAddress: fromAddress.trim() || null,
      });
      toast({ title: 'Настройки рассылки сохранены' });
      onOpenChange(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      toast({
        title: 'Не удалось сохранить',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Рассылка приказов корректировки
          </DialogTitle>
          <DialogDescription>
            Список адресатов, на которые будет уходить email с PDF-приказом для сети{' '}
            <strong className="text-foreground">{networkName || networkId}</strong>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="recipients">Основные получатели (TO) *</Label>
              <Textarea
                id="recipients"
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                disabled={saving}
                rows={4}
                placeholder={'ops@example.com\nadmin@example.com'}
              />
              <div className="text-xs text-muted-foreground mt-1">
                По одному адресу на строке (можно через запятую или точку с запятой).
              </div>
            </div>

            <div>
              <Label htmlFor="cc">Копия (CC)</Label>
              <Textarea
                id="cc"
                value={ccText}
                onChange={(e) => setCcText(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="manager@example.com"
              />
            </div>

            <div>
              <Label htmlFor="fromAddress">Адрес отправителя</Label>
              <Input
                id="fromAddress"
                type="email"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                disabled={saving}
                placeholder="(по умолчанию из SMTP_FROM сервера)"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Если оставить пустым, будет использован адрес из конфигурации SMTP backend-а.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
