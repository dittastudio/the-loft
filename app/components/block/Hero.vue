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

// The intro's look is all in the CSS, which this moves between waiting for the image and spinning in, then ends.
const INTRO_WAIT = 1000 // ms to wait for the image to decode before giving up and showing it at rest

const route = useRoute()
const introPhase = shallowRef<'waiting' | 'spinning' | undefined>(block.image?.filename ? 'waiting' : undefined)
const isPaused = computed(() => isModalOpen.value || introPhase.value === 'waiting')

const { clip: imageClip, spinIn } = useBoxTurn(cell, imageEl, {
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
  paused: isPaused,
})

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const isImageReady = (el: unknown) =>
  Promise.race([
    el instanceof HTMLImageElement
      ? el.decode().then(
          () => true,
          () => false,
        )
      : false,
    wait(INTRO_WAIT).then(() => false),
  ])

onMounted(async () => {
  const canSpin =
    !isVisualEditor(route.query) &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    (await isImageReady(imageEl.value))

  if (canSpin) {
    spinIn()
  }

  introPhase.value = canSpin ? 'spinning' : undefined
})
</script>

<template>
  <div
    ref="container"
    v-editable="block"
    :data-intro="introPhase"
    class="block-hero relative grid min-h-svh motion-safe:touch-pan-y motion-safe:touch-pinch-zoom py-[min(var(--hero-box-right),80px)] md:py-(--app-gutter-outer) overflow-hidden"
  >
    <div
      class="wrapper grid md:max-w-(--max-w) md:mx-auto grid-cols-[repeat(var(--app-columns),minmax(0,1fr))] grid-rows-[minmax(var(--row-min),1fr)_auto_minmax(var(--row-min),1fr)] gap-x-(--app-gutter-inner) gap-y-10 md:gap-y-0"
    >
      <h1 class="sr-only">The Loft EC1</h1>

      <TheLoftSvg
        aria-hidden="true"
        class="block-hero__logo row-start-1 col-start-2 lg:col-start-1 col-end-[-1] self-end justify-self-start w-(--the-loft-w) h-auto fill-current md:mb-(--the-loft-l-offset)"
      />

      <div
        v-if="block.image?.filename"
        class="block-hero__box row-start-2 col-start-6 col-end-8 md:col-start-5 md:col-end-6 lg:col-start-4 lg:col-end-5 justify-self-center w-(--image-w)"
      >
        <div
          ref="cell"
          class="block-hero__cell relative w-full aspect-square select-none motion-safe:touch-pan-y motion-safe:touch-pinch-zoom motion-safe:pointer-fine:cursor-grab"
          :style="{ '--image-scale': imageScale, '--image-drift': imageDrift, clipPath: imageClip }"
          @animationend="introPhase = introPhase === 'spinning' ? undefined : introPhase"
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
      </div>

      <Ec1Svg
        aria-hidden="true"
        class="block-hero__logo row-start-3 col-start-4 md:col-start-3 lg:col-start-2 col-span-1 self-start justify-self-start md:justify-self-end w-(--ec1-w) h-auto mt-(--ec1-offset) fill-current"
      />
    </div>
  </div>
</template>

<style>
@reference "~/assets/css/app.css";

/* On the root while the hero is on the page, so SiteNavigation can line its links up with the box. */
:root:has(.block-hero) {
  /* One design pixel: a fixed 1px below xl, then scales with the viewport from 1440px. */
  --fluid-px: 1px;

  /* SVG viewBox measurements. */
  --the-loft-vb-w: 420;
  --the-loft-vb-h: 507;
  --the-loft-vb-l-top: 283.62; /* top of the "l" in "loft" */
  --ec1-vb-w: 258;
  --ec1-vb-h: 223;

  /* ec1 derives from the-loft so the logo pair stays proportional. */
  --the-loft-w: calc(132.09 * var(--fluid-px));
  --ec1-w: calc(var(--the-loft-w) * var(--ec1-vb-w) / var(--the-loft-vb-w));
  /* Negative margin that drops the-loft so the top of the "l" meets the top of the image. */
  --the-loft-l-offset: calc(
    var(--the-loft-w) * (var(--the-loft-vb-l-top) - var(--the-loft-vb-h)) / var(--the-loft-vb-w)
  );
  --ec1-offset: calc(12 * var(--fluid-px));
  /* Fills its two-column grid area (columns 6-7 of 8), up to 130px. */
  --image-max-w: 130px;
  --image-w: min(100%, var(--image-max-w));

  /* The box's distance from the right of the page below md, for a page-wide size container. */
  --hero-col-w: calc((100cqw - 2 * var(--app-gutter-outer) - 7 * var(--app-gutter-inner)) / 8);
  --hero-box-right: calc(
    var(--app-gutter-outer) + var(--hero-col-w) + var(--app-gutter-inner) +
      max(0px, (2 * var(--hero-col-w) + var(--app-gutter-inner) - var(--image-max-w)) / 2)
  );

  /* Heights the logos take up in the rows above and below the image. */
  --the-loft-row-h: calc(var(--the-loft-w) * var(--the-loft-vb-h) / var(--the-loft-vb-w));
  --ec1-row-h: calc(var(--the-loft-w) * var(--ec1-vb-h) / var(--the-loft-vb-w) + var(--ec1-offset));
  /* Both outer rows share the taller one's height as a minimum, so the image stays centred at any viewport height. */
  --row-min: max(var(--the-loft-row-h), var(--ec1-row-h));

  /* The intro's timing, the same as the idle spins, so the logos, scale and SiteNavigation move with the turn. */
  --intro-length: 2040ms;
  --intro-ease: cubic-bezier(0.45, 0, 0.15, 1);

  @variant md {
    --the-loft-w: calc(131.25 * var(--fluid-px));
    --ec1-offset: calc(80 * var(--fluid-px));
    /* Only the part of the-loft above the top of the "l" sits in its row; the rest hangs beside the image. */
    --the-loft-row-h: calc(var(--the-loft-w) * var(--the-loft-vb-l-top) / var(--the-loft-vb-w));
    /* The image sits in the single middle column of the 7-column grid. */
    --image-w: calc((100% + 2 * var(--app-gutter-inner)) * 1.25);
    /* The composition is capped to a centred box spanning site columns 3-9 at 1440 (874px of content), re-gridded into 7 columns. */
    --hero-columns: 7;
    --hero-content-w: calc(874 * var(--fluid-px));
    --max-w: calc(var(--hero-content-w) + 2 * var(--app-gutter-outer));

    /*
      The box's distance from the top of the page, for an element as wide as the page that is a size container.
      This is --image-w worked out from the container's width rather than its cell's. The hero is one screen tall
      with the box centred in it, unless the screen is too short to fit the rows above it.
    */
    --hero-col-w: calc(
      (
          min(100cqw - 2 * var(--app-gutter-outer), var(--hero-content-w)) - (var(--hero-columns) - 1) *
            var(--app-gutter-inner)
        ) /
        var(--hero-columns)
    );
    --hero-box-top: max(
      50svh - (var(--hero-col-w) + 2 * var(--app-gutter-inner)) * 1.25 / 2,
      var(--app-gutter-outer) + var(--row-min)
    );
  }

  @variant xl {
    --fluid-px: calc(100vw / 1440);
  }
}
</style>

<style scoped>
@reference "~/assets/css/app.css";

.block-hero {
  @variant md {
    --app-columns: var(--hero-columns);
  }
}

/* SiteNavigation's anchor. Not the cell, whose scale would move it. */
.block-hero__box {
  anchor-name: --hero-box;
}

/* The intro, which useBoxTurn's spinIn turns the box for. There's none to wait for when motion is reduced. */
@media (prefers-reduced-motion: no-preference) {
  .block-hero__cell {
    transition: opacity 0.4s --theme(--ease-outQuad);
  }

  .block-hero[data-intro] .block-hero__cell {
    pointer-events: none;
  }

  .block-hero__logo {
    transition:
      opacity var(--intro-length) var(--intro-ease),
      filter var(--intro-length) var(--intro-ease);
  }

  /* Hidden from first paint, so the prerendered resting shape never flashes, until JS moves on or never does. */
  .block-hero[data-intro='waiting'] .block-hero__cell {
    opacity: 0;
    animation: block-hero-reveal 0s 2.5s forwards;
  }

  .block-hero[data-intro='waiting'] .block-hero__logo {
    opacity: 0;
    filter: blur(12px);
    animation: block-hero-reveal 0s 2.5s forwards;
  }

  .block-hero[data-intro='spinning'] .block-hero__cell {
    animation: block-hero-spin-in var(--intro-length) var(--intro-ease);
  }

  @keyframes block-hero-reveal {
    to {
      opacity: 1;
      filter: none;
    }
  }

  @keyframes block-hero-spin-in {
    from {
      opacity: 0;
      scale: 0.5;
    }
  }
}
</style>
