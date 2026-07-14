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

	async list(path: string = ""): Promise<FileEntry[]> {
		let url = this.davPathNoEncode(path);
		if (!url.endsWith("/")) url += "/";

		const res = await this.request("PROPFIND", url, {
			headers: { Depth: "1", "Content-Type": "application/xml" },
			body: PROPFIND_BODY,
		});

		const xml = await res.text();
		const parsed = parser.parse(xml);
		const responses: any[] = [].concat(
			parsed.multistatus?.response ?? [],
		);

		// Skip first entry (the directory itself)
		return responses.slice(1).map((r: any) => {
			const href: string = r.href ?? "";
			const name = decodeURIComponent(
				href.replace(/\/$/, "").split("/").pop() ?? "",
			);
			const prop = r.propstat?.prop ?? {};

			return {
				name,
				path: path ? `${path.replace(/\/$/, "")}/${name}` : name,
				isDirectory: !!prop.resourcetype?.collection,
				size: prop.getcontentlength
					? Number(prop.getcontentlength)
					: null,
				contentType: prop.getcontenttype ?? null,
				lastModified: prop.getlastmodified ?? null,
			};
		});
	}

	async read(path: string): Promise<{ content: string; contentType: string }> {
		const res = await this.request("GET", this.davPathNoEncode(path));

		const contentType = res.headers.get("content-type") ?? "application/octet-stream";

		// Binary file guard
		if (!contentType.startsWith("text/") && contentType !== "application/json") {
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

	async mkdir(path: string): Promise<{ created: boolean; alreadyExists: boolean }> {
		const res = await this.request(
			"MKCOL",
			this.davPathNoEncode(path),
			{ expectStatus: [201, 405] },
		);

		if (res.status === 405) return { created: false, alreadyExists: true };
		return { created: true, alreadyExists: false };
	}

	async delete(path: string): Promise<void> {
		await this.request("DELETE", this.davPathNoEncode(path), {
			expectStatus: [200, 204, 404],
		});
	}
}
