// The top layer stacks in insertion order, so anything that must stay above modals re-adds itself whenever one opens.
export default function useTopLayer() {
  const opened = useState<number>('top-layer-opened', () => 0)
  // Whether a modal is in the top layer, from showModal() until its exit has finished and it's closed.
  const isModalOpen = useState<boolean>('top-layer-modal-open', () => false)

  const notify = () => {
    opened.value++
  }

  return { opened, isModalOpen, notify }
}
