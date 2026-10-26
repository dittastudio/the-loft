import { defineSchema } from '@storyblok/schema';
import type { Schema as InferSchema, Story as InferStory } from '@storyblok/schema';
import type { BlockContent, MapiStory as InferStoryMapi } from '@storyblok/schema';

import { blockTextBlock } from './blocks/block-text';
import { blocksBlock } from './blocks/blocks';
import { pageBlock } from './blocks/page';
import { settingsBlock } from './blocks/settings';
import { blocksFolder } from './folders/blocks';

export const schema = defineSchema({
  blocks: {
    blockTextBlock,
    blocksBlock,
    pageBlock,
    settingsBlock,
  },
  folders: {
    blocksFolder,
  },
});

export type Schema = InferSchema<typeof schema>;
export type Blocks = Schema['blocks'];
export type FieldPlugins = Schema['fieldPlugins'];
export type Story = InferStory<Blocks, FieldPlugins>;
export type StoryMapi = InferStoryMapi<Blocks, FieldPlugins>;

// Type a component's props by block name: `Block<"hero">`.
export type Block<TName extends Blocks['name']> = BlockContent<
  Extract<Blocks, { name: TName }>,
  Blocks,
  FieldPlugins
>;

// Loose union of every block's content, for a dynamic component dispatcher.
export type AnyBlock = BlockContent<Blocks, Blocks, FieldPlugins>;
