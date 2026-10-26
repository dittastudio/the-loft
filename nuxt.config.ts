import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import svgLoader from 'vite-svg-loader'

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
    ['@nuxt/eslint', {
      config: {
        standalone: false,
        stylistic: true,
        autoInit: false,
      },
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
  ],
  ssr: true,
  devtools: false,
  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
    layoutTransition: false,
    head: {
      htmlAttrs: {
        lang: 'en-GB',
      },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'author', content: '<APP_SITE_NAME>' },
        { name: 'msapplication-TileColor', content: '<APP_ACCENT_COLOR>' },
        { name: 'theme-color', content: '<APP_ACCENT_COLOR>' },
        { name: 'apple-mobile-web-app-title', content: '<APP_SITE_NAME>' },
        { 'http-equiv': 'content-language', 'content': 'en-GB' },
      ],
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },
  css: ['~/assets/css/app.css'],
  site: {
    url: '<APP_SITE_URL>',
    name: '<APP_SITE_NAME>',
  },
  runtimeConfig: {
    STORYBLOK_SPACE_ID: process.env.NUXT_STORYBLOK_SPACE_ID,
    public: {
      STORYBLOK_TOKEN: process.env.NUXT_STORYBLOK_TOKEN,
      STORYBLOK_VERSION: process.env.NUXT_STORYBLOK_VERSION,
    },
  },
  alias: {
    '#storyblok-components': fileURLToPath(new URL('./.storyblok/types/<STORYBLOK_SPACE_ID>/storyblok-components', import.meta.url)),
    '#storyblok-types': fileURLToPath(new URL('./.storyblok/types/storyblok', import.meta.url)),
  },
  routeRules: {
    '/**': { prerender: process.env.NUXT_PRERENDER === 'true' },
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
      devtoolsJson(),
      tailwindcss(),
      svgLoader({
        svgo: false,
      }),
    ],
  },
  postcss: {
    plugins: {
      'postcss-nested': {},
    },
  },
  linkChecker: {
    skipInspections: ['no-uppercase-chars', 'link-text'],
  },
})
