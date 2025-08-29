import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-9xl md:text-[12rem] font-black text-foreground opacity-20">404</h1>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Страница не найдена</h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Запрашиваемая страница не существует или была перемещена
              </p>
            </div>
          </div>
          
          <a 
            href="/" 
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-medium transition-all hover:bg-primary/90 hover:shadow-large"
          >
            Вернуться на главную
          </a>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;
