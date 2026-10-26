import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { elementsFolder } from '../folders/elements';

export const elementLinkBlock = defineBlock({
  name: 'element_link',
  display_name: 'Link',
  is_root: false,
  is_nestable: true,
  folder: elementsFolder,
  fields: [
    defineField('title', { type: 'text', required: true }),
    defineField('link', {
      type: 'multilink',
      required: true,
      asset_link_type: true,
      allow_target_blank: true,
    }),
  ],
});
