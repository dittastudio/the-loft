<script lang="ts" setup>
import type { Page } from '#storyblok-components'
import type { ISbStoryData } from '@storyblok/js'

interface Props {
  story: ISbStoryData<Page>
}

const { story } = defineProps<Props>()
</script>

<template>
  <section
    v-for="block in story.content.blocks"
    :key="block._uid"
  >
    <BlockText
      v-if="block.component === 'block_text'"
      :block="block"
    />
  </section>
</template>

<style scoped>
@reference "@/assets/css/app.css";
</style>
