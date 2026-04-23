# OCR Production Checklist

Use this checklist before enabling OCR in production.

## 1) Environment and Secret Wiring

- Set `OCR_PROVIDER_CHAIN=ocr_ai,google_vision,tesseract`
- Set `OCR_ENABLE_PROVIDER_FAILOVER=true`
- Set `OCR_MAX_FILE_BYTES=20971520` (or your policy limit)
- Set `OCR_AI_ENDPOINT` to your deployed OCR service URL
- Set `OCR_AI_API_KEY` if your OCR service requires bearer authentication
- Set `OCR_AI_TIMEOUT_MS` and `OCR_AI_MAX_RETRIES` for your latency/SLA profile
- Configure Google fallback credentials (`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_VISION_CREDENTIALS_JSON`)
- If tesseract fallback is not installed in your runtime, remove it from the chain (for example: `OCR_PROVIDER_CHAIN=ocr_ai,google_vision`).

## 2) Endpoint Contract Validation

Run a direct endpoint contract check before app-level testing:

```bash
pnpm ocr:verify-ai --file public/apple-icon.png
```

Optional flags:

- `--endpoint https://your-ocr-ai-service/ocr`
- `--api-key your_token`

Pass criteria:

- HTTP 2xx response
- JSON response contains either `fullText` or `text` as a non-empty string

## 3) App-Level Validation

- Upload one image (`.png`/`.jpg`) through the normal submission flow
- Upload one PDF through the normal submission flow
- Confirm extracted text is saved in OCR result fields
- Confirm no OCR metadata fields are required for persistence

## 4) Failover Validation

- Temporarily disable OCR AI endpoint and verify fallback provider succeeds
- Temporarily disable failover (`OCR_ENABLE_PROVIDER_FAILOVER=false`) and confirm clear single-provider error output

## 5) Monitoring and Operations

- Track OCR failures by provider in logs
- Alert on sustained OCR AI timeout/error rates
- Keep retry counts conservative to avoid duplicate high-cost OCR calls
- Rotate OCR API credentials on your standard secret rotation cadence
