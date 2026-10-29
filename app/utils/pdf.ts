type Pdfjs = typeof import('pdfjs-dist')

let pdfjs: Promise<Pdfjs> | null = null
const pdfBytes = new Map<string, Promise<ArrayBuffer>>()

// Memoised so a hover/focus preload and the viewer share one download of pdf.js and its worker.
const loadPdfjs = (): Promise<Pdfjs> => {
  pdfjs ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
    .then(([lib, { default: workerSrc }]) => {
      lib.GlobalWorkerOptions.workerSrc = workerSrc

      return lib
    })
    .catch((error) => {
      // Allow a retry on the next call rather than caching the failure.
      pdfjs = null
      throw error
    })

  return pdfjs
}

// Memoised per URL so the bytes fetched on hover/focus are the ones handed to pdf.js on open.
const loadPdfBytes = (src: string): Promise<ArrayBuffer> => {
  let bytes = pdfBytes.get(src)

  if (!bytes) {
    bytes = fetch(storyblokCorsUrl(src))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`)
        }

        return response.arrayBuffer()
      })
      .catch((error) => {
        pdfBytes.delete(src)
        throw error
      })

    pdfBytes.set(src, bytes)
  }

  return bytes
}

const preloadPdf = (src: string) => {
  loadPdfjs().catch(() => {})
  loadPdfBytes(src).catch(() => {})
}

export { loadPdfBytes, loadPdfjs, preloadPdf }
