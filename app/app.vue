<script lang="ts" setup>
import type { Settings } from '#storyblok-components'

const story = await useStory<Settings>('/settings')
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
  titleTemplate: title => (title ? `${title} - <APP_SITE_NAME>` : '<APP_SITE_NAME>'),
  robots: 'index, follow',
})
</script>

<template>
  <div>
    <NuxtPage />

    <pre>{{ story }}</pre>
  </div>
</template>
