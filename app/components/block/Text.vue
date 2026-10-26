<script lang="ts" setup>
import type { BlockText } from '#storyblok-components'

interface Props {
  block: BlockText
}

const { block } = defineProps<Props>()
</script>

<template>
  <div v-editable="block">
    <StoryblokText 
      v-if="storyblokRichTextContent(block.text)"
      :html="block.text"
    />
  </div>
</template>
