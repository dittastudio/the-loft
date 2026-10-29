import type { Block } from '#storyblok-schema'

type BlockTypes = NonNullable<Block<'page'>['blocks']>[number]

export { BlockTypes }
