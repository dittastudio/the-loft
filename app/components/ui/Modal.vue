<script lang="ts" setup>
interface Props {
  label: string
}

const { label } = defineProps<Props>()

const open = defineModel<boolean>('open', { default: false })

const dialog = useTemplateRef('dialog')
const { isModalOpen, notify } = useTopLayer()

/*
  The exit runs while the dialog is still modal, and close() is only called once it has finished.
  Safari doesn't support transitioning `overlay`, so closing first would drop the dialog and its ::backdrop
  out of the top layer immediately and the exit would never be seen.
*/
const sync = async (value: boolean) => {
  const el = dialog.value

  if (!el) {
    return
  }

  if (value) {
    delete el.dataset.closing

    if (!el.open) {
      el.showModal()
      isModalOpen.value = true
      notify()
    }
  } else if (el.open && !('closing' in el.dataset)) {
    el.dataset.closing = ''

    await Promise.allSettled(el.getAnimations({ subtree: true }).map((animation) => animation.finished))

    // Reopened mid-exit: the reverse transition has already taken over.
    if (open.value) {
      return
    }

    delete el.dataset.closing
    el.close()
    isModalOpen.value = false
  }
}

watch(open, sync)

onMounted(() => sync(open.value))

// Fires for every close route: Esc, light dismiss, close button.
const onClose = () => {
  open.value = false
}

// Esc and light dismiss would close instantly; hold them and go through the animated exit instead.
const onCancel = (event: Event) => {
  event.preventDefault()
  open.value = false
}

// The scroller fills the viewport, so a click that lands on it directly (not its content) is a click on empty space.
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
    autofocus
    class="ui-modal"
    @cancel="onCancel"
    @close="onClose"
  >
    <div class="ui-modal__header absolute inset-x-0 top-0 z-1 pointer-events-none">
      <div class="wrapper flex justify-between items-start py-(--app-gutter-outer) font-sans text-20 leading-tight">
        <div class="lowercase pointer-events-auto">
          <slot name="actions" />
        </div>

        <button
          type="button"
          class="pointer-events-auto inline-block p-(--app-gutter-outer) -m-(--app-gutter-outer) lowercase transition-opacity duration-300 ease-out hover:opacity-50"
          @click="open = false"
        >
          Close
        </button>
      </div>
    </div>

    <div
      class="ui-modal__scroller"
      @click="onClick"
    >
      <div class="ui-modal__content pt-[calc(var(--app-gutter-outer)*2.2)]">
        <slot />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
@reference "~/assets/css/app.css";

/*
  Enter: the frost settles first, then the header and pages come into focus (blur → sharp) a beat later.
  Exit: reversed and quicker, the content dissolves first and the frost lifts after it.
  Transitions are taken from the state being entered, so delays live on the open state for enter and on the base rule for exit.
  The open state excludes [data-closing] so the exit can play while the dialog is still in the top layer (see sync()).
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
  overflow: hidden;
  /* The dialog itself takes focus on open (so the close button doesn't show a ring); it needs no indicator of its own. */
  outline: none;
}

.ui-modal::backdrop {
  /* The frost itself never changes; only its opacity animates, which stays on the compositor. */
  background-color: --alpha(var(--color-white) / 100%);
  backdrop-filter: blur(12px);
  opacity: 0;
  transition: opacity 0.6s --theme(--ease-inOutSine) 0.15s;
}

/*
  The scroller is always exactly the viewport, so scaling it zooms whatever is on screen around the screen's centre,
  however far down the pages have been scrolled. Scaling the (very tall) content instead would slide it at depth.
*/
.ui-modal__scroller {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scale: 0.99;
  transition: scale 0.35s --theme(--ease-inOutSine);
}

.ui-modal__header,
.ui-modal__content {
  opacity: 0;
  filter: blur(4px);
  transition:
    opacity 0.35s --theme(--ease-inOutSine),
    filter 0.35s --theme(--ease-inOutSine);
}

.ui-modal[open]:not([data-closing])::backdrop {
  opacity: 1;
  transition: opacity 0.9s --theme(--ease-outQuint);
}

.ui-modal[open]:not([data-closing]) .ui-modal__scroller {
  scale: 1;
  transition: scale 1.4s --theme(--ease-outQuint) 0.25s;
}

.ui-modal[open]:not([data-closing]) .ui-modal__header,
.ui-modal[open]:not([data-closing]) .ui-modal__content {
  opacity: 1;
  /* `none` rather than blur(0) so no filter layer sits over the pages while scrolling; it still interpolates. */
  filter: none;
  transition:
    opacity 1.1s --theme(--ease-outQuint) 0.25s,
    filter 1.1s --theme(--ease-outQuint) 0.25s;
}

/* Same selectors as the open state: @starting-style has no cascade priority, so it only wins on matching specificity. */
@starting-style {
  .ui-modal[open]:not([data-closing])::backdrop {
    opacity: 0;
  }

  .ui-modal[open]:not([data-closing]) .ui-modal__header,
  .ui-modal[open]:not([data-closing]) .ui-modal__content {
    opacity: 0;
    filter: blur(4px);
  }

  .ui-modal[open]:not([data-closing]) .ui-modal__scroller {
    scale: 0.95;
  }
}

/* Opacity only: no blur or scale, and short enough not to linger. */
@media (prefers-reduced-motion: reduce) {
  .ui-modal__header,
  .ui-modal__content,
  .ui-modal[open]:not([data-closing]) .ui-modal__header,
  .ui-modal[open]:not([data-closing]) .ui-modal__content {
    filter: none;
    transition: opacity 0.3s linear;
  }

  .ui-modal__scroller,
  .ui-modal[open]:not([data-closing]) .ui-modal__scroller {
    scale: none;
    transition: none;
  }

  .ui-modal::backdrop,
  .ui-modal[open]:not([data-closing])::backdrop {
    transition: opacity 0.3s linear;
  }
}
</style>
