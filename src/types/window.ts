// Глобальные функции для координации загрузки
declare global {
  interface Window {
    reactReady?: boolean;
    updateLoadingStatus?: (status: string) => void;
    removeInitialLoading?: () => void;
  }
}

export {};