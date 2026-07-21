// FileStorage is the contract `files/tools/*` codes against — implemented
// by `storage/nextcloud/webdav.ts` today, satisfiable by any future
// backend (e.g. a local-fs MCP) without `files/*` importing anything
// Nextcloud-specific. Shape mirrors the existing WebDAVClient surface
// (src/clients/webdav/index.ts) since that's the behavior already proven
// against SPEC-FILES.md/SPEC-LOCATIONS.md — this contract doesn't invent
// new semantics, it just names the existing ones.

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  contentType: string | null;
  lastModified: string | null;
}

export interface FileStorage {
  list(path?: string, depth?: number): Promise<FileEntry[]>;

  read(path: string): Promise<{ content: string; contentType: string }>;

  write(path: string, content: string): Promise<{ created: boolean }>;

  delete(path: string): Promise<void>;

  stat(path: string): Promise<FileEntry>;

  copy(
    src: string,
    dst: string,
    force: boolean,
  ): Promise<{ copied: boolean; conflict?: FileEntry }>;

  move(
    src: string,
    dst: string,
    force: boolean,
  ): Promise<{ moved: boolean; conflict?: FileEntry }>;

  mkdir(path: string): Promise<{ created: boolean; alreadyExists: boolean }>;
}
