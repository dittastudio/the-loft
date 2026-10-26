import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { blocksFolder } from '../folders/blocks';

export const blockHeroBlock = defineBlock({
  name: 'block_hero',
  display_name: 'Hero',
  is_root: false,
  is_nestable: true,
  folder: blocksFolder,
  fields: [
    defineField('image', { type: 'asset', filetypes: ['images'] }),
    defineField('collaboration', { type: 'textarea' }),
  ],
});
