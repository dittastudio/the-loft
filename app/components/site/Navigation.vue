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
    class="fixed inset-x-0 top-0 z-10 pointer-events-none"
  >
    <div class="layout-grid pt-(--app-gutter-outer)">
      <ul class="col-start-5 col-end-8 md:col-start-10 md:col-end-13 justify-self-end flex flex-col items-end pointer-events-auto font-sans text-right text-24 leading-tight lowercase">
        <li
          v-for="item in items"
          :key="item._uid"
          v-editable="item"
        >
          <!-- 44px tap target on touch-sized layouts; tight stack from md as per design. -->
          <StoryblokLink
            :item="item.link"
            class="inline-flex items-center min-h-11 md:min-h-0 only-hover:hover:underline"
          >
            {{ item.title }}
          </StoryblokLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
