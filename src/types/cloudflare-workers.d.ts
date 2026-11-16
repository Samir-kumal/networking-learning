// The Workers runtime module that exposes bindings from wrangler.jsonc. The shape of
// `Cloudflare.Env` is generated into cloudflare-env.d.ts by `wrangler types`.
declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
