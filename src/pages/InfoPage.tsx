/**
 * Полностраничный вход в раздел «Инфо» (deep-link /info и /info/:articleId).
 * Нужен для постоянных ссылок на статьи (в чат/заявки/между статьями). В модалке тот же
 * InfoCenter рендерится из InteractionHost.
 */
import { useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import InfoCenter from '@/components/info/InfoCenter';

export default function InfoPage() {
  const { articleId } = useParams<{ articleId?: string }>();
  return (
    <MainLayout fullWidth>
      <div className="h-[calc(100vh-var(--header-height,56px))] min-h-0">
        <InfoCenter initialArticleId={articleId} />
      </div>
    </MainLayout>
  );
}
