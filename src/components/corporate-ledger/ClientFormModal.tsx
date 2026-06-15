/**
 * Модалка создания/редактирования корпоративного клиента.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { corporateClientsService } from '@/services/corporateClientsService';
import type { CorporateClient } from '@/types/corporateLedger';

interface ClientFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  networkId: string;
  client?: CorporateClient | null;
  onSaved: () => void;
}

export function ClientFormModal({ isOpen, onOpenChange, networkId, client, onSaved }: ClientFormModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(client?.name || '');
      setInn(client?.inn || '');
      setContactPerson(client?.contactPerson || '');
      setPhone(client?.phone || '');
      setEmail(client?.email || '');
      setDescription(client?.description || '');
    }
  }, [isOpen, client]);

  const isValid = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const payload = {
        networkId,
        name: name.trim(),
        inn: inn.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        description: description.trim() || undefined,
      };
      if (client) {
        await corporateClientsService.update(client.id, payload);
        toast({ title: 'Клиент обновлён' });
      } else {
        await corporateClientsService.create(payload);
        toast({ title: 'Клиент добавлен' });
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Редактирование клиента' : 'Новый корпоративный клиент'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cc-name">Наименование *</Label>
            <Input id="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ООО «Ромашка»" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cc-inn">ИНН</Label>
              <Input id="cc-inn" value={inn} onChange={(e) => setInn(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cc-phone">Телефон</Label>
              <Input id="cc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="cc-contact">Контактное лицо</Label>
            <Input id="cc-contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cc-email">Email</Label>
            <Input id="cc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cc-desc">Комментарий</Label>
            <Input id="cc-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {client ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
