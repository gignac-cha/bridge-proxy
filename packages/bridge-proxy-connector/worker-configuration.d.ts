// Generated by Wrangler
// After adding bindings to `wrangler.json`, regenerate this interface via `npm run cf-typegen`
interface Env {
	bridge_proxy_cache: KVNamespace<`request:${string}` | `response:${string}`>;
}
