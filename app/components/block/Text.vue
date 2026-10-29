<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

interface Props {
  block: Block<'block_text'>
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
