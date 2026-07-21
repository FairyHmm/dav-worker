// Wrangler's `Text` module rule (wrangler.jsonc) imports *.toml as a raw
// string at build time. Duplicated from files/locations' copy rather than
// shared: this package never imports a .toml file itself, but its
// standalone `tsc -p` compile transitively pulls in
// @dav-worker/files-locations' `files.ts` (which does), and ambient
// declarations only take effect for a compilation that discovers them as
// a root file via its own tsconfig "include" — which only globs this
// package's own directory.
declare module "*.toml" {
  const content: string;
  export default content;
}
