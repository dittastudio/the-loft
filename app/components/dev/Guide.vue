<script lang="ts" setup>
interface Props {
  // A number, or any CSS value (e.g. `var(--app-columns)`) so the guide tracks the site grid without JS.
  columns?: number | string
  // How many column elements to render; extras beyond the active count are clipped.
  maxColumns?: number
  innerGutter?: string
  outerGutter?: string
  maxWidth?: string
  color?: string
  zIndex?: number
}

const {
  columns = 12,
  maxColumns,
  innerGutter = '16px',
  outerGutter = '16px',
  maxWidth = 'none',
  color = 'rgb(0 0 255 / 0.2)',
  zIndex = 9999,
} = defineProps<Props>()

const columnCount = computed(() => maxColumns ?? (typeof columns === 'number' ? columns : 12))
</script>

<template>
  <div>
    <input
      class="peer fixed right-5 bottom-5 size-12 cursor-pointer appearance-none rounded-full bg-white/50 shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-white/80 checked:bg-white"
      :style="{ zIndex: zIndex + 1 }"
      type="checkbox"
    />

    <div
      class="pointer-events-none fixed inset-0 mx-auto h-screen w-full opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
      :style="{
        zIndex,
        maxWidth,
        paddingLeft: outerGutter,
        paddingRight: outerGutter,
      }"
    >
      <div
        class="grid h-full grid-rows-[100%] auto-rows-[0] overflow-hidden"
        :style="{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: innerGutter,
        }"
      >
        <div
          v-for="i in columnCount"
          :key="i"
          :style="{ background: color }"
        />
      </div>
    </div>
  </div>
</template>
