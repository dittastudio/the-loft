<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

const story = await useStory<Block<'settings'>>('/settings')
const route = useRoute()

const globalClasses = computed(() => ({
  'is-storyblok-editor': isVisualEditor(route.query),
}))

useHead({
  htmlAttrs: {
    class: globalClasses,
  },
})

useSeoMeta({
  titleTemplate: title => (title ? `${title} - The Loft` : 'The Loft'),
  robots: 'index, follow',
})
</script>

<template>
  <div>
    <NuxtPage />

    <pre>{{ story }}</pre>
  </div>
</template>
