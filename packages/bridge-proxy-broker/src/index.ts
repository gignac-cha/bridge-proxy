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

const addRequest = (request: Request, env: Env) => {
	const key = `request:${new Date().toISOString()}:${crypto.randomUUID()}`
	const url = request.url
	const headers = Object.fromEntries([...request.headers.entries()])
	const blob = await request.blob()
	const object = {url,
		headers,
	}
	const value = btoa(JSON.stringify(object))
	env.bridge_proxy_cache.put(key, value)
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
