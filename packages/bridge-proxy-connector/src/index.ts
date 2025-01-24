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

type RequestObject = Omit<Request, 'text'> & { text: string };
type ResponseObject = Omit<Response, 'text'> & { text: string };

const getRequest = async (env: Env) => {
	const { keys } = await env.bridge_proxy_cache.list({ prefix: 'request:', limit: 1 });
	for (const key of keys) {
		const value = await env.bridge_proxy_cache.get(key.name, 'text');
		if (!value) {
			throw new Error(`'value' is ${value}`);
		}
		const requestObject: RequestObject = JSON.parse(atob(value));
		return { key, requestObject };
	}
	return;
};

const setResponse = async (key: `response:${string}`, responseObject: ResponseObject, env: Env) => {
	await env.bridge_proxy_cache.put(key, btoa(JSON.stringify(responseObject)));
};

const json = async (promiseOrResponse: Response | Promise<Response>) => {
	const response = await promiseOrResponse;
	response.headers.set('Content-Type', 'application/json');
	return new Response(await response.text(), response);
};
const cors = async (promiseOrResponse: Response | Promise<Response>) => {
	const response = await promiseOrResponse;
	response.headers.set('Access-Control-Allow-Methods', '*');
	response.headers.set('Access-Control-Allow-Origin', '*');
	return new Response(await response.text(), response);
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		switch (request.method) {
			case 'GET': {
				const result = await getRequest(env);
				if (!result) {
					return cors(new Response('', { status: 204 }));
				}
				return new Response(JSON.stringify(result), {
					headers: { 'Content-Type': 'application/json' },
				});
			}
			case 'POST': {
				const result: { key: `response:${string}`; responseObject: ResponseObject } = await request.json();
				await setResponse(result.key, result.responseObject, env);
				return cors(json(new Response(JSON.stringify({}), { status: 201 })));
			}
		}
		return cors(json(new Response(JSON.stringify({}), { status: 405 })));
	},
} satisfies ExportedHandler<Env>;
