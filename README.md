# CapstoneHub Repo

## Quick Start

1. Install dependencies:
   - `pnpm install`
2. Run development server:
   - `pnpm dev`
3. Build for production:
   - `pnpm build`

## Package Manager Policy

- This repository is **pnpm-only**.
- Keep `pnpm-lock.yaml` as the single lockfile.
- Do not commit `package-lock.json`.

## Notes

- Next.js Turbopack root is explicitly configured in `next.config.mjs`.
- Request proxy logic uses `proxy.ts` (not `middleware.ts`).

## Troubleshooting

- You may still see this warning during `pnpm build`:
   - `[baseline-browser-mapping] The data in this module is over two months old...`
- This is currently non-blocking for this project when the build exits successfully.
- If needed, update browser data with:
   - `pnpm up baseline-browser-mapping browserslist autoprefixer`