<script lang="ts" setup>
import type { Block } from '#storyblok-schema'
import type { ISbStoryData } from '@storyblok/js'

interface Props {
  story: ISbStoryData<Block<'page'>>
}

const { story } = defineProps<Props>()
</script>

<template>
  <section
    v-for="block in story.content.blocks"
    :key="block._uid"
  >
    <BlockHero
      v-if="block.component === 'block_hero'"
      :block="block"
    />

    <BlockText
      v-else-if="block.component === 'block_text'"
      :block="block"
    />
  </section>
</template>
