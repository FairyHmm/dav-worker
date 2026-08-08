// Ambient module for the .html loader in build.mts's esbuild config (text
// import of the built consent SPA — see server.ts).
declare module "*.html" {
  const content: string;
  export default content;
}
