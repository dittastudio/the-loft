<script lang="ts" setup>
import type { MultilinkFieldValue } from '@storyblok/schema'

interface Props {
  item: MultilinkFieldValue
}

const { item } = defineProps<Props>()

const route = useRoute()

const determineHref = (item: MultilinkFieldValue) => {
  switch (item.linktype) {
    case 'story': {
      const path = `/${item.cached_url}`.replace('/home', '/').trim()
      return path === '/' ? path : path.replace(/\/$/, '')
    }
    case 'email': {
      return `mailto:${item.email}`
    }
    default: {
      return item.cached_url
    }
  }
}

const isActiveLink = computed(() => {
  const href = determineHref(item)
  return route.path === href || (href !== '/' && route.path.startsWith(`${href}/`))
})

const attributes = {
  title: 'title' in item ? item.title : undefined,
  rel: 'rel' in item ? item.rel : undefined,
  to: determineHref(item),
  target: (item?.target ?? item?.linktype === 'asset') ? '_blank' : null,
}
</script>

<template>
  <NuxtLink
    v-bind="attributes"
    :class="{ 'router-link-active': isActiveLink }"
  >
    <slot />
  </NuxtLink>
</template>
