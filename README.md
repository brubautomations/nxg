# NXG — wearenxg.com

Official NXG site. React + Vite frontend, content managed entirely from your **NXG Site** Airtable base, read through a serverless function so the API token never touches the browser.

```
React/Vite (browser)  →  /.netlify/functions/airtable  →  Airtable  →  rendered
```

The site ships with bundled fallback assets, so it works the moment it deploys — then your Airtable rows override everything as you fill them in.

---

## Deploy (one time)

1. **Push this folder to a GitHub repo.**
2. **Create an Airtable personal access token**
   - airtable.com → Developer hub → Personal access tokens → create one
   - Scope: `data.records:read` · grant access to the **NXG Site** base
   - Copy the token (starts `pat...`) — keep it secret.
3. **Connect the repo to Netlify** (New site from Git). Build settings are auto-read from `netlify.toml`:
   - Build command: `npm run build`
   - Publish dir: `dist`
   - Functions dir: `netlify/functions`
4. **Set environment variables** in Netlify → Site settings → Environment variables:
   - `AIRTABLE_TOKEN` = your `pat...` token
   - `AIRTABLE_BASE_ID` = `appmiX1Oz2OgbpuZ0`
5. **Point the domain** `wearenxg.com` at the Netlify site (Domain settings).

Done. After this, **all content lives in Airtable** — no code changes needed to update the site.

---

## Run locally

```bash
npm install
npm run dev        # frontend only (uses bundled fallbacks; the Airtable function won't run)
```

To test the live Airtable data locally, use the Netlify CLI:

```bash
npm i -g netlify-cli
netlify dev        # runs the function too; create a .env from .env.example first
```

---

## How content maps (Airtable → site)

| Table | Shows up as |
|---|---|
| `SETTINGS` (1 row) | `logo` → emblem · `hero_image` → landing/hero photo |
| `MEMBERS` | Members grid (photo, name, color bar) |
| `ALBUMS` | Discography covers |
| `TRACKS` | (wired for song detail — next build) |
| `MEDIA` | Media gallery (`vault_only` = locked badge) |
| `PARTNERS` | Partners grid |
| `SOCIALS` | Listen & Follow row on the hero |
| `COPY` | Editable text by `key` (e.g. `tagline`, `about_body`, `now_playing`) |

Rules: only rows with **`published`** checked appear; **`order`** sorts them (low → high); field names are read **exactly** as written (lowercase).

---

## Notes
- The ambient landing audio is a generated placeholder pad. Drop a real track in later (a `bg_audio` attachment on `SETTINGS`) and we wire it in.
- Social links are text pills; swap in official platform logo SVGs when ready.
- Loader chibis are bundled brand assets (not CMS-managed).
