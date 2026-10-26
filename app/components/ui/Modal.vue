<script lang="ts" setup>
interface Props {
  label: string
}

const { label } = defineProps<Props>()

const open = defineModel<boolean>('open', { default: false })

const dialog = useTemplateRef('dialog')

const sync = (value: boolean) => {
  const el = dialog.value

  if (!el) {
    return
  }

  if (value && !el.open) {
    el.showModal()
  }
  else if (!value && el.open) {
    el.close()
  }
}

watch(open, sync)

onMounted(() => sync(open.value))

// Fires for every close route: Esc, light dismiss, close button.
const onClose = () => {
  open.value = false
}

// The dialog fills the viewport, so a click that lands on it directly (not its content) is a click on empty space.
const onClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    open.value = false
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="label"
    closedby="any"
    class="ui-modal"
    @close="onClose"
    @click="onClick"
  >
    <div class="ui-modal__header sticky top-0 z-1 pointer-events-none">
      <div class="wrapper flex justify-between items-start pt-(--app-gutter-outer) font-sans text-24 leading-tight lowercase">
        <div class="pointer-events-auto">
          <slot name="actions" />
        </div>

        <button
          type="button"
          class="pointer-events-auto inline-flex items-center lowercase only-hover:hover:underline"
          autofocus
          @click="open = false"
        >
          Close
        </button>
      </div>
    </div>

    <div class="ui-modal__content">
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
@reference "~/assets/css/app.css";

/*
  Enter: the frost settles first, then the header and pages come into focus (blur → sharp) a beat later.
  Exit: reversed and quicker, the content dissolves first and the frost lifts after it.
  Transitions are taken from the state being entered, so delays live on [open] for enter and on the base rule for exit.
*/
.ui-modal {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--color-black);
  background: transparent;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Keeps the dialog in the top layer until the slowest exit (backdrop: 0.15s delay + 0.6s) has finished. */
  transition:
    overlay 0.75s allow-discrete,
    display 0.75s allow-discrete;
}

.ui-modal::backdrop {
  /* The frost itself never changes; only its opacity animates, which stays on the compositor. */
  background-color: rgb(255 255 255 / 80%);
  backdrop-filter: blur(12px);
  opacity: 0;
  transition:
    opacity 0.6s --theme(--ease-inOutSine) 0.15s,
    overlay 0.75s allow-discrete,
    display 0.75s allow-discrete;
}

.ui-modal__header,
.ui-modal__content {
  opacity: 0;
  filter: blur(4px);
  transition:
    opacity 0.35s --theme(--ease-inOutSine),
    filter 0.35s --theme(--ease-inOutSine),
    scale 0.35s --theme(--ease-inOutSine);
}

.ui-modal__content {
  scale: 0.99;
  transform-origin: 50% 0;
}

.ui-modal[open]::backdrop {
  opacity: 1;
  transition:
    opacity 0.9s --theme(--ease-outQuint),
    overlay 0.9s allow-discrete,
    display 0.9s allow-discrete;
}

.ui-modal[open] .ui-modal__header,
.ui-modal[open] .ui-modal__content {
  opacity: 1;
  /* `none` rather than blur(0) so no filter layer sits over the pages while scrolling; it still interpolates. */
  filter: none;
  transition:
    opacity 1.1s --theme(--ease-outQuint) 0.25s,
    filter 1.1s --theme(--ease-outQuint) 0.25s,
    scale 1.4s --theme(--ease-outQuint) 0.25s;
}

.ui-modal[open] .ui-modal__content {
  scale: 1;
}

@starting-style {
  .ui-modal[open]::backdrop {
    opacity: 0;
  }

  .ui-modal[open] .ui-modal__header,
  .ui-modal[open] .ui-modal__content {
    opacity: 0;
    filter: blur(4px);
  }

  .ui-modal[open] .ui-modal__content {
    scale: 0.98;
  }
}

/* Opacity only: no blur or scale, and short enough not to linger. */
@media (prefers-reduced-motion: reduce) {
  .ui-modal__header,
  .ui-modal__content,
  .ui-modal[open] .ui-modal__header,
  .ui-modal[open] .ui-modal__content {
    filter: none;
    scale: none;
    transition: opacity 0.3s linear;
  }

  .ui-modal::backdrop,
  .ui-modal[open]::backdrop {
    transition:
      opacity 0.3s linear,
      overlay 0.3s allow-discrete,
      display 0.3s allow-discrete;
  }
}
</style>
