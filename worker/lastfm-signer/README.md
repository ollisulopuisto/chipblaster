# Last.fm signer

A Cloudflare Worker that signs Last.fm API calls so the shared secret stays off the web page.

`POST /sign` with `{ "method": "track.scrobble", "params": { ... } }` returns `{ "api_key": "...", "api_sig": "..." }`. The page then calls Last.fm itself. Only three methods are signed (`auth.getSession`, `track.updateNowPlaying`, `track.scrobble`), only for the origins listed in `ALLOWED_ORIGINS`, and nothing is stored or logged. The Worker does see the session key inside a sign request, so keep it free of logging.

## Deploy

```
cd worker/lastfm-signer
# edit wrangler.toml: ALLOWED_ORIGINS (your site) and LASTFM_API_KEY
npx wrangler secret put LASTFM_SECRET     # paste the shared secret
npx wrangler deploy
```

The free plan is plenty: a sign request is a few milliseconds of work. Check Cloudflare's current free-plan limits.
