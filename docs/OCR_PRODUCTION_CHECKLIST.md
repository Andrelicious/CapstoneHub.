# OCR Production Checklist — Tesseract-Only (Zero-Cost)

This deployment uses **Tesseract.js** exclusively for OCR processing. No external APIs, cloud services, or costs.

## 1) Environment Configuration

✅ Set in `.env.local` or Vercel Project Settings:
```
OCR_PROVIDER=tesseract
OCR_ENABLE_PROVIDER_FAILOVER=false
OCR_MAX_FILE_BYTES=20971520
OCR_TESSERACT_LANG=eng
OCR_TESSERACT_TIMEOUT_MS=120000
```

⚠️ Do NOT set:
- `GOOGLE_APPLICATION_CREDENTIALS` — not needed
- `OCR_AI_ENDPOINT` — not needed
- Any other OCR provider credentials

## 2) Build Validation

```bash
npm run build
```

✅ Pass criteria:
- Build completes successfully
- No errors referencing missing OCR credentials
- All Tesseract imports resolve

## 3) Local Smoke Test

Start worker:
```bash
npx tsx workers/ocr-poll-worker.ts
```

In another terminal, submit a dataset for OCR:
```bash
curl -X POST http://localhost:3000/api/datasets/[DATASET_ID]/ocr \
  -H "Authorization: Bearer [YOUR_TOKEN]"
```

Poll status:
```bash
curl http://localhost:3000/api/datasets/[DATASET_ID]/ocr/status
```

Fetch results:
```bash
curl http://localhost:3000/api/datasets/[DATASET_ID]/ocr/results
```

✅ Pass criteria:
- Status transitions: `queued` → `processing` → `done`
- Results contain `full_text` with extracted content
- Worker logs show Tesseract processing

## 4) Deployment Validation

- Upload **searchable PDF** (has embedded text layer) — should extract instantly
- Upload **scanned image** (.png/.jpg with clear text) — should extract within 30s
- Upload **poor quality image** — should return clear error message

## 5) Known Limitations & Expectations

| Document Type | Expected Result | Notes |
|---|---|---|
| Searchable PDF | ✅ Extract embedded text layer | Fast (~1-5s) |
| Clean scanned image | ✅ OCR text extraction | Moderate (~5-30s) |
| Handwritten text | ⚠️ Low accuracy | Tesseract not designed for handwriting |
| Very low quality/blurry | ⚠️ May fail silently | User gets error: "Could not extract readable text" |

## 6) Worker Performance

- **Memory usage**: ~150-200MB per worker process
- **Processing time**: 5-30s per document
- **Concurrency**: Run 1-2 worker processes
- **Scalability**: Add more pods as needed (no external dependency)

## 7) Worker Logs to Monitor

```
[OCR:Tesseract] Processing...
[OCR:Tesseract] SUCCESS: N chars extracted
[OCR:Tesseract] FAILED: [error message]
```

Troubleshooting:
- **Worker not picking up jobs**: Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- **Tesseract returns empty**: This is normal for non-text documents
- **Worker memory spike**: Increase pod memory limit

## 8) Cost Analysis

| Item | Cost |
|---|---|
| Tesseract.js (bundled) | $0 |
| Worker compute | Your infrastructure |
| Supabase storage | Standard plan |
| External OCR APIs | $0 (not used) |
| **Total OCR Cost** | **$0/month** |

---

## Future Upgrades (if needed later)

If accuracy needs improve:
1. **Google Cloud Vision**: `OCR_PROVIDER_CHAIN=tesseract,google_vision` (~$1.50/1000 requests)
2. **AWS Textract**: ~$0.02/page (higher accuracy)
3. **Custom OCR service**: For domain-specific needs
