/**
 * Страница для комплексного тестирования мобильных браузеров
 */

import { MobileBrowserTester } from '@/components/MobileBrowserTester';
import { MainLayout } from '@/components/layout/MainLayout';

export default function MobileBrowserTest() {
  return (
    <MainLayout fullWidth={true}>
      <div className="mobile-optimized">
        <MobileBrowserTester />
      </div>
    </MainLayout>
  );
}