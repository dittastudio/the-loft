<script lang="ts" setup>
import type { Block } from '#storyblok-schema'
import Ec1Svg from '~/assets/svg/ec1.svg?component'
import TheLoftSvg from '~/assets/svg/the-loft.svg?component'

interface Props {
  block: Block<'block_hero'>
}

const { block } = defineProps<Props>()

const container = useTemplateRef<HTMLElement>('container')
const collaboration = useTemplateRef<HTMLElement>('collaboration')
const isBouncing = useBounce(collaboration, container, { speed: 100 })
</script>

<template>
  <div
    ref="container"
    v-editable="block"
    class="relative h-svh overflow-hidden"
  >
    <div class="container-grid h-full grid-rows-3 py-24">
      <h1 class="sr-only">The Loft EC1</h1>

      <TheLoftSvg
        aria-hidden="true"
        class="row-start-1 col-start-1 col-end-5 self-end w-full h-auto fill-current md:col-end-3"
      />

      <NuxtImg
        v-if="block.image?.filename"
        provider="storyblok"
        :src="block.image.filename"
        :alt="block.image.alt ?? ''"
        :width="400"
        :height="400"
        format="webp"
        sizes="2xs:50vw xs:50vw sm:50vw md:20vw lg:200px xl:200px 2xl:200px"
        fetchpriority="high"
        class="row-start-2 col-start-4 col-end-10 self-center w-full aspect-square object-cover [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%,0_18%)] md:col-start-6 md:col-end-8"
      />

      <Ec1Svg
        aria-hidden="true"
        class="row-start-3 col-start-4 col-end-7 self-start w-full h-auto fill-current md:col-end-5"
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
