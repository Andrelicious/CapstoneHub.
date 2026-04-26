# OCR Production Checklist

Use this checklist before enabling OCR in production.

## 1) Environment and Secret Wiring

- Set `OCR_PROVIDER_CHAIN=tesseract`
- Set `OCR_ENABLE_PROVIDER_FAILOVER=false`
- Set `OCR_MAX_FILE_BYTES=20971520` (or your policy limit)
- Set `OCR_TESSERACT_LANG=eng`
- Set `OCR_TESSERACT_TIMEOUT_MS=120000` (or your latency/SLA profile)
- Do not set Google Vision or OCR AI credentials for this rollout.

## 2) Endpoint Contract Validation

Run a local OCR smoke test before app-level testing:

```bash
pnpm build
```

Pass criteria:

- Build completes successfully
- Tesseract-only OCR code path loads without provider fallback errors

## 3) App-Level Validation

- Upload one image (`.png`/`.jpg`) through the normal submission flow
- Upload one PDF through the normal submission flow
- Confirm extracted text is saved in OCR result fields
- Confirm no OCR metadata fields are required for persistence

## 4) Failover Validation

- Confirm failover is disabled and the app still returns clear Tesseract-only messages when OCR cannot read a file
- Confirm no Google Vision or OCR AI credentials are present in production env for this rollout

## 5) Monitoring and Operations

- Track OCR failures by provider in logs
- Alert on sustained OCR AI timeout/error rates
- Keep retry counts conservative to avoid duplicate high-cost OCR calls
- Rotate OCR API credentials on your standard secret rotation cadence
