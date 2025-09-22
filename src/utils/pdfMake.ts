type PdfMakeInstance = {
  vfs: Record<string, string>;
  fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>;
  createPdf: (
    documentDefinition: unknown,
    tableLayouts?: unknown
  ) => {
    download: (defaultFileName?: string) => void;
    open: () => void;
    getBuffer: (callback: (buffer: ArrayBuffer) => void) => void;
  };
};

let cachedPdfMake: PdfMakeInstance | null = null;

// Mock implementation for environments without pdfmake
const createMockPdfMake = (): PdfMakeInstance => ({
  vfs: {},
  fonts: {},
  createPdf: () => ({
    download: () => {
      console.warn('PDF download not available - pdfmake not installed');
      alert('PDF экспорт недоступен в данном окружении');
    },
    open: () => {
      console.warn('PDF open not available - pdfmake not installed');
      alert('PDF экспорт недоступен в данном окружении');
    },
    getBuffer: () => {
      console.warn('PDF getBuffer not available - pdfmake not installed');
    },
  }),
});

export async function loadPdfMake(): Promise<PdfMakeInstance> {
  if (cachedPdfMake) {
    return cachedPdfMake;
  }

  // Check if PDF export is disabled
  if (import.meta.env.VITE_DISABLE_PDF_EXPORT === 'true') {
    console.info('PDF export disabled via environment variable');
    cachedPdfMake = createMockPdfMake();
    return cachedPdfMake;
  }

  try {
    // Динамически импортируем отдельный модуль с pdfmake
    const loaderModule = await import('./pdfMakeLoader');
    const pdfMakeInstance = await loaderModule.loadRealPdfMake();

    cachedPdfMake = pdfMakeInstance;
    return pdfMakeInstance;
  } catch (error) {
    console.warn('pdfmake not available in this environment:', error);
    cachedPdfMake = createMockPdfMake();
    return cachedPdfMake;
  }
}
