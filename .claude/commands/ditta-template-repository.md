# New — Create a Ditta Nuxt Storyblok Respository

Create a new repo from the `dittastudio/ditta-nuxt-storyblok-starter` template and clone it locally. Configuration happens afterwards via the in-project `/ditta-template-configure` command.

This command uses the `gh` CLI so no MCP setup is required up front.

---

## Phase 0: Context check

This command is intended to be run from the **template repo** (`dittastudio/ditta-nuxt-storyblok-starter`) or from a directory with no starter project at all. Running it from inside a clone that was created from the template is almost always a mistake — in that case you want `/ditta-template-configure` instead.

Run via Bash:

```
git remote get-url origin 2>/dev/null || true
```

- If the output contains `dittastudio/ditta-nuxt-storyblok-starter` — this is the template repo itself. Continue to Phase 1.
- If the output is empty or points anywhere else, **and** `nuxt.config.ts` exists at the cwd — this is a clone made from the template. Warn the user:

  > You appear to be inside a project that was cloned from the starter template (`origin` is `<url>`). `/ditta-template-repository` creates a *new* project from the template — you probably want `/ditta-template-configure` to finish configuring this one. Continue anyway?

  Use `AskUserQuestion` to get explicit confirmation before proceeding. If the user declines, stop.
- If neither condition applies (no `origin`, no `nuxt.config.ts`) — treat as a clean directory and continue.

## Phase 1: Prerequisites

Run `gh auth status` via Bash.

- If the user isn't authenticated, tell them to run `gh auth login` and stop.
- If they are authenticated but not a member of `dittastudio` with repo-create rights, `gh` will return a clear error in Phase 3 — relay it and stop.

## Phase 2: Collect repo name

Use `AskUserQuestion` to ask for the **GitHub repo name** — kebab-case slug used as both the repo name and the local directory (e.g. `acme-website`). Reject anything that isn't kebab-case and ask again.

## Phase 3: Create and clone

Run via Bash, substituting the name from Phase 2:

```
gh repo create dittastudio/<repo-name> \
  --template dittastudio/ditta-nuxt-storyblok-starter \
  --private \
  --clone
```

`--clone` drops the new repo into `./<repo-name>` relative to the current working directory.

If the command fails, surface the error verbatim and stop — do not retry with different flags.

## Phase 4: Hand off

Tell the user:

> Repo created and cloned into `./<repo-name>`. Open a new Claude Code session in that directory and run `/ditta-template-configure` to finish setup (local files, `.env`, and Storyblok schema).

**Stop here.** The project-local `.mcp.json` and Storyblok credentials live inside the cloned repo and are the `/init` command's responsibility.
