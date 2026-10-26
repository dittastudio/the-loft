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
    <SiteNavigation :items="story.content.navigation" />

    <NuxtPage />

    <DevOnly>
      <DevGuide
        columns="var(--app-columns)"
        :max-columns="12"
        inner-gutter="var(--app-gutter-inner)"
        outer-gutter="var(--app-gutter-outer)"
        color="rgb(255 105 180 / 0.25)"
      />
    </DevOnly>
  </div>
</template>
