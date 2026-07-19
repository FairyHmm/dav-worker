import { NextcloudBase } from "../base.js";
import { davPath, davUrl } from "./url.js";
import { PROPFIND_BODY, xmlParser, isCollection, mergedProps, propOrNull } from "./xml.js";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number | null;
  contentType: string | null;
  lastModified: string | null;
}

export class WebDAVClient extends NextcloudBase {
  private path(path: string): string {
    return davPath(this.webdavBasePath(), path);
  }

  private url(path: string): string {
    return davUrl(this.host, this.webdavBasePath(), path);
  }

  async list(path: string = "", depth: number = 1): Promise<FileEntry[]> {
    let url = this.path(path);
    if (!url.endsWith("/")) url += "/";

    // Any negative depth means "as deep as it goes" — round trips through
    // DepthSchema as -1, but treat everything below 0 the same way rather
    // than requiring exactly -1.
    const depthHeader = depth < 0 ? "infinity" : String(depth);

    const res = await this.request("PROPFIND", url, {
      headers: { Depth: depthHeader, "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
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
    // Same treatment as the other not-found cases (mkdir's 405, delete's
    // 404): fold the expected failure status into expectStatus and turn it
    // into a clear message, instead of letting the generic
    // `Nextcloud GET path → 404` bubble up from NextcloudBase.request.
    const res = await this.request("GET", this.path(path), {
      expectStatus: [200, 404],
    });
    if (res.status === 404) {
      throw new Error(`File not found: ${path}`);
    }

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
    const res = await this.request("PUT", this.path(path), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: content,
    });

    return { created: res.status === 201 };
  }

  async mkdir(
    path: string,
  ): Promise<{ created: boolean; alreadyExists: boolean }> {
    const res = await this.request("MKCOL", this.path(path), {
      expectStatus: [201, 405],
    });

    if (res.status === 405) return { created: false, alreadyExists: true };
    return { created: true, alreadyExists: false };
  }

  async delete(path: string): Promise<void> {
    await this.request("DELETE", this.path(path), {
      expectStatus: [200, 204, 404],
    });
  }

  async stat(path: string): Promise<FileEntry> {
    const url = this.path(path);

    const res = await this.request("PROPFIND", url, {
      headers: { Depth: "0", "Content-Type": "application/xml" },
      body: PROPFIND_BODY,
    });

    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
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
    const destUrl = this.url(dst);

    const res = await this.request("COPY", this.path(src), {
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
    const destUrl = this.url(dst);

    const res = await this.request("MOVE", this.path(src), {
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
