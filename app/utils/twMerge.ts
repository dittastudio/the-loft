import { extendTailwindMerge } from 'tailwind-merge'

export const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-16',
      ],
      'text-color': [
        'text-white',
        'text-black',
      ],
    },
  },
})
