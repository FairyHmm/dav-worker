// CalDAV is WebDAV + REPORT, not a separate transport — this covers both.
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
  // Request timeout in milliseconds
  timeoutMs?: number;
}

export interface WebDAVTransport {
  request(
    method: string,
    path: string,
    options?: WebDAVRequestInit,
  ): Promise<Response>;
}

// host/authHeader are ordinary WebDAV concepts — Nextcloud-specific paths
// (e.g. /remote.php/dav/files/{username}) belong in storage/nextcloud/*.
export function createWebDAVTransport(
  host: string,
  authHeader: string,
): WebDAVTransport {
  return {
    async request(method, path, options = {}) {
      const controller = new AbortController();
      const timeoutMs = options.timeoutMs ?? 10_000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(`${host}${path}`, {
          method,
          headers: {
            Authorization: authHeader,
            "OCS-APIRequest": "true",
            ...options.headers,
          },
          body: options.body,
          signal: controller.signal,
        });

        const expected = options.expectStatus ?? [200, 201, 204, 207];
        if (!expected.includes(res.status)) {
          throw new WebDAVHttpError(method, path, res.status);
        }
        return res;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
