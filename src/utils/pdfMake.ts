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

export async function loadPdfMake(): Promise<PdfMakeInstance> {
  if (cachedPdfMake) {
    return cachedPdfMake;
  }

  try {
    // Try to dynamically import pdfmake - will fail gracefully if not available
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);

    const pdfMakeInstance = (pdfMakeModule as any).default || pdfMakeModule;
    const pdfFontsInstance = (pdfFontsModule as any).default || pdfFontsModule;

    // Configure pdfMake with fonts
    pdfMakeInstance.vfs = pdfFontsInstance.pdfMake.vfs;
    pdfMakeInstance.fonts = {
      Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
      },
    };

    cachedPdfMake = pdfMakeInstance;
    return pdfMakeInstance;
  } catch (error) {
    console.warn('pdfmake not available in this environment:', error);

    // Return a mock implementation when pdfmake is not available
    const mockPdfMake: PdfMakeInstance = {
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
    };

    cachedPdfMake = mockPdfMake;
    return mockPdfMake;
  }
}
