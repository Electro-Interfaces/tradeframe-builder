import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';

/**
 * Обёртка контента страницы.
 * - обычный режим: оборачивает в MainLayout (как отдельная страница);
 * - embedded: возвращает голый контент (для вложения в табы «Взаимодействие»).
 */
export default function PageShell({ embedded, children }: { embedded?: boolean; children: ReactNode }) {
  if (embedded) return <>{children}</>;
  return <MainLayout fullWidth>{children}</MainLayout>;
}
