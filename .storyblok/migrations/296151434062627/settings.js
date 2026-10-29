// Swaps the Info navigation link for a PDF Link, using its current PDF as the preview.
const preview = {
  id: 234870921511671,
  alt: '',
  name: '',
  focus: '',
  title: '',
  filename: 'https://a.storyblok.com/f/296151434062627/x/8239e392bd/the-loft.pdf',
  copyright: '',
  fieldtype: 'asset',
  is_external_url: false,
}

const download = {
  id: null,
  alt: null,
  name: '',
  focus: null,
  title: null,
  filename: '',
  copyright: null,
  fieldtype: 'asset',
}

export default function (block) {
  block.navigation = (block.navigation ?? []).map((item) =>
    item.component === 'element_link' && item.title === 'Info'
      ? { _uid: item._uid, component: 'element_link_pdf', title: item.title, preview, download }
      : item,
  )

  return block
}
