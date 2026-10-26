# Init — Configure a Cloned Starter Project

Run this **after** cloning a repo created from `dittastudio/ditta-nuxt-storyblok-starter` (the `/ditta-template-repository` command handles creation).

Work through the phases in order. Be conversational — summarise what you're about to do, do the work, then confirm before moving on.

When asking questions for data, such as access tokens or name, do not provide other choices of your own. Only seek to obtain the real data needed.

---

## Phase 0: Already configured?

Read `nuxt.config.ts`. If it no longer contains the placeholder `<APP_SITE_NAME>`, this project is already configured — ask the user what they want to re-run (configure files, Storyblok schema, or verify) and skip straight to that phase. Otherwise continue.

## Phase 1: Storyblok MCP token

The Storyblok MCP server needs a personal access token in `.mcp.json` (gitignored; `.mcp.json.example` is the committed template).

Use `AskUserQuestion`:
> "Have you filled in your Storyblok personal access token in `.mcp.json`?"

**If yes** — proceed to Phase 2.

**If no** — use `AskUserQuestion` to collect the **Storyblok personal access token** (the *management* token, not the content delivery token; generate at https://app.storyblok.com/#/me/account under "Personal Access Tokens"). Copy `.mcp.json.example` to `.mcp.json` and write the token into the `Storyblok` entry. Then tell the user to **restart Claude Code** so the MCP server reloads, and re-run `/ditta-template-configure`. **Stop here.**

## Phase 2: Collect project details

Use `AskUserQuestion` to gather everything needed, batching into a single call:

- **Site name** — human-readable, used in SEO and meta (e.g. `Acme Corp`)
- **Site URL** — full URL with protocol, no trailing slash (e.g. `https://acme.com`)
- **Accent color** — hex value (e.g. `#FF5500`)
- **Storyblok Space ID** — numeric ID from the Storyblok dashboard
- **Storyblok content delivery token** — the Preview token for dev; Settings → API Keys in the Storyblok space

## Phase 3: Configure local files

Read each file before editing. Replace every occurrence of each placeholder.

### `nuxt.config.ts`
- `<APP_SITE_NAME>` → site name (appears in `author` meta, `apple-mobile-web-app-title`, and `site.name`)
- `<APP_SITE_URL>` → site URL
- `<APP_ACCENT_COLOR>` → accent hex (appears in `msapplication-TileColor` and `theme-color` meta)
- `<STORYBLOK_SPACE_ID>` → space ID (in the `alias` block)

### `public/site.webmanifest`
- `<APP_SITE_NAME>` → site name
- `<APP_ACCENT_COLOR>` → accent hex

### `.env` (create)
```
NUXT_STORYBLOK_TOKEN=<content delivery token>
NUXT_STORYBLOK_SPACE_ID=<space id>
NUXT_STORYBLOK_VERSION=draft
```

## Phase 4: Storyblok content schema

New Storyblok spaces ship with a default `page` content type (containing a `body` blocks field) plus `feature`, `grid`, and `teaser` block components. We replace these with our own schema.

Use the Storyblok MCP with the Space ID from Phase 2, in this order:

1. **Clean up defaults** — on the existing `page` content type, remove the default `body` field. Then delete the `feature`, `grid`, and `teaser` components from the block library.

2. **`block_text`** — create component (nestable/block). Fields:
   - `text` — richtext

3. **`page`** — modify the existing content type. Add fields:
   - `blocks` — blocks field; add `block_text` to its allowed components
   - Add a tab called **SEO** containing:
     - `seo_title` — text
     - `seo_description` — text
     - `seo_image` — asset

   Then open the existing **Home** story (slug `home`), add a `block_text` block into its `blocks` field, and save.

4. **`settings`** — create content type (singleton). Fields:
   - `site_name` — text

   Then create a story using this `settings` content type (slug `settings`) and populate `site_name` with the site name collected in Phase 2.

## Phase 5: Verify

Tell the user to run:

```
npm install && npm run dev
```

Then in Storyblok:
1. Publish the **Home** story (slug `home`)
2. Check `http://localhost:3000` loads
3. Check `http://localhost:3000/sitemap.xml` responds
