/**
 * Контекстная кнопка «?» — открывает раздел «Инфо» на статье, привязанной к роуту.
 * Роут берётся из пропа `route` (если задан) или из текущего location.pathname (детерминированно,
 * без DOM-скрейпа). Если для экрана статьи нет — кнопка не отображается (без ложной «помощи»).
 *
 * Пропы `helpKey`/`variant`/`size` сохранены для обратной совместимости с уже существующими
 * местами вызова (Roles/Users/AuditLog/… монтируют HelpButton у заголовков страниц).
 */
import { HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSupportContext } from '@/contexts/SupportContext';
import { findArticleByRoute } from '@/content/help/manifest';

interface HelpButtonProps {
  route?: string;
  helpKey?: string;
  variant?: 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_SIZE: Record<NonNullable<HelpButtonProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function HelpButton({ route, variant = 'icon', size = 'sm', className = '' }: HelpButtonProps) {
  const { pathname } = useLocation();
  const { openInfo } = useSupportContext();
  const article = findArticleByRoute(route ?? pathname);

  if (!article) return null;

  return (
    <button
      type="button"
      onClick={() => openInfo(article.id)}
      aria-label={`Справка по экрану: ${article.title}`}
      title={`Справка: ${article.title}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${
        variant === 'text' ? 'px-2 py-1 text-sm' : 'h-8 w-8'
      } ${className}`}
    >
      <HelpCircle className={ICON_SIZE[size]} />
      {variant === 'text' && <span>Справка</span>}
    </button>
  );
}

export default HelpButton;
