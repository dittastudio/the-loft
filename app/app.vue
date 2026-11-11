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
  titleTemplate: (title) => (title ? `${title} - The Loft` : 'The Loft'),
  // Nothing is indexed until the official domain is added. At that point, use 'index, follow' only when
  // useRuntimeConfig().public.STORYBLOK_VERSION === 'published', and make site.indexable in nuxt.config.ts follow the
  // same condition, so the develop draft preview stays noindexed.
  robots: 'noindex, nofollow',
})
</script>

<template>
  <!-- The link count lets BlockHero work out the navigation's height in CSS, with no measuring after load. -->
  <div :style="{ '--site-nav-items': story.content.navigation?.length ?? 0 }">
    <SiteNavigation :items="story.content.navigation" />

    <LazySiteCollaboration
      v-if="story.content.collaboration?.trim()"
      :text="story.content.collaboration"
    />

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
