/**
 * Глобальный диалог «Связь со станциями», управляемый из SupportContext.
 * Рендерится один раз в App (как CreateTicketDialog), открывается из шапки и нижнего меню.
 */
import { useSupportContext } from '@/contexts/SupportContext';
import StationsConnectionDialog from '@/components/operations/StationsConnectionDialog';

export default function GlobalConnectionDialog() {
  const { isConnectionDialogOpen, closeConnectionDialog } = useSupportContext();
  return (
    <StationsConnectionDialog
      open={isConnectionDialogOpen}
      onOpenChange={(open) => {
        if (!open) closeConnectionDialog();
      }}
    />
  );
}
