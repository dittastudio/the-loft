<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

interface Props {
  items: Block<'settings'>['navigation']
}

const { items } = defineProps<Props>()

type Item = NonNullable<Props['items']>[number]

const isPdfOpen = ref(false)
// Set on first open and kept, so the viewer stays mounted and reopening is instant.
const pdf = ref<{ src: string, title: string } | null>(null)

const onClick = (event: MouseEvent, item: Item) => {
  const src = storyblokPdf(item.link)

  // Let modified clicks (new tab/window, middle-click) fall through to the native link.
  if (!src || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return
  }

  event.preventDefault()

  if (pdf.value?.src !== src) {
    pdf.value = { src, title: item.title ?? '' }
  }

  isPdfOpen.value = true
}

// Warm up pdf.js and the PDF on intent so both are usually ready by the time the link is clicked.
const onIntent = (item: Item) => {
  const src = storyblokPdf(item.link)

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
      <ul class="flex flex-row-reverse justify-between md:flex-col md:items-end pointer-events-auto font-sans text-right text-24 leading-tight lowercase">
        <li
          v-for="item in items"
          :key="item._uid"
          v-editable="item"
        >
          <!-- 44px tap target on touch-sized layouts; tight stack from md as per design. -->
          <StoryblokLink
            :item="item.link"
            class="inline-flex items-center only-hover:hover:underline"
            @click="onClick($event, item)"
            @pointerenter="onIntent(item)"
            @focus="onIntent(item)"
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
        :href="pdf.src"
        target="_blank"
        download
        class="inline-flex items-center only-hover:hover:underline"
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
