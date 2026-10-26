<script lang="ts" setup>
interface Props {
  error: {
    statusCode: number
    statusMessage: string
  }
}

const { error } = defineProps<Props>()

const message = computed(() => error?.statusCode && error?.statusMessage
  ? `${error?.statusCode} ${error?.statusMessage}`
  : 'an unexpected error',
)

useHead({
  title: message.value.toLowerCase(),
})
</script>

<template>
  <div>
    <h1>
      {{ message }}
    </h1>
  </div>
</template>
