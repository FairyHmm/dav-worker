# dav-worker

dav-worker is an MCP server for Nextcloud, running on Cloudflare Workers.

It gives MCP clients access to your Nextcloud files, calendars, and tasks. The hosted server doesn't keep a database or store your Nextcloud data; authentication and access are handled per client session.

## Try it

Add the following endpoint to your MCP client:

```
https://dav-worker.fairyhmm.workers.dev/mcp
```

You'll be asked for your Nextcloud host, username, and app password. After signing in, your client keeps the access token for subsequent requests.

## Features

| Category     | Group       | Tools                                        |
| ------------ | ----------- | -------------------------------------------- |
| **Files**    | `file_`     | `read`, `write`, `outline`                   |
|              | `dir_`      | `list`, `create`                             |
|              | `entry_`    | `copy`, `move`, `delete`, `stat`             |
| **Calendar** | `schedule_` | `list`, `create`, `update`, `delete`, `free` |
| **Tasks**    | `list_`     | `all`, `create`, `delete`                    |
|              | `task_`     | `list`, `create`, `update`, `delete`         |

Files can be read and written at the section level, so changing part of a document doesn't require replacing the whole file. Tools can also batch operations over several items in a single call.

Common locations and calendars can be given short names through a `config.toml` stored on your Nextcloud. A default location is provided during sign-in, and the path can be changed if needed. See the example [`config.toml`](src/app/worker/fixtures/config.toml).

## Self-hosting

dav-worker runs on Cloudflare Workers and can be deployed to your own account:

```bash
pnpm install
wrangler secret put TOKEN_KEY -c src/app/worker/wrangler.jsonc
pnpm deploy
```

Then add your deployed `/mcp` endpoint to your MCP client.

## Local development

The repository also includes a local stdio server for development. It doesn't use OAuth:

```bash
cd src/app/local
cp .dev.vars.example .dev.vars
pnpm install
pnpm start
```

If `CONFIG_PATH` isn't set, the local server uses the bundled fixture at `src/app/local/fixtures/config.toml`.

## Architecture

The repository is a pnpm monorepo with two server entry points:
- Cloudflare Worker — remote MCP server with OAuth
- Local server — stdio MCP server for development

Both use the same domain packages for files, calendars, tasks, batching, storage, authentication, configuration, and related tooling.

Package boundaries are enforced through pnpm workspace dependencies.

## Development

```bash
pnpm type-check   # tsc --noEmit
pnpm lint:fix     # oxlint --fix
pnpm format       # oxfmt --write .
pnpm test         # vitest
```

Run `wrangler types` after changing bindings in `wrangler.jsonc`.
