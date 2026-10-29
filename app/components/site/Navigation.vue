<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

interface Props {
  items: Block<'settings'>['navigation']
}

const { items } = defineProps<Props>()

type Item = NonNullable<Props['items']>[number]

const isPdfOpen = ref(false)
// Set on first open and kept, so the viewer stays mounted and reopening is instant.
const pdf = ref<{ src: string; download: string; title: string } | null>(null)

type PdfItem = Extract<Item, { component: 'element_link_pdf' }>

const linkClass =
  'inline-block p-(--app-gutter-outer) -m-(--app-gutter-outer) md:py-0 md:-my-0 transition-opacity duration-300 ease-out hover:opacity-50'

const edgeClass = (index: number) => ({
  'md:pt-(--app-gutter-outer) md:-mt-(--app-gutter-outer)': index === 0,
  'md:pb-(--app-gutter-outer) md:-mb-(--app-gutter-outer)': index === (items?.length ?? 0) - 1,
})

const onClick = (event: MouseEvent, item: PdfItem) => {
  const src = storyblokPdf(item.preview)

  // Let modified clicks (new tab/window, middle-click) fall through to the native link.
  if (!src || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }

  event.preventDefault()

  if (pdf.value?.src !== src) {
    pdf.value = { src, download: storyblokPdf(item.download) ?? src, title: item.title ?? '' }
  }

  isPdfOpen.value = true
}

// Warm up pdf.js and the PDF on intent so both are usually ready by the time the link is clicked.
const onIntent = (item: PdfItem) => {
  const src = storyblokPdf(item.preview)

  if (src) {
    preloadPdf(src)
  }
}
</script>

<template>
  <nav
    v-if="items?.length"
    aria-label="Main"
    class="fixed inset-x-0 top-0 z-10 pointer-events-none"
  >
    <div class="wrapper pt-(--app-gutter-outer)">
      <ul
        class="flex flex-row-reverse justify-between md:flex-col md:items-end pointer-events-auto font-sans text-right text-20 leading-[1.1] lowercase"
      >
        <li
          v-for="(item, index) in items"
          :key="item._uid"
          v-editable="item"
        >
          <a
            v-if="item.component === 'element_link_pdf'"
            :href="storyblokPdf(item.download) ?? storyblokPdf(item.preview) ?? undefined"
            :class="[linkClass, edgeClass(index)]"
            @click="onClick($event, item)"
            @pointerenter="onIntent(item)"
            @focus="onIntent(item)"
          >
            {{ item.title }}
          </a>

          <StoryblokLink
            v-else
            :item="item.link"
            :class="[linkClass, edgeClass(index)]"
          >
            {{ item.title }}
          </StoryblokLink>
        </li>
      </ul>
    </div>
  </nav>

  <UiModal
    v-model:open="isPdfOpen"
    :label="pdf?.title ?? ''"
  >
    <template #actions>
      <a
        v-if="pdf"
        :href="pdf.download"
        target="_blank"
        download
        class="inline-block p-(--app-gutter-outer) -m-(--app-gutter-outer) transition-opacity duration-300 ease-out hover:opacity-50"
      >
        Download
      </a>
    </template>

    <div class="wrapper pt-(--app-gutter-outer) pb-(--app-gutter-outer)">
      <MediaPdf
        v-if="pdf"
        :key="pdf.src"
        :src="pdf.src"
        class="mx-auto max-w-3xl"
      />
    </div>
  </UiModal>
</template>
