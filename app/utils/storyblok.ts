import type { Block } from '#storyblok-schema'
import type { ImageModifiers } from '@nuxt/image'
import type { AssetFieldValue } from '@storyblok/schema'
import type { ISbStoryData } from '@storyblok/js'
import type { LocationQuery } from 'vue-router'

const isVisualEditor = (search: LocationQuery) => '_storyblok' in search

const storyblokPdf = (asset: AssetFieldValue | null | undefined): string | null => {
  const url = asset?.filename

  return url?.toLowerCase().endsWith('.pdf') ? url : null
}

// a.storyblok.com sends no CORS headers, a2.storyblok.com does. Needed for fetching assets from JS (e.g. pdf.js).
const storyblokCorsUrl = (url: string): string => url.replace('//a.storyblok.com/', '//a2.storyblok.com/')

const storyblokSlug = (path: string): string => (['', '/'].includes(path) ? '/home' : path.replace(/\/+$/, ''))

type Page = Block<'page'>

type ContentTypes = Page

const isPage = (story: ISbStoryData<ContentTypes> | null | undefined): story is ISbStoryData<Page> =>
  Boolean(story?.content?.component === 'page')

const storyblokImage = (filename: string | null | undefined, modifiers?: Partial<ImageModifiers>): string => {
  const image = useImage()

  const path = image(filename ?? '', {
    width: 0,
    height: 0,
    smart: false,
    quality: 80,
    blur: 0,
    format: 'webp',
    ...modifiers,
  })

  return path
}

export { isPage, storyblokCorsUrl, isVisualEditor, storyblokImage, storyblokPdf, storyblokSlug }
