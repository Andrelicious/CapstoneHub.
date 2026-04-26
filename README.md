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

## OCR Setup

CapstoneHub production OCR is Tesseract-only.

- `OCR_PROVIDER_CHAIN=tesseract` (required for deployment)
- `OCR_ENABLE_PROVIDER_FAILOVER=false` (recommended)
- `OCR_TESSERACT_LANG=eng`
- `OCR_MAX_FILE_BYTES=20971520` (default 20MB)
- `OCR_TESSERACT_TIMEOUT_MS=120000` (default 120s)

Behavior:

- `docx` always uses direct text extraction.
- `image` and `pdf` are processed by Tesseract-only OCR.
- Searchable PDFs use their embedded text layer first.
- Scanned PDFs that do not yield readable text will fail with a clear Tesseract-only message.
- OCR rejects unsupported file formats and empty/oversized uploads before processing.

Recommended architecture:

- Set `OCR_PROVIDER_CHAIN=tesseract` if you want the simplest deployment.
- Set `OCR_ENABLE_PROVIDER_FAILOVER=false` so production behavior stays deterministic.
- Do not configure Google Vision or OCR AI for this rollout.

Production go-live:

- Follow `docs/OCR_PRODUCTION_CHECKLIST.md`.
- Validate a local OCR smoke test before deploy.
- Confirm the Vercel deployment uses the same Tesseract-only env values as localhost.

For CapstoneHub OCR results, only extracted text is stored (no OCR metadata fields are required).

## Troubleshooting

- You may still see this warning during `pnpm build`:
   - `[baseline-browser-mapping] The data in this module is over two months old...`
- This is currently non-blocking for this project when the build exits successfully.
- If needed, update browser data with:
   - `pnpm up baseline-browser-mapping browserslist autoprefixer`