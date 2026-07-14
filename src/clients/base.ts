import type { Env } from "../types.js";

export class NextcloudBase {
	protected host: string;
	protected username: string;
	protected authHeader: string;

	constructor(env: Env) {
		this.host = env.NEXTCLOUD_HOST;
		this.username = env.NEXTCLOUD_USERNAME;
		this.authHeader =
			"Basic " +
			btoa(`${env.NEXTCLOUD_USERNAME}:${env.NEXTCLOUD_PASSWORD}`);
	}

	protected webdavBasePath(): string {
		return `/remote.php/dav/files/${this.username}`;
	}

	protected async request(
		method: string,
		path: string,
		options: {
			body?: string;
			headers?: Record<string, string>;
			expectStatus?: number[];
		} = {},
	): Promise<Response> {
		const res = await fetch(`${this.host}${path}`, {
			method,
			headers: {
				Authorization: this.authHeader,
				"OCS-APIRequest": "true",
				...options.headers,
			},
			body: options.body,
		});

		const expected = options.expectStatus ?? [200, 201, 204, 207];
		if (!expected.includes(res.status)) {
			throw new Error(`Nextcloud ${method} ${path} → ${res.status}`);
		}
		return res;
	}
}
