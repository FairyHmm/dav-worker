// Wrangler's `Text` module rule (wrangler.jsonc) imports *.toml as a raw
// string at build time — this just tells TS what that import resolves to.
declare module "*.toml" {
  const content: string;
  export default content;
}
