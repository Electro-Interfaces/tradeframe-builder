// Отдельный модуль для загрузки pdfmake - импортируется только при необходимости

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

export async function loadRealPdfMake(): Promise<PdfMakeInstance> {
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

  return pdfMakeInstance;
}