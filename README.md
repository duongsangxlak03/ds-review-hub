# DS Review Hub

Independent editorial review and shopping research site for `dsreviewhub.com`.

## Stack

- Vite + React + TypeScript
- Supabase database, authentication, storage, Edge Functions, and Realtime
- TanStack Query with live public-content invalidation
- Vercel static hosting with prerendered SEO pages

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the credentials for the dedicated DS Review Hub Supabase project.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.

Use a dedicated DS Review Hub Supabase project and never commit local environment files.

## Checks

```sh
npm test -- --run
npx tsc --noEmit
npm run build
npm run check:seo-build
```

## Deployment

Production is hosted as its own Vercel project. Both `dsreviewhub.com` and `www.dsreviewhub.com` should point to that project, with `https://www.dsreviewhub.com` used as the canonical origin.

Admin content changes refresh the public app through Supabase Realtime, cross-tab invalidation, and a visible-tab polling fallback. Static SEO HTML and sitemap rebuilds are queued through the `trigger-deploy` Edge Function and the Vercel deploy hook.

## Review import tool

Generate review drafts from affiliate links using an existing Codex login:

```sh
npm run review:codex -- --input affiliate-links.csv
```

The generator creates JSON, XLSX, and CSV outputs. Import the CSV under **Admin → Reviews**. Affiliate URLs are preserved as store CTAs, and reviews remain drafts until they pass the editorial quality gate.
