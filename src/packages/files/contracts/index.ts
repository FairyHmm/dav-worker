// Storage contract for file tools. Backend-agnostic — mirrors WebDAVClient
// surface but doesn't assume Nextcloud.

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
