import type { McpServer } from "@modelcontextprotocol/server";

export function defineResource(
  server: McpServer,
  ui: string,
  text: string,
  script?: string,
): void {
  const uri = `ui://${ui}`;
  // A single-file document has no other channel for runtime state, so inline
  // it into the head, before the app module script that reads it.
  const html = script ? text.replace("</head>", `${script}</head>`) : text;

  server.registerResource(ui, uri, { mimeType: "text/html" }, () => ({
    contents: [{ uri, mimeType: "text/html", text: html }],
  }));
}
