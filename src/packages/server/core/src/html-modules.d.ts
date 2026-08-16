// Ambient module for the .html text loader in app/worker's build.mts (text
// import of the built config SPA — see resources.ts).
declare module "*.html" {
  const content: string;
  export default content;
}
