// Nextcloud-specific adapter over @dav-worker/clients-webdav, implementing
// FileStorage from @dav-worker/files-contracts. Behavior ported unchanged
// from the pre-restructure src/clients/webdav/index.ts (WebDAVClient) —
// this move is a re-homing, not a rewrite.

import type { Credential } from "@dav-worker/auth-upstream";
import type { FileEntry, FileStorage } from "@dav-worker/files-contracts";
import {
  davPath,
  davUrl,
  PROPFIND_BODY,
  parseResponses,
  isCollection,
  mergedProps,
  propOrNull,
} from "@dav-worker/clients-webdav";
import { checkReadable } from "@dav-worker/files-types";
import { createNextcloudTransport } from "./utils.js";

export function createNextcloudWebDAVStorage(
  credential: Credential,
): FileStorage {
  const { transport, cred } = createNextcloudTransport(credential);
  const basePath = `/remote.php/dav/files/${cred.username}`;

  const path = (p: string) => davPath(basePath, p);
  const url = (p: string) => davUrl(cred.host, basePath, p);

  function parseEntry(href: string, prop: any, fallbackPath?: string): FileEntry {
    const decodedHref = decodeURIComponent(href.replace(/\/$/, ""));
    const name = decodedHref.split("/").pop() ?? "";

    let relPath = fallbackPath ?? decodedHref;
    if (fallbackPath === undefined) {
      const baseIdx = decodedHref.indexOf(basePath);
      if (baseIdx !== -1) {
        relPath = decodedHref
          .slice(baseIdx + basePath.length)
          .replace(/^\/+/, "");
      }
    }

    return {
      name,
      path: relPath,
      isDirectory: isCollection(prop),
      size: prop.getcontentlength ? Number(prop.getcontentlength) : null,
      contentType: propOrNull(prop.getcontenttype),
      lastModified: propOrNull(prop.getlastmodified),
    };
  }

  return {
    async list(p = "", depth = 1) {
      let reqUrl = path(p);
      if (!reqUrl.endsWith("/")) reqUrl += "/";
      const depthHeader = depth < 0 ? "infinity" : String(depth);

      const res = await transport.request("PROPFIND", reqUrl, {
        headers: { Depth: depthHeader, "Content-Type": "application/xml" },
        body: PROPFIND_BODY,
      });

      const responses = parseResponses(await res.text());
      return responses.slice(1).map((r) => parseEntry(r.href, mergedProps(r)));
    },

    async read(p) {
      const res = await transport.request("GET", path(p));

      const { readable, contentType } = checkReadable(
        p,
        res.headers.get("content-type"),
      );
      if (!readable) {
        throw new Error(
          `Binary files cannot be read as text (Content-Type: ${contentType}).`,
        );
      }
      return { content: await res.text(), contentType };
    },

    async write(p, content) {
      const res = await transport.request("PUT", path(p), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: content,
      });
      return { created: res.status === 201 };
    },

    async delete(p) {
      await transport.request("DELETE", path(p), {
        expectStatus: [200, 204, 404],
      });
    },

    async stat(p) {
      const res = await transport.request("PROPFIND", path(p), {
        headers: { Depth: "0", "Content-Type": "application/xml" },
        body: PROPFIND_BODY,
      });
      const responses = parseResponses(await res.text());
      const r = responses[0];
      if (!r) throw new Error(`No stat response for: ${p}`);
      return parseEntry(r.href, mergedProps(r), p);
    },

    async copy(src, dst, force) {
      const res = await transport.request("COPY", path(src), {
        headers: { Destination: url(dst), Overwrite: force ? "T" : "F" },
        expectStatus: [201, 204, 412],
      });
      if (res.status === 412) {
        return { copied: false, conflict: await this.stat(dst) };
      }
      return { copied: true };
    },

    async move(src, dst, force) {
      const res = await transport.request("MOVE", path(src), {
        headers: { Destination: url(dst), Overwrite: force ? "T" : "F" },
        expectStatus: [201, 204, 412],
      });
      if (res.status === 412) {
        return { moved: false, conflict: await this.stat(dst) };
      }
      return { moved: true };
    },

    async mkdir(p) {
      const res = await transport.request("MKCOL", path(p), {
        expectStatus: [201, 405],
      });
      if (res.status === 405) return { created: false, alreadyExists: true };
      return { created: true, alreadyExists: false };
    },
  };
}
