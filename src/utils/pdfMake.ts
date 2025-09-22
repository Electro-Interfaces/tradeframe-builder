import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

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
    // Use static imports instead of dynamic imports
    const pdfMakeInstance = (pdfMake as any).default || pdfMake;
    const pdfFontsInstance = (pdfFonts as any).default || pdfFonts;

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
    console.error('Failed to load pdfmake:', error);
    throw new Error('PDF generation is not available in this environment');
  }
}
