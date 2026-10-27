import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import svgLoader from 'vite-svg-loader'

const isSpa = process.env.IS_SPA === 'true'

export default defineNuxtConfig({
  modules: [
    ['@nuxtjs/seo', {
      sitemap: {
        excludeAppSources: true,
        sources: [
          '/api/sitemap',
        ],
      }
    }],
    ['@nuxt/image', {
      provider: 'storyblok',
      storyblok: {
        baseURL: 'https://a2.storyblok.com',
        modifiers: {
          smart: true,
        },
      },
      format: ['webp'],
      domains: ['storyblok.com', 'raw.london'],
      quality: 85,
      screens: {
        '2xs': 375,
        'xs': 480,
        'sm': 600,
        'md': 800,
        'lg': 1200,
        'xl': 1440,
        '2xl': 1800,
      }
    }],
    ['@storyblok/nuxt', {
      accessToken: process.env.NUXT_STORYBLOK_TOKEN
    }],
    'nuxt-ai-ready',
    '@nuxt/fonts',
    '@vueuse/nuxt',
  ],
  fonts: {
    families: [
      { name: 'EB Garamond', provider: 'google', weights: [400], styles: ['italic'] },
    ],
  },
  ssr: !isSpa,
  devtools: false,
  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
    layoutTransition: false,
    head: {
      htmlAttrs: {
        lang: 'en-GB',
      },
      meta: [
        { name: 'author', content: 'The Loft' },
        { name: 'msapplication-TileColor', content: '#284390' },
        { name: 'theme-color', content: '#284390' },
        { name: 'apple-mobile-web-app-title', content: 'The Loft' },
        { 'http-equiv': 'content-language', 'content': 'en-GB' },
      ],
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'preload', href: '/fonts/UniversPro57Condensed.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
      ],
    },
  },
  css: ['~/assets/css/app.css'],
  site: {
    url: 'https://the-loft.com',
    name: 'The Loft',
  },
  seo: {
    automaticOgAndTwitterTags: false,
  },
  runtimeConfig: {
    STORYBLOK_SPACE_ID: process.env.NUXT_STORYBLOK_SPACE_ID,
    public: {
      STORYBLOK_TOKEN: process.env.NUXT_STORYBLOK_TOKEN,
      STORYBLOK_VERSION: process.env.NUXT_STORYBLOK_VERSION,
    },
  },
  alias: {
    '#storyblok-schema': fileURLToPath(new URL('./.storyblok/schema/schema', import.meta.url)),
  },
  routeRules: {
    '/**': {
      prerender: !isSpa,
    },
  },
  nitro: {
    experimental: {
      wasm: true, // ...for Cloudflare Workers
    },
    prerender: {
      crawlLinks: !isSpa,
      routes: isSpa ? [] : ['/'],
      autoSubfolderIndex: false,
      ignore: [(route) => route.includes('?')],
    },
  },
  compatibilityDate: '2026-02-10',
  vite: {
    optimizeDeps: {
      include: [
        '@storyblok/vue',
        '@tiptap/core',
        'tailwind-merge',
      ],
    },
    plugins: [
      tailwindcss(),
      svgLoader({
        svgo: false,
      }),
    ],
  },
  postcss: {
    plugins: {
      'postcss-nested': {},
      'postcss-utopia': {
        minWidth: 375,
        maxWidth: 1800,
      },
    },
  },
  linkChecker: {
    skipInspections: ['no-uppercase-chars', 'link-text'],
  },
})
