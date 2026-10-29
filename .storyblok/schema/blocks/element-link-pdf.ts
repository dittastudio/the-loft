import {
  defineBlock,
  defineField,
} from '@storyblok/schema';

import { elementsFolder } from '../folders/elements';

export const elementLinkPdfBlock = defineBlock({
  name: 'element_link_pdf',
  display_name: 'PDF Link',
  is_root: false,
  is_nestable: true,
  folder: elementsFolder,
  fields: [
    defineField('title', { type: 'text', required: true }),
    defineField('preview', { type: 'asset', filetypes: ['texts'], required: true }),
    defineField('download', { type: 'asset', filetypes: ['texts'] }),
  ],
});
