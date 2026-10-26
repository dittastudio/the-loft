<script lang="ts" setup>
import type { Block } from '#storyblok-schema'

interface Props {
  items: Block<'settings'>['navigation']
}

const { items } = defineProps<Props>()
</script>

<template>
  <nav
    v-if="items?.length"
    aria-label="Main"
    class="fixed top-0 right-0 z-10 p-4 md:p-10"
  >
    <ul class="font-sans text-right text-16 md:text-24 leading-tight lowercase">
      <li
        v-for="item in items"
        :key="item._uid"
        v-editable="item"
      >
        <StoryblokLink
          :item="item.link"
          class="only-hover:hover:underline"
        >
          {{ item.title }}
        </StoryblokLink>
      </li>
    </ul>
  </nav>
</template>
