/**
 * Компонент отображения времени последней передачи данных с терминала
 * Переиспользуется на страницах раздела "ТОРГОВАЯ ТОЧКА"
 */

import { useEquipment } from '@/hooks/useEquipment';
import { useSelection } from '@/contexts/SelectionContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface LastDataTransferProps {
  className?: string;
}

export function LastDataTransfer({ className = '' }: LastDataTransferProps) {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const isMobile = useIsMobile();

  // Загружаем информацию о терминале
  const { terminalInfo, loading } = useEquipment({
    networkId: selectedNetwork?.external_id,
    tradingPointId: selectedTradingPoint,
    autoLoad: true,
    showToasts: false
  });

  // Не показываем ничего если нет данных или идет загрузка
  if (loading || !terminalInfo?.pos?.lastUpdate) {
    return null;
  }

  const lastUpdate = new Date(terminalInfo.pos.lastUpdate);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (isMobile) {
    // Мобильная версия - компактный формат
    return (
      <span className={`text-slate-400 text-xs ${className}`}>
        {lastUpdate.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}
        {diffMinutes < 11 ? (
          <span className="text-green-400 ml-1.5">✓</span>
        ) : (
          <span className="text-red-400 ml-1.5">⚠ {diffMinutes}м</span>
        )}
      </span>
    );
  }

  // Десктопная версия - полный формат
  return (
    <p className={`text-slate-400 text-sm mt-1 ${className}`}>
      Последняя передача данных: {lastUpdate.toLocaleString('ru-RU')}
      {diffMinutes < 11 ? (
        <span className="text-green-400 ml-2">(✓ актуально)</span>
      ) : (
        <span className="text-red-400 ml-2">(⚠️ {diffMinutes} мин назад)</span>
      )}
    </p>
  );
}

export default LastDataTransfer;
