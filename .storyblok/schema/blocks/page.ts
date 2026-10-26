import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { blocksFolder } from '../folders/blocks';

export const pageBlock = defineBlock({
  name: 'page',
  is_root: true,
  is_nestable: false,
  fields: [
    defineField('blocks', { type: 'bloks', allow: [blocksFolder] }),
    defineField('tab-settings', {
      type: 'tab',
      display_name: 'Settings',
      keys: ['seo_title', 'seo_description', 'seo_image'],
    }),
    defineField('seo_title', { type: 'text', display_name: 'SEO Title' }),
    defineField('seo_description', { type: 'text', display_name: 'SEO Description' }),
    defineField('seo_image', { type: 'asset', display_name: 'SEO Image', filetypes: ['images'] }),
  ],
});
