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

// Padded out to the gutter at the sides, for a wider tap target.
const linkClass =
  'inline-block px-(--app-gutter-outer) -mx-(--app-gutter-outer) transition-opacity duration-300 ease-out hover:opacity-50'

// The first and last links reach the gutter above and below too.
const edgeClass = (index: number) => ({
  'pt-(--app-gutter-outer) -mt-(--app-gutter-outer)': index === 0,
  'pb-(--app-gutter-outer) -mb-(--app-gutter-outer)': index === (items?.length ?? 0) - 1,
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
    class="site-navigation @container fixed inset-x-0 top-0 z-10 pointer-events-none"
  >
    <!--
      Lined up with the hero's box, when there is one (its 100cqw is the page's width):
      with its right edge below md (and as far from the top as from the right, up to 80px), and level with its top on desktop.
    -->
    <div
      class="wrapper pt-(--app-gutter-outer) max-md:pt-[min(var(--hero-box-right,var(--app-gutter-outer)),80px)] max-md:pr-[var(--hero-box-right,var(--app-gutter-outer))] md:pt-[var(--hero-box-top,var(--app-gutter-outer))]"
    >
      <ul class="flex flex-col items-end pointer-events-auto font-sans text-right text-20 leading-[1.1] lowercase">
        <li
          v-for="(item, index) in items"
          :key="item._uid"
          v-editable="item"
        >
          <!-- Clickable in the visual editor, as opening the modal is the only way to check a newly uploaded PDF. -->
          <a
            v-if="item.component === 'element_link_pdf'"
            :href="storyblokPdf(item.download) ?? storyblokPdf(item.preview) ?? undefined"
            :class="[linkClass, edgeClass(index)]"
            data-editor-clickable
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
        class="mx-auto max-w-3xl pointer-events-auto"
      />
    </div>
  </UiModal>
</template>

<style scoped>
/* Fades in with the hero's logos during its intro, hidden until it starts and shown after 4s if JS never takes over. */
@media (prefers-reduced-motion: no-preference) {
  :root:has(.block-hero) .site-navigation {
    transition: opacity var(--intro-length) var(--intro-ease);
  }

  :root:has(.block-hero[data-intro='waiting']) .site-navigation {
    opacity: 0;
    animation: site-navigation-reveal 0s 4s forwards;
  }

  @keyframes site-navigation-reveal {
    to {
      opacity: 1;
    }
  }
}
</style>
