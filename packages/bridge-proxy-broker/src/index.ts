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

type RequestObject = Omit<Request, 'text'> & { text: string };
type ResponseObject = Omit<Response, 'text'> & { text: string };

const addRequest = async (request: Request, env: Env) => {
	const key = `request:${new Date().toISOString()}:${crypto.randomUUID()}` as const;
	const method = request.method;
	const url = request.url;
	const headers = Object.fromEntries([...request.headers.entries()]);
	const text = await request.text();
	const object = { method, url, headers, text };
	const value = btoa(JSON.stringify(object));
	await env.bridge_proxy_cache.put(key, value);
	return key;
};
const getResponse = async (key: `response:${string}`, env: Env) => {
	const abortController = new AbortController();
	return Promise.race([
		new Promise<Response>((resolve, reject) => {
			abortController.signal.addEventListener('abort', reject);
			const callback = async () => {
				const value = await env.bridge_proxy_cache.get(key);
				if (abortController.signal.aborted) {
					reject();
				} else if (value) {
					const object: ResponseObject = JSON.parse(atob(value));
					const response = new Response(object.text, {
						status: object.status,
						statusText: object.statusText,
						headers: object.headers,
					});
					resolve(response);
				} else {
					setTimeout(callback, 1000);
				}
			};
			setTimeout(callback);
		}),
		new Promise<Response>((resolve, reject) => setTimeout(reject, 60 * 1000)),
	]);
};

const convertKey = (key: `request:${string}`) => `response:${key.replace(/^request:/, '')}` as const;

const cors = async (promiseOrResponse: Response | Promise<Response>) => {
	const response = await promiseOrResponse;
	response.headers.set('Access-Control-Allow-Methods', '*');
	response.headers.set('Access-Control-Allow-Origin', '*');
	return new Response(await response.text(), response);
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const key = await addRequest(request, env);
		return cors(getResponse(convertKey(key), env));
		// try {
		// } catch (error) {
		// 	if (error instanceof Error) {
		// 		return new Response(JSON.stringify({ name: error.name, message: error.message }), {
		// 			status: 500,
		// 			headers: { 'Content-Type': 'application/json' },
		// 		});
		// 	}
		// 	return new Response(`${error}`, { status: 500 });
		// }
	},
} satisfies ExportedHandler<Env>;
