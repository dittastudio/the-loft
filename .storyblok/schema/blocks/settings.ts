import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { typesFolder } from '../folders/types';

export const settingsBlock = defineBlock({
  name: 'settings',
  is_root: true,
  is_nestable: false,
  folder: typesFolder,
  fields: [
    defineField('navigation', { type: 'bloks', allow: ['element_link'] }),
    defineField('collaboration', { type: 'textarea' }),
  ],
});
