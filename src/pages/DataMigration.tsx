/**
 * Страница миграции данных
 */

import { MainLayout } from '@/components/layout/MainLayout';
import DataMigrationPanel from '@/components/admin/DataMigrationPanel';

export default function DataMigration() {
  return (
    <MainLayout>
      <DataMigrationPanel />
    </MainLayout>
  );
}