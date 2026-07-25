# dav-worker

A Cloudflare Worker exposing a remote MCP server (streamable-http) backed by
a Nextcloud instance — file (WebDAV) and calendar (CalDAV) tools, callable
from Claude Desktop, claude.ai, or any MCP client.

No database, no KV, no Durable Objects, no persistent process. Every tool
call is a fresh outbound request to your Nextcloud instance; auth is fully
stateless.

## What it does

- **Files** — list, read, write, move, copy, mkdir, delete, stat, outline.
  Reads/writes support targeting a single Markdown heading block or a raw
  line range, not just whole-file. Named `location` shortcuts resolve to
  vault paths so you don't have to type full paths for common places.
- **Calendar** — list, create, update, delete events; find free/busy slots.

## Architecture

This is a pnpm monorepo. `src/app/*` are the two composition roots (nothing
else may branch on which one you're in); `src/packages/*/*` are domain
packages with narrow, platform-agnostic exports.

```
src/
├─ app/
│  ├─ worker/    ← Cloudflare Worker: OAuth + consent screen + /mcp (streamable-http)
│  └─ local/     ← stdio MCP server for local dev — no OAuth, reads creds from env
└─ packages/
   ├─ auth/upstream/        ← the one sanctioned cross-domain dependency
   ├─ calendar/{contracts,ical,tools}
   ├─ files/{contracts,locations,parser,tools}
   ├─ clients/webdav/       ← raw WebDAV transport
   └─ storage/nextcloud/    ← WebDAV + CalDAV storage built on clients/webdav
```

Package boundaries are enforced by pnpm workspace deps, not just tree-shaking.

## Auth

No `workers-oauth-provider`, no OAUTH_KV, no grant store. Every token
(client registration, auth code, access token) is a self-contained
AES-256-GCM sealed blob — valid iff it decrypts. The consent screen at
`/authorize` collects your Nextcloud host/username/app-password and the
vault paths to your `locations.toml`/`calendars.toml`, seals them into the
access token the client holds, and nothing is stored server-side.

Access tokens don't expire by design — the real revocation lever is
rotating a Nextcloud app password (or `TOKEN_KEY`, which invalidates every
outstanding token at once).

## Setup

**Deploy (Worker, for use from claude.ai / Claude Desktop remotely):**

```bash
pnpm install
wrangler secret put TOKEN_KEY -c src/app/worker/wrangler.jsonc   # random 32+ byte secret
pnpm deploy
```

Then in your MCP client, add the deployed `/mcp` URL and go through the
`/authorize` consent screen once — no other configuration needed.

**Local dev (stdio, no OAuth):**

```bash
cd src/app/local
cp .dev.vars.example .dev.vars   # fill in NEXTCLOUD_HOST / _USERNAME / _PASSWORD
pnpm install
pnpm start
```

Without `LOCATIONS_CONFIG_PATH` / `CALENDARS_CONFIG_PATH` set, it falls back
to the bundled fixtures in `src/app/local/fixtures/` so you can try it
before setting up real config files on your Nextcloud.

## Development

```bash
pnpm type-check   # tsc --noEmit
pnpm lint:fix      # oxlint --fix
pnpm format       # oxfmt --write .
```

Run `wrangler types -c src/app/worker/wrangler.jsonc ...` after changing
bindings in `wrangler.jsonc`.
