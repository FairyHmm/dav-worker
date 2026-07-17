import { XMLParser } from "fast-xml-parser";
import { NextcloudBase } from "./base.js";

const PROPFIND_BODY = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
    <d:getcontentlength/>
    <d:getcontenttype/>
    <d:getlastmodified/>
    <d:displayname/>
  </d:prop>
</d:propfind>`;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

// fast-xml-parser parses an empty self-closing tag like `<d:collection/>`
// into `""`, not `true` — a truthiness check on the value is always false.
// Presence of the key is what indicates a directory.
function isCollection(prop: any): boolean {
  return !!prop?.resourcetype && "collection" in prop.resourcetype;
}

// Nextcloud splits a <d:response> into multiple <d:propstat> blocks when
// some requested properties don't apply (e.g. a directory has no
// getcontentlength, so that prop comes back in its own 404 propstat).
// Merge every propstat's props together instead of assuming a single one.
function mergedProps(r: any): any {
  const propstats: any[] = [].concat(r.propstat ?? []);
  return propstats.reduce((acc, ps) => Object.assign(acc, ps?.prop ?? {}), {});
}

// A missing/inapplicable prop parses to `""`, not undefined/null — normalize
// it so callers can use straightforward null-checks.
function propOrNull(value: unknown): string | null {
  return value === "" || value == null ? null : String(value);
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  contentType: string | null;
  lastModified: string | null;
}

export class WebDAVClient extends NextcloudBase {
  private davPath(path: string): string {
    const clean = path.replace(/^\/+/, "");
    return `${this.webdavBasePath()}/${encodeURIComponent(clean)}`;
  }

  private davPathNoEncode(path: string): string {
    const clean = path.replace(/^\/+/, "");
    return `${this.webdavBasePath()}/${clean}`;
  }

  async list(path: string = "", depth: number = 1): Promise<FileEntry[]> {
    let url = this.davPathNoEncode(path);
    if (!url.endsWith("/")) url += "/";

    const depthHeader = depth === -1 ? "infinity" : String(depth);

    const res = await this.request("PROPFIND", url, {
      headers: { Depth: depthHeader, "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const responses: any[] = [].concat(parsed.multistatus?.response ?? []);

    const basePath = this.webdavBasePath();

    // Skip first entry (the directory itself)
    return responses.slice(1).map((r: any) => {
      const href: string = r.href ?? "";
      const decodedHref = decodeURIComponent(href.replace(/\/$/, ""));
      const name = decodedHref.split("/").pop() ?? "";

      // Derive the vault-relative path from the href itself, rather than
      // concatenating the queried path + name — this stays correct for
      // nested entries returned by depth > 1 / infinity.
      let relPath = decodedHref;
      const baseIdx = decodedHref.indexOf(basePath);
      if (baseIdx !== -1) {
        relPath = decodedHref.slice(baseIdx + basePath.length).replace(/^\/+/, "");
      }

      const prop = mergedProps(r);

      return {
        name,
        path: relPath,
        isDirectory: isCollection(prop),
        size: prop.getcontentlength ? Number(prop.getcontentlength) : null,
        contentType: propOrNull(prop.getcontenttype),
        lastModified: propOrNull(prop.getlastmodified),
      };
    });
  }

  async read(path: string): Promise<{ content: string; contentType: string }> {
    const res = await this.request("GET", this.davPathNoEncode(path));

    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";

    // Binary file guard
    if (
      !contentType.startsWith("text/") &&
      contentType !== "application/json"
    ) {
      throw new Error(
        `Binary files cannot be read as text (Content-Type: ${contentType}).`,
      );
    }

    const content = await res.text();
    return { content, contentType };
  }

  async write(path: string, content: string): Promise<{ created: boolean }> {
    const res = await this.request("PUT", this.davPathNoEncode(path), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: content,
    });

    return { created: res.status === 201 };
  }

  async mkdir(
    path: string,
  ): Promise<{ created: boolean; alreadyExists: boolean }> {
    const res = await this.request("MKCOL", this.davPathNoEncode(path), {
      expectStatus: [201, 405],
    });

    if (res.status === 405) return { created: false, alreadyExists: true };
    return { created: true, alreadyExists: false };
  }

  async delete(path: string): Promise<void> {
    await this.request("DELETE", this.davPathNoEncode(path), {
      expectStatus: [200, 204, 404],
    });
  }

  async stat(path: string): Promise<FileEntry> {
    const url = this.davPathNoEncode(path);

    const res = await this.request("PROPFIND", url, {
      headers: { Depth: "0", "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });

    const xml = await res.text();
    const parsed = parser.parse(xml);
    const responses: any[] = [].concat(parsed.multistatus?.response ?? []);
    const r = responses[0];
    if (!r) throw new Error(`No stat response for: ${path}`);

    const href: string = r.href ?? "";
    const name = decodeURIComponent(
      href.replace(/\/$/, "").split("/").pop() ?? "",
    );
    const prop = mergedProps(r);

    return {
      name,
      path,
      isDirectory: isCollection(prop),
      size: prop.getcontentlength ? Number(prop.getcontentlength) : null,
      contentType: propOrNull(prop.getcontenttype),
      lastModified: propOrNull(prop.getlastmodified),
    };
  }

  async copy(
    src: string,
    dst: string,
    force: boolean,
  ): Promise<{ copied: boolean; conflict?: FileEntry }> {
    const destUrl = `${this.host}${this.webdavBasePath()}/${dst.replace(/^\/+/, "")}`;

    const res = await this.request("COPY", this.davPathNoEncode(src), {
      headers: {
        Destination: destUrl,
        Overwrite: force ? "T" : "F",
      },
      expectStatus: [201, 204, 412],
    });

    if (res.status === 412) {
      const meta = await this.stat(dst);
      return { copied: false, conflict: meta };
    }

    return { copied: true };
  }

  async move(
    src: string,
    dst: string,
    force: boolean,
  ): Promise<{ moved: boolean; conflict?: FileEntry }> {
    const destUrl = `${this.host}${this.webdavBasePath()}/${dst.replace(/^\/+/, "")}`;

    const res = await this.request("MOVE", this.davPathNoEncode(src), {
      headers: {
        Destination: destUrl,
        Overwrite: force ? "T" : "F",
      },
      expectStatus: [201, 204, 412],
    });

    if (res.status === 412) {
      // Destination exists and force is false — return conflict metadata
      const meta = await this.stat(dst);
      return { moved: false, conflict: meta };
    }

    return { moved: true };
  }
}
