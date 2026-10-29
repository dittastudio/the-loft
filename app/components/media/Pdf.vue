<script lang="ts" setup>
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  src: string
}

const { src } = defineProps<Props>()

const root = useTemplateRef('root')
const images = useTemplateRef<HTMLImageElement[]>('images')

const pages = ref<{ width: number; height: number }[]>([])
const hasError = ref(false)

let loadingTask: PDFDocumentLoadingTask | null = null
let observer: IntersectionObserver | null = null
// Pages render one at a time, in the order they come into view, so they don't compete for the main thread.
let queue: Promise<void> = Promise.resolve()
let renderedCount = 0
const objectUrls: string[] = []

const scrollParent = (el: HTMLElement): HTMLElement | null => {
  let parent = el.parentElement

  while (parent) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) {
      return parent
    }

    parent = parent.parentElement
  }

  return null
}

// JPEG: encodes fast in every browser, and pages are opaque so nothing is lost.
const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode PDF page'))), 'image/jpeg', 0.9)
  })

// Draws the page on a throwaway canvas and hands it to the <img> as an encoded image, so the DOM only holds images
// the browser can discard when off screen, rather than live canvases pinned in memory.
const renderPage = async (pdf: PDFDocumentProxy, img: HTMLImageElement, pageNumber: number) => {
  const page = await pdf.getPage(pageNumber)
  // Render at the image's laid-out width so pages stay sharp without being oversized; capped at 2x to save memory.
  const scale = (img.clientWidth * Math.min(window.devicePixelRatio, 2)) / page.getViewport({ scale: 1 }).width
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)

  try {
    await page.render({ canvas, viewport }).promise

    const url = URL.createObjectURL(await toBlob(canvas))

    objectUrls.push(url)
    img.src = url
  } finally {
    canvas.width = 0
    canvas.height = 0
    page.cleanup()
  }

  // Decode off the queue: the next page can start drawing while this one decodes.
  img
    .decode()
    .catch(() => {})
    .finally(() => {
      // Only start the fade once there are pixels to show.
      img.dataset.rendered = ''
    })
}

const fail = (error: unknown) => {
  console.error(error)
  hasError.value = true
}

onMounted(async () => {
  try {
    const [{ getDocument }, bytes] = await Promise.all([loadPdfjs(), loadPdfBytes(src)])

    // pdf.js transfers the buffer to its worker, which detaches it; copy so the memoised bytes stay usable.
    loadingTask = getDocument({ data: new Uint8Array(bytes.slice(0)) })

    const pdf = await loadingTask.promise

    // Read every page's size up front so placeholders reserve the full scroll height before anything renders.
    const viewports = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, index) =>
        pdf.getPage(index + 1).then((page) => page.getViewport({ scale: 1 })),
      ),
    )

    pages.value = viewports.map(({ width, height }) => ({ width: Math.round(width), height: Math.round(height) }))

    await nextTick()

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }

          const img = entry.target as HTMLImageElement

          observer?.unobserve(img)

          queue = queue
            .then(() => renderPage(pdf, img, Number(img.dataset.page)))
            .then(() => {
              // Every page is an image now, so pdf.js (its worker and the parsed document) is no longer needed.
              if (++renderedCount === pdf.numPages) {
                observer?.disconnect()
                loadingTask?.destroy()
                loadingTask = null
              }
            })
            .catch(fail)
        }
      },
      {
        root: root.value ? scrollParent(root.value) : null,
        rootMargin: '100% 0px',
      },
    )

    images.value?.forEach((img) => observer?.observe(img))
  } catch (error) {
    fail(error)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  loadingTask?.destroy()
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
})
</script>

<template>
  <div ref="root">
    <p
      v-if="hasError"
      class="font-sans text-24 leading-tight lowercase text-center"
    >
      Unable to display this PDF.
      <a
        :href="src"
        target="_blank"
        class="underline"
        >Open it in a new tab</a
      >
    </p>

    <p
      v-else-if="!pages.length"
      class="font-sans text-24 leading-tight lowercase text-center"
      role="status"
    >
      Loading…
    </p>

    <div
      v-else
      class="flex flex-col gap-(--app-gutter-outer)"
    >
      <img
        v-for="(page, index) in pages"
        ref="images"
        :key="index"
        :data-page="index + 1"
        :width="page.width"
        :height="page.height"
        :style="{ aspectRatio: `${page.width} / ${page.height}` }"
        :alt="`Page ${index + 1} of ${pages.length}`"
        decoding="async"
        class="block w-full h-auto opacity-0 blur-sm transition-[opacity,filter] duration-1000 ease-outQuint data-rendered:opacity-100 data-rendered:blur-none motion-reduce:blur-none motion-reduce:duration-300 outline outline-current/20 rounded-[2px]"
      />
    </div>
  </div>
</template>
