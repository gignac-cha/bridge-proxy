/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.json`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const raceWithTimeout = async (promises: Promise<unknown>[], timeout: number) => {
	let rejects: ((reason?: any) => void)[] = [];
	const abortController = new AbortController();
	abortController.signal.addEventListener('abort', () => {
		rejects.forEach((reject) => reject());
	});
	return await Promise.race([
		...promises.map(
			(promise) =>
				new Promise(async (resolve, reject) => {
					rejects.push(reject);
					resolve(await promise);
				}),
		),
		new Promise((resolve, reject) =>
			setTimeout(() => {
				abortController.abort();
				reject();
			}, timeout),
		),
	]);
};

const addRequest = async (request: Request, env: Env) => {
	const key = `request:${new Date().toISOString()}:${crypto.randomUUID()}`;
	const url = request.url;
	const headers = Object.fromEntries([...request.headers.entries()]);
	const text = await request.text();
	const object = { url, headers, text };
	const value = btoa(JSON.stringify(object));
	await env.bridge_proxy_cache.put(key, value);
	return key;
};
const getResponse = async (key: string, env: Env) => {
	
	const callback = async () => {
		const value = await env.bridge_proxy_cache.get(key);
		if (value) {
		} else {
			setTimeout(callback, 1000);
		}
	};
	setTimeout(callback);
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
