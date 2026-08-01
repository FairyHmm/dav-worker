// Wrangler's `Text` module rule (wrangler.jsonc) imports *.toml and *.csv
// as raw strings at build time — this just tells TS what those imports
// resolve to.
declare module "*.toml" {
  const content: string;
  export default content;
}

declare module "*.csv" {
  const content: string;
  export default content;
}
