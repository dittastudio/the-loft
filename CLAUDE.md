# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The Loft (the-loft.com): a Nuxt 4 marketing site with content from Storyblok, prerendered as a static site and deployed to Netlify. It follows Ditta Studio conventions, so load the `ditta-conventions` skill when writing components, composables or CSS.

## Commands

- `npm run dev`: dev server on `0.0.0.0:3000`. `npm run dev:ssl` proxies it to `https://localhost:3010`, which the Storyblok visual editor needs; it expects `localhost.pem` and `localhost-key.pem` in the root.
- `npm run generate`: static prerender. `npm run build` and `npm run preview` are the SSR equivalents.
- `npx vp check`: format, lint and type check (Vite+ runs oxfmt and oxlint with type-aware checks). `npx vp check --fix` fixes what it can. The pre-commit hook runs it on staged `js/ts/vue` files.
- `npx vp fmt` and `npx vp lint` run the format and lint steps on their own.
- There is no test suite.

Commits must follow Conventional Commits (commitlint runs on `commit-msg`), e.g. `fix: ...`, `feat: ...`.

Environment variables (see `.env.example`): `NUXT_STORYBLOK_TOKEN`, `NUXT_STORYBLOK_VERSION` (`draft` or `published`), and `IS_SPA`. Setting `IS_SPA=true` turns off SSR, prerendering and link crawling.

## Storyblok schema as code

Storyblok components are defined in TypeScript in `.storyblok/schema/`, not in the Storyblok UI:

- Use one file per block in `blocks/`, built with `defineBlock` and `defineField` from `@storyblok/schema`. Use one file per component folder in `folders/`. Register each block in `schema.ts`.
- `schema.ts` also exports the types the app uses, through the `#storyblok-schema` alias. Type a block's props with `Block<'block_name'>`.
- Block names use snake_case with a prefix: `block_*` for page sections, which go in the `blocks` folder, and `element_*` for smaller pieces. `page` and `settings` are the root content types.
- Workflow: edit the schema, run `npm run sb:schema-validate`, then `npm run sb:schema-diff` (a dry run), then `npm run sb:schema-push`. Pushing writes changesets and reports into `.storyblok/`. `sb:schema-rollback` reverts a push. Content migrations use the `sb:migrations-*` scripts. Run `npm run sb:login` first.
- Pushing changes the shared Storyblok space (`296151434062627`), so confirm with the user before running `sb:schema-push`, `sb:schema-rollback` or `sb:migrations-run`.

## Rendering pipeline

- `app/pages/[...slug].vue` is the only page. It loads the story for the route with `useStory`, sets SEO meta from the `seo_*` fields on the page, and renders `TemplatePage` when `isPage(story)` is true.
- `app/app.vue` loads the `/settings` story for global navigation, and adds `is-storyblok-editor` to `<html>` while the page is open in the visual editor.
- `useStory` (`app/composables/useStory.ts`) wraps `useAsyncStoryblok`. It picks draft or published content from `NUXT_STORYBLOK_VERSION`, supports `?_storyblok_release`, and throws a 404 when it fails. `storyblokSlug` maps `/` to the `home` story.
- `TemplatePage` dispatches each `story.content.blocks` item to its `Block*` component with an explicit `v-if` on `block.component`. Storyblok's dynamic component resolution is not used. A new block needs a schema file, a component in `app/components/block/`, and a branch in `app/components/template/Page.vue`.
- Block components take a single `block` prop and put `v-editable="block"` on their root element.
- `app/utils/storyblok.ts` holds the Storyblok helpers: image URLs and dimensions, asset type detection, PDF links, and checks for empty rich text. Storyblok assets that are fetched from JS (pdf.js, for example) must go through `storyblokCorsUrl`, because only `a2.storyblok.com` sends CORS headers.
- `server/api/sitemap.get.ts` builds the sitemap from the published stories.

## Styling

- The project uses Tailwind v4, configured in CSS in `app/assets/css/app.css`. The theme resets colours, spacing (`4px` units), font sizes (`text-16`, `text-20`, `text-24`) and breakpoints. Use only the tokens defined there.
- Breakpoints are defined twice in `app.css`: as `--breakpoint-*` for Tailwind and as `--bp-*`, which `app/utils/screens.ts` reads from JS. Keep the two in sync.
- The layout grid uses the CSS variables `--app-columns`, `--app-gutter-outer` and `--app-gutter-inner`. `DevGuide` (dev only) overlays the grid.
- PostCSS runs `postcss-nested` and `postcss-utopia`, which provides fluid `utopia.clamp(min, max)` sizing between widths of 375px and 1800px.
- If you add custom font-size or text-colour utilities, extend `app/utils/twMerge.ts` so class merging resolves them. `useMergedAttrs` merges a component's own classes with the classes passed in by its parent.
- SVGs import as components with `?component` (vite-svg-loader, with SVGO turned off).

## Hero box-turn animation

`useBoxTurn` (`app/composables/useBoxTurn.ts`) drives the hero image. It computes a `clip-path` that draws a rotating 3D cube outline. The cube follows the cursor, spins on its own when idle, tumbles when the page scrolls or is swiped, and can be dragged or poked. The pure geometry it relies on (matrices, perspective projection, blending of convex shapes) lives in `app/utils/boxTurn/geometry.ts`, which has no Vue dependencies. Every option and constant has an inline comment describing its units and meaning; keep that style when you change them.

## Formatting

oxfmt formats the code: no semicolons, single quotes, one attribute per line in Vue templates, and a 120-character line width. It skips `.storyblok/`.
