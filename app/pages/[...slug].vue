<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

const route = useRoute()

const relations: string[] = []

const story = await useStory<Block<'page'>>(
  route.path,
  { resolve_relations: relations },
  { resolveRelations: relations },
)

const { seo_title, seo_description, seo_image } = story.value.content
const imageOptions = { width: 1200, height: 630, format: 'jpg', smart: true, quality: 90 }

useSeoMeta({
  title: seo_title ?? story.value.name,
  description: seo_description,
  ogTitle: seo_title ?? story.value.name,
  ogDescription: seo_description,
  ogImage: storyblokImage(seo_image?.filename, imageOptions) || null,
  ogImageWidth: imageOptions.width,
  ogImageHeight: imageOptions.height,
  ogType: 'website',
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
