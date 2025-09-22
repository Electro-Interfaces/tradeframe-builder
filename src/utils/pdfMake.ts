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

type PdfFontsModule = {
  pdfMake: {
    vfs: Record<string, string>;
  };
};

let cachedPdfMake: PdfMakeInstance | null = null;

export async function loadPdfMake(): Promise<PdfMakeInstance> {
  if (cachedPdfMake) {
    return cachedPdfMake;
  }

  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);

  const pdfMake =
    (pdfMakeModule as { default?: PdfMakeInstance }).default ??
    (pdfMakeModule as PdfMakeInstance);

  const pdfFonts =
    (pdfFontsModule as { default?: PdfFontsModule }).default ??
    (pdfFontsModule as PdfFontsModule);

  pdfMake.vfs = pdfFonts.pdfMake.vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  cachedPdfMake = pdfMake;
  return pdfMake;
}
