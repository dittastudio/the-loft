<script lang="ts" setup>
import type { Page } from '#storyblok-components'

const route = useRoute()

const relations: string[] = []

const story = await useStory<Page>(
  route.path,
  { resolve_relations: relations },
  { resolveRelations: relations },
)

const imageOptions = {
  width: 1200,
  height: 630,
  format: 'jpg',
  quality: 80,
}

useSeoMeta({
  title: story.value?.content.seo_title ?? '',
  description: story.value?.content.seo_description,
  ogTitle: story.value?.content.seo_title ?? '',
  ogDescription: story.value?.content.seo_description,
  ogImage: storyblokImage(story.value?.content.seo_image?.filename, imageOptions) || null,
  ogType: 'website',
  twitterTitle: story.value?.content.seo_title ?? '',
  twitterCard: 'summary_large_image',
  twitterImage: storyblokImage(story.value?.content.seo_image?.filename, imageOptions) || null,
})
</script>

<template>
  <main class="w-full min-h-svh">
    <TemplatePage
      v-if="isPage(story)"
      :story="story"
    />
  </main>
</template>
