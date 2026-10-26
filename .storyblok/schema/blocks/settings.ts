import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

export const settingsBlock = defineBlock({
  name: 'settings',
  is_root: true,
  is_nestable: false,
  fields: [],
});
