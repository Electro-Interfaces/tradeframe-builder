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

  try {
    // Try multiple import paths for maximum compatibility
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      tryImportPdfMake(),
      tryImportPdfFonts(),
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
  } catch (error) {
    console.error('Failed to load pdfmake:', error);
    throw new Error('PDF generation is not available in this environment');
  }
}

async function tryImportPdfMake() {
  const paths = [
    'pdfmake/build/pdfmake',
    'pdfmake/build/pdfmake.js',
    'pdfmake',
  ];

  for (const path of paths) {
    try {
      return await import(path);
    } catch (error) {
      console.warn(`Failed to import pdfmake from ${path}:`, error);
    }
  }
  throw new Error('Could not import pdfmake');
}

async function tryImportPdfFonts() {
  const paths = [
    'pdfmake/build/vfs_fonts',
    'pdfmake/build/vfs_fonts.js',
  ];

  for (const path of paths) {
    try {
      return await import(path);
    } catch (error) {
      console.warn(`Failed to import pdfmake fonts from ${path}:`, error);
    }
  }
  throw new Error('Could not import pdfmake fonts');
}
