export type BrowserPdfExtractionResult = {
  text: string
  confidence: number
}

type PdfJsModule = {
  version: string
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfDocumentProxy> }
  GlobalWorkerOptions: {
    workerSrc: string
  }
}

type PdfDocumentProxy = {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPageProxy>
}

type PdfPageProxy = {
  getTextContent: () => Promise<{
    items: Array<{ str?: string }>
  }>
  getViewport: (options: { scale: number }) => { width: number; height: number }
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>
  }
}

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { text: string; confidence: number } }>
  terminate: () => Promise<void>
}

async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as PdfJsModule
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`
  }
  return pdfjs
}

async function extractEmbeddedText(pdfDocument: PdfDocumentProxy): Promise<string> {
  const pageTexts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => (typeof item.str === 'string' ? item.str.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim()

    if (pageText) {
      pageTexts.push(pageText)
    }
  }

  return pageTexts.join('\n\n').trim()
}

async function renderPageToCanvas(page: PdfPageProxy): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas rendering is unavailable in this browser.')
  }

  await page.render({
    canvasContext: context,
    viewport,
  }).promise

  return canvas
}

async function runBrowserOcr(pdfDocument: PdfDocumentProxy): Promise<BrowserPdfExtractionResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('mar+eng') as unknown as TesseractWorker
  const pageTexts: string[] = []
  let confidenceTotal = 0
  let pageCount = 0

  try {
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber)
      const canvas = await renderPageToCanvas(page)
      const result = await worker.recognize(canvas)
      const text = result.data.text.trim()
      if (text) {
        pageTexts.push(text)
      }
      confidenceTotal += result.data.confidence
      pageCount += 1
    }
  } finally {
    await worker.terminate()
  }

  return {
    text: pageTexts.join('\n\n').trim(),
    confidence: pageCount > 0 ? Math.max(0.35, Math.min(0.95, confidenceTotal / pageCount / 100)) : 0.35,
  }
}

export async function extractPdfTextInBrowser(file: File): Promise<BrowserPdfExtractionResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF extraction is only available in the browser.')
  }

  const pdfjs = await loadPdfJs()
  const fileBuffer = await file.arrayBuffer()
  const pdfDocument = await pdfjs.getDocument({ data: fileBuffer }).promise
  const embeddedText = await extractEmbeddedText(pdfDocument)

  if (embeddedText.length >= 40) {
    return {
      text: embeddedText,
      confidence: 0.97,
    }
  }

  return runBrowserOcr(pdfDocument)
}
