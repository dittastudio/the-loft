<script lang="ts" setup>
import type { Block } from '#storyblok-schema'
import Ec1Svg from '~/assets/svg/ec1.svg?component'
import TheLoftSvg from '~/assets/svg/the-loft.svg?component'

interface Props {
  block: Block<'block_hero'>
}

const { block } = defineProps<Props>()

const container = useTemplateRef('container')

// The image is drawn larger than its cell so the turning box always stays over it, even as it drifts.
const imageScale = 1.6
const imageDrift = 0.06
const cell = useTemplateRef('cell')
const image = useTemplateRef('image')
const { isModalOpen } = useTopLayer()
const imageEl = computed<HTMLElement | null>(() => image.value?.$el ?? null)
const imageClip = useBoxTurn(cell, imageEl, {
  shape: [
    [0.3, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0.18],
  ],
  scale: imageScale,
  drift: imageDrift,
  surface: container,
  // Nothing of it shows under a modal, and repainting it there would make the modal's frost recompute its blur.
  paused: isModalOpen,
})
</script>

<template>
  <div
    ref="container"
    v-editable="block"
    class="block-hero relative grid min-h-svh motion-safe:touch-pan-y motion-safe:touch-pinch-zoom py-[calc(var(--app-gutter-outer)*4)] md:py-(--app-gutter-outer) overflow-hidden"
  >
    <div
      class="wrapper grid md:max-w-(--max-w) md:mx-auto grid-cols-[repeat(var(--app-columns),minmax(0,1fr))] content-center gap-x-(--app-gutter-inner) gap-y-10 md:gap-y-0 md:grid-rows-[1fr_auto_1fr]"
    >
      <h1 class="sr-only">The Loft EC1</h1>

      <TheLoftSvg
        aria-hidden="true"
        class="row-start-1 col-start-2 lg:col-start-1 col-end-[-1] justify-self-start w-(--the-loft-w) h-auto fill-current md:self-end md:mb-(--the-loft-o-offset)"
      />

      <div
        v-if="block.image?.filename"
        ref="cell"
        class="relative row-start-2 col-start-6 col-end-8 md:col-start-5 md:col-end-6 lg:col-start-4 lg:col-end-5 justify-self-center w-(--image-w) aspect-square select-none motion-safe:touch-pan-y motion-safe:touch-pinch-zoom motion-safe:pointer-fine:cursor-grab"
        :style="{ '--image-scale': imageScale, '--image-drift': imageDrift, clipPath: imageClip }"
      >
        <NuxtImg
          ref="image"
          provider="storyblok"
          :src="block.image.filename"
          :alt="block.image.alt ?? ''"
          :width="688"
          :height="688"
          format="avif"
          sizes="sm:43vw md:27vw lg:20vw"
          fetchpriority="high"
          draggable="false"
          class="absolute top-1/2 left-1/2 -translate-1/2 size-[calc((var(--image-scale)+2*var(--image-drift))*100%)] max-w-none object-cover will-change-transform pointer-events-none"
        />
      </div>

      <Ec1Svg
        aria-hidden="true"
        class="row-start-3 col-start-4 md:col-start-3 lg:col-start-2 col-span-1 self-start justify-self-start md:justify-self-end w-(--ec1-w) h-auto mt-(--ec1-offset) fill-current"
      />
    </div>
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
  --the-loft-o-offset: calc(
    var(--the-loft-w) * (var(--the-loft-vb-o-top) - var(--the-loft-vb-h)) / var(--the-loft-vb-w)
  );
  --ec1-offset: calc(40 * var(--fluid-px));
  /* Fills its two-column grid area, up to 130px. */
  --image-w: min(100%, 130px);

  @variant md {
    --the-loft-w: calc(131.25 * var(--fluid-px));
    --ec1-offset: calc(80 * var(--fluid-px));
    /* The image sits in the single middle column of the 7-column grid. */
    --image-w: calc((100% + 2 * var(--app-gutter-inner)) * 1.25);
    /* The composition is capped to a centred box spanning site columns 3-9 at 1440 (874px of content), re-gridded into 7 columns. */
    --app-columns: 7;
    --max-w: calc(874 * var(--fluid-px) + 2 * var(--app-gutter-outer));
  }

  @variant xl {
    --fluid-px: calc(100vw / 1440);
  }
}
</style>
