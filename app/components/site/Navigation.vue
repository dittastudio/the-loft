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
    class="site-navigation fixed z-10 pointer-events-none"
  >
    <div class="site-navigation__inner">
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
@reference "~/assets/css/app.css";

/*
  Lined up with the hero's box: its right edge below md, its top on desktop. Without anchor positioning that comes
  from BlockHero's grid maths, which is in cqw, so the nav is a page-wide size container.
*/
.site-navigation {
  inset: 0 0 auto;
  container-type: inline-size;
}

.site-navigation__inner {
  padding: var(--hero-box-top, var(--app-gutter-outer)) var(--app-gutter-outer) 0;

  @variant max-md {
    padding-top: min(var(--hero-box-right, var(--app-gutter-outer)), 80px);
    padding-right: var(--hero-box-right, var(--app-gutter-outer));
  }
}

/* Named rather than set as its position-anchor, so the nav stays fixed as the page scrolls. */
@supports (anchor-name: --hero-box) {
  .site-navigation {
    inset: anchor(--hero-box top, var(--app-gutter-outer)) var(--app-gutter-outer) auto auto;
    container-type: normal; /* or it would be its own containing block */

    @variant max-md {
      top: min(var(--hero-box-right, var(--app-gutter-outer)), 80px);
      right: anchor(--hero-box right, var(--app-gutter-outer));
    }
  }

  .site-navigation__inner {
    padding: 0;
  }
}

/* Fades in with the hero's intro, or after 2.5s if JS never takes over. */
@media (prefers-reduced-motion: no-preference) {
  :root:has(.block-hero) .site-navigation {
    transition: opacity var(--intro-length) var(--intro-ease);
  }

  :root:has(.block-hero[data-intro='waiting']) .site-navigation {
    opacity: 0;
    animation: site-navigation-reveal 0s 2.5s forwards;
  }

  @keyframes site-navigation-reveal {
    to {
      opacity: 1;
    }
  }
}
</style>
