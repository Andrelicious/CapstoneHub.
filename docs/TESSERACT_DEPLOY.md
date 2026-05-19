Tesseract deployment and configuration
=====================================

This project is configured to use native `tesseract` as the primary OCR engine.
Follow the steps below to ensure deployments run with native Tesseract reliably.

1) Docker image
-----------------
- The repository `Dockerfile` installs `tesseract-ocr` and the English traineddata package (`tesseract-ocr-eng`).
- The GitHub Actions workflow `.github/workflows/docker-build.yml` now verifies the built image contains the `tesseract` binary by running `tesseract --version` inside the image.

2) Environment variables (required)
-----------------------------------
Set these env vars for the OCR worker process (Railway/your Docker host):

- `SUPABASE_URL` — your Supabase URL (e.g. `https://xyz.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (required for worker operations)
- `OCR_PROVIDER` — set to `tesseract`
- `OCR_PROVIDER_CHAIN` — set to `tesseract` (optional, ensures no failover)
- `OCR_ENABLE_PROVIDER_FAILOVER` — set to `false` (optional)
- `OCR_TESSERACT_LANG` — languages for Tesseract (default `eng`)
- `TESSDATA_PREFIX` — optional, defaults to `/usr/share/tessdata` in the Docker image

3) Railway / Hosting
---------------------
- Deploy the Docker image built by CI to your worker host (Railway service). The image tag `ghcr.io/<owner>/capstonehub:<sha>` is pushed by CI.
- Ensure the service's environment variables include the above required keys. The worker must have `SUPABASE_SERVICE_ROLE_KEY` — the anon key is insufficient.

4) Testing
----------
- Local tesseract test: `node scripts/local-native-tesseract-test.mjs` (writes a PNG and runs the native `tesseract` CLI).
- End-to-end test (requires Supabase service role key): `node scripts/e2e-live-ocr.mjs`.

5) Troubleshooting
-------------------
- If you see `spawn tesseract ENOENT`, the native binary is missing in the runtime — ensure the deployed image is the CI-built image that includes `tesseract`.
- If OCR jobs fail with `Invalid API key`, verify `SUPABASE_SERVICE_ROLE_KEY` is correct in the worker environment.
- Review worker logs for errors; the worker startup logs include `native tesseract available:` or `not found` (see `scripts/start.mjs`).

If you'd like, I can (A) monitor the CI build and confirm Railway has deployed the new image, or (B) patch the worker to strictly fail fast with clearer errors when `tesseract` is missing. Tell me which you'd prefer.
