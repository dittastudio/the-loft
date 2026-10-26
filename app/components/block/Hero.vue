<script lang="ts" setup>
import type { Block } from '#storyblok-schema'
import Ec1Svg from '~/assets/svg/ec1.svg?component'
import TheLoftSvg from '~/assets/svg/the-loft.svg?component'

interface Props {
  block: Block<'block_hero'>
}

const { block } = defineProps<Props>()

const container = useTemplateRef('container')
const collaboration = useTemplateRef('collaboration')
const isBouncing = useBounce(collaboration, container, { speed: 100 })
</script>

<template>
  <div
    ref="container"
    v-editable="block"
    class="block-hero relative grid min-h-svh py-36 overflow-hidden"
  >
    <div class="wrapper grid md:max-w-(--max-w) md:mx-auto grid-cols-[repeat(var(--app-columns),minmax(0,1fr))] content-center gap-x-(--app-gutter-inner) gap-y-10 md:gap-y-0 md:grid-rows-[1fr_auto_1fr]">
      <h1 class="sr-only">The Loft EC1</h1>

      <TheLoftSvg
        aria-hidden="true"
        class="row-start-1 col-start-2 lg:col-start-1 col-end-[-1] justify-self-start w-(--the-loft-w) h-auto fill-current md:self-end md:mb-(--the-loft-o-offset)"
      />

      <NuxtImg
        v-if="block.image?.filename"
        provider="storyblok"
        :src="block.image.filename"
        :alt="block.image.alt ?? ''"
        :width="400"
        :height="400"
        format="webp"
        sizes="sm:25vw md:12vw lg:9vw"
        fetchpriority="high"
        class="row-start-2 col-start-6 col-end-8 md:col-start-5 md:col-end-6 lg:col-start-4 lg:col-end-5 justify-self-center w-(--image-w) max-w-none aspect-square object-cover [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%,0_18%)]"
      />

      <Ec1Svg
        aria-hidden="true"
        class="row-start-3 col-start-4 md:col-start-3 lg:col-start-2 col-span-1 self-start justify-self-start md:justify-self-end w-(--ec1-w) h-auto mt-(--ec1-offset) fill-current"
      />
    </div>

    <p
      v-if="block.collaboration"
      ref="collaboration"
      class="absolute top-0 left-0 font-serif italic text-16 md:text-24 leading-tight text-grey whitespace-pre-line pointer-events-none will-change-transform"
      :class="{ invisible: !isBouncing }"
    >
      {{ block.collaboration }}
    </p>
  </div>
</template>

<style scoped>
@reference "~/assets/css/app.css";

.block-hero {
  /* One design pixel: a fixed 1px below xl, then scales with the viewport from 1440px. */
  --fluid-px: 1px;

  /* SVG viewBox measurements. */
  --the-loft-vb-w: 227;
  --the-loft-vb-h: 296;
  --the-loft-vb-o-top: 210.37; /* top of the "o" in "loft" */
  --ec1-vb-w: 140;

  /* ec1 derives from the-loft so the logo pair stays proportional. */
  --the-loft-w: calc(115.87 * var(--fluid-px));
  --ec1-w: calc(var(--the-loft-w) * var(--ec1-vb-w) / var(--the-loft-vb-w));
  /* Negative margin that drops the-loft so the top of the "o" meets the top of the image. */
  --the-loft-o-offset: calc(var(--the-loft-w) * (var(--the-loft-vb-o-top) - var(--the-loft-vb-h)) / var(--the-loft-vb-w));
  --ec1-offset: calc(40 * var(--fluid-px));
  /* Fills its two-column grid area, up to 145px. */
  --image-w: min(100%, 145px);

  @variant md {
    --the-loft-w: calc(105 * var(--fluid-px));
    --ec1-offset: calc(80 * var(--fluid-px));
    /* The image sits in the single middle column of the 7-column grid. */
    --image-w: calc(100% + 2 * var(--app-gutter-inner));
    /* The composition is capped to a centred box spanning site columns 3-9 at 1440 (874px of content), re-gridded into 7 columns. */
    --app-columns: 7;
    --max-w: calc(874 * var(--fluid-px) + 2 * var(--app-gutter-outer));
  }

  @variant xl {
    --fluid-px: calc(100vw / 1440);
  }
}
</style>
