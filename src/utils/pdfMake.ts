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

declare global {
  interface Window {
    pdfMake?: PdfMakeInstance;
  }
}

let cachedPdfMake: PdfMakeInstance | null = null;
let cachedPdfMakePromise: Promise<PdfMakeInstance> | null = null;
const scriptLoaders = new Map<string, Promise<void>>();

// Mock implementation for environments without pdfmake
const createMockPdfMake = (): PdfMakeInstance => ({
  vfs: {},
  fonts: {},
  createPdf: () => ({
    download: () => {
      alert('PDF экспорт недоступен в данном окружении');
    },
    open: () => {
      alert('PDF экспорт недоступен в данном окружении');
    },
    getBuffer: () => {
    },
  }),
});

function getPdfMakeAssetPath(fileName: string): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  return `${basePath}pdfmake/${fileName}`;
}

function loadScript(src: string): Promise<void> {
  const existingLoader = scriptLoaders.get(src);
  if (existingLoader) {
    return existingLoader;
  }

  const loader = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-pdfmake-src="${src}"]`);

    const handleLoad = () => {
      if (existingScript) {
        existingScript.dataset.loaded = 'true';
      }
      resolve();
    };

    const handleError = () => {
      scriptLoaders.delete(src);
      reject(new Error(`Не удалось загрузить ${src}`));
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.pdfmakeSrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  scriptLoaders.set(src, loader);
  return loader;
}

async function loadPdfMakeFromAssets(): Promise<PdfMakeInstance> {
  await loadScript(getPdfMakeAssetPath('pdfmake.min.js'));
  await loadScript(getPdfMakeAssetPath('vfs_fonts.js'));

  if (!window.pdfMake?.createPdf) {
    throw new Error('pdfMake недоступен после загрузки скриптов');
  }

  window.pdfMake.fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf',
    },
  };

  return window.pdfMake;
}

export async function loadPdfMake(): Promise<PdfMakeInstance> {
  if (cachedPdfMake) {
    return cachedPdfMake;
  }

  if (cachedPdfMakePromise) {
    return cachedPdfMakePromise;
  }

  // Check if PDF export is disabled
  if (import.meta.env.VITE_DISABLE_PDF_EXPORT === 'true') {
    cachedPdfMake = createMockPdfMake();
    return cachedPdfMake;
  }

  if (typeof document === 'undefined') {
    cachedPdfMake = createMockPdfMake();
    return cachedPdfMake;
  }

  cachedPdfMakePromise = loadPdfMakeFromAssets()
    .then((pdfMakeInstance) => {
      cachedPdfMake = pdfMakeInstance;
      return pdfMakeInstance;
    })
    .catch(() => {
      cachedPdfMake = createMockPdfMake();
      return cachedPdfMake;
    })
    .finally(() => {
      cachedPdfMakePromise = null;
    });

  try {
    return await cachedPdfMakePromise;
  } catch {
    cachedPdfMake = createMockPdfMake();
    return cachedPdfMake;
  }
}
