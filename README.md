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

CapstoneHub now supports an OCR provider switch:

- `OCR_PROVIDER=tesseract` (default)
- `OCR_PROVIDER=google_vision`
- `OCR_PROVIDER=ocr_ai`
- `OCR_PROVIDER_CHAIN=ocr_ai,google_vision,tesseract` (optional priority order)
- `OCR_ENABLE_PROVIDER_FAILOVER=true` (default)
- `OCR_PDF_FALLBACK_TO_GOOGLE_VISION=true` (default)
- `OCR_TESSERACT_LANG=eng`
- `OCR_MAX_FILE_BYTES=20971520` (default 20MB)
- `OCR_TESSERACT_TIMEOUT_MS=120000` (default 120s)
- `OCR_AI_ENDPOINT=https://your-ocr-ai-service/ocr`
- `OCR_AI_API_KEY=...` (optional bearer token)
- `OCR_AI_TIMEOUT_MS=120000` (default 120s)
- `OCR_AI_MAX_RETRIES=2` (default)

Behavior:

- `docx` always uses direct text extraction.
- `image` uses the selected provider.
- `pdf` with `OCR_PROVIDER=tesseract` will automatically fall back to Google Vision when credentials are configured.
- `OCR_PROVIDER=ocr_ai` sends image/pdf files to your OCR AI service endpoint and expects JSON with `fullText` or `text`.
- If PDF fallback is disabled and provider is `tesseract`, OCR will fail with a clear configuration error.
- OCR rejects unsupported file formats and empty/oversized uploads before processing.

Recommended architecture:

- Set `OCR_PROVIDER_CHAIN=ocr_ai,google_vision,tesseract`.
- Keep `OCR_ENABLE_PROVIDER_FAILOVER=true` for high availability.
- Use OCR AI as primary, Google Vision as resilience fallback, and Tesseract as local fallback for image/docx.

Production go-live:

- Follow `docs/OCR_PRODUCTION_CHECKLIST.md`.
- Validate OCR AI endpoint contract quickly with:
   - `pnpm ocr:verify-ai --file public/apple-icon.png`

If you use Google Vision, configure one of the following in `.env.local`:

- `GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json`
- `GOOGLE_VISION_CREDENTIALS_JSON={"type":"service_account",...}` (single-line JSON)

Then restart the dev server.

For CapstoneHub OCR results, only extracted text is stored (no OCR metadata fields are required).

## Troubleshooting

- You may still see this warning during `pnpm build`:
   - `[baseline-browser-mapping] The data in this module is over two months old...`
- This is currently non-blocking for this project when the build exits successfully.
- If needed, update browser data with:
   - `pnpm up baseline-browser-mapping browserslist autoprefixer`