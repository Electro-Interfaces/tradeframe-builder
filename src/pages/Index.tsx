import { MainLayout } from "@/components/layout/MainLayout";

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Главная панель</h1>
          <p className="text-muted-foreground mt-2">
            Здесь будет содержимое главной панели.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-card-foreground mb-2">Статистика</h3>
            <p className="text-muted-foreground text-sm">
              Общая информация по системе
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-card-foreground mb-2">Уведомления</h3>
            <p className="text-muted-foreground text-sm">
              Последние события в системе
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-card-foreground mb-2">Быстрые действия</h3>
            <p className="text-muted-foreground text-sm">
              Часто используемые функции
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-semibold text-card-foreground mb-2">Мониторинг</h3>
            <p className="text-muted-foreground text-sm">
              Состояние оборудования
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
