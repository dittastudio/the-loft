<script lang="ts" setup>
interface Props {
  text: string
}

const { text } = defineProps<Props>()

const target = useTemplateRef('target')
const { opened } = useTopLayer()

// Re-adding moves it to the top of the top layer, above any modal opened since.
const raise = () => {
  if (target.value?.matches(':popover-open')) {
    target.value.hidePopover()
  }

  target.value?.showPopover()
}

// Registered before useBounce so the target is shown (and has a size) by the time it's measured.
onMounted(raise)

watch(opened, raise)

const isBouncing = useBounce(target, { speed: 100 })

/*
  Hushed while the reader is touching, scrolling or zoomed in, so it doesn't drift over the pages being read.
  This is tracked everywhere; the CSS only applies it while a modal is open.
*/
const isHushed = shallowRef<boolean>(false)

let touches = 0 // fingers currently down

const viewport = shallowRef<VisualViewport | null>(null)

const { start: settleLater, stop: cancelSettle } = useTimeoutFn(
  () => {
    // Still held or zoomed: the next touchend or viewport event restarts the wait.
    if (touches === 0 && (viewport.value?.scale ?? 1) <= 1.01) {
      isHushed.value = false
    }
  },
  600, // ms of stillness before it fades back in; long enough for iOS scroll momentum to finish
  { immediate: false },
)

const hush = () => {
  isHushed.value = true
  settleLater()
}

// Touch events rather than pointer events: a pan fires pointercancel and its pointerup never arrives.
const onTouch = (event: TouchEvent) => {
  touches = event.touches.length
  hush()
}

// The tap that opened the modal would otherwise carry its hush in, fading out and back as the modal appears.
watch(opened, () => {
  cancelSettle()
  isHushed.value = false
})

onMounted(() => {
  viewport.value = window.visualViewport
})

// Scroll doesn't bubble, so it's caught on the way down to reach the modal's scroller.
useEventListener(document, 'scroll', hush, { capture: true, passive: true })
useEventListener('wheel', hush, { passive: true })
useEventListener(['touchstart', 'touchend', 'touchcancel'], onTouch, { passive: true })
// Pinching and panning while zoomed.
useEventListener(viewport, ['resize', 'scroll'], hush, { passive: true })
</script>

<template>
  <p class="sr-only">
    {{ text }}
  </p>

  <!-- A manual popover sits in the top layer, so it stays visible over an open modal. -->
  <p
    ref="target"
    popover="manual"
    aria-hidden="true"
    class="site-collaboration font-serif italic text-20 md:text-24 leading-tight text-grey whitespace-pre-line pointer-events-none will-change-transform"
    :class="{ invisible: !isBouncing }"
    :data-hushed="isHushed || undefined"
  >
    {{ text }}
  </p>
</template>

<style scoped>
@reference "~/assets/css/app.css";

/* Undo the UA popover styles (centred, bordered, padded, Canvas colours) so it sits at the viewport's top left. */
.site-collaboration {
  inset: 0 auto auto 0;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: visible;
  background: transparent;
  /* Exit: matches the modal's backdrop lifting (and fades back in if it closed while hushed). */
  transition:
    color 0.6s --theme(--ease-inOutSine) 0.15s,
    opacity 0.8s --theme(--ease-inOutSine);
}

/*
  The grey is too faint on the modal's white backdrop, so it darkens while one is open (in step with the frost).
  The darker grey still has to read on the PDF's blue pages, so it sits at equal (3:1) contrast against both.
  The opacity here is the slow fade back in once the reader has settled.
*/
:root:has(.ui-modal[open]:not([data-closing])) .site-collaboration {
  color: --theme(--color-grey-mid);
  transition:
    color 0.9s --theme(--ease-outQuint),
    opacity 0.8s --theme(--ease-inOutSine);
}

/*
  Out of the way while the pages are being touched, scrolled or zoomed: quicker than the return, but still a fade.
  A gentle curve, as outQuint drops almost all the opacity in the first few frames and reads as a blink.
*/
:root:has(.ui-modal[open]:not([data-closing])) .site-collaboration[data-hushed] {
  opacity: 0;
  transition:
    color 0.9s --theme(--ease-outQuint),
    opacity 0.5s --theme(--ease-outSine);
}

@media (prefers-reduced-motion: reduce) {
  .site-collaboration,
  :root:has(.ui-modal[open]:not([data-closing])) .site-collaboration,
  :root:has(.ui-modal[open]:not([data-closing])) .site-collaboration[data-hushed] {
    transition:
      color 0.3s linear,
      opacity 0.3s linear;
  }
}
</style>
