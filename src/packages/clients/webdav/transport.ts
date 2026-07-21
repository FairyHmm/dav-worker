// Generic authenticated-request transport for WebDAV (and, by extension,
// CalDAV — CalDAV is WebDAV + REPORT, not a separate transport). Knows
// nothing about Nextcloud: no username-derived base paths, no credential
// shape. `host` + `authHeader` are the only inputs, and both are ordinary
// HTTP/WebDAV concepts any server exposes. Nextcloud-specific base-path
// construction (`/remote.php/dav/files/{username}`, etc.) belongs in
// `storage/nextcloud/*`, not here.

export class WebDAVHttpError extends Error {
  constructor(
    method: string,
    path: string,
    public readonly status: number,
  ) {
    super(`WebDAV ${method} ${path} \u2192 ${status}`);
    this.name = "WebDAVHttpError";
  }
}

export interface WebDAVRequestInit {
  body?: string;
  headers?: Record<string, string>;
  expectStatus?: number[];
}

export interface WebDAVTransport {
  request(method: string, path: string, options?: WebDAVRequestInit): Promise<Response>;
}

// Bakes `host`/`authHeader` into a closure once per call site (typically
// once per storage adapter instance), so every subsequent call only needs
// method/path/options — same call shape the old NextcloudBase.request had.
export function createWebDAVTransport(host: string, authHeader: string): WebDAVTransport {
  return {
    async request(method, path, options = {}) {
      const res = await fetch(`${host}${path}`, {
        method,
        headers: {
          Authorization: authHeader,
          "OCS-APIRequest": "true",
          ...options.headers,
        },
        body: options.body,
      });

      const expected = options.expectStatus ?? [200, 201, 204, 207];
      if (!expected.includes(res.status)) {
        throw new WebDAVHttpError(method, path, res.status);
      }
      return res;
    },
  };
}
