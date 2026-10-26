import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { blocksFolder } from '../folders/blocks';

export const blockTextBlock = defineBlock({
  name: 'block_text',
  display_name: 'Text',
  is_root: false,
  is_nestable: true,
  folder: blocksFolder,
  fields: [
    defineField('text', { type: 'richtext' }),
  ],
});
