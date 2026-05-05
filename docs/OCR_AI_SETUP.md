# OCR AI Provider Setup — Optional Advanced Configuration

This guide configures an **optional third-party OCR AI provider** to enhance accuracy and handle edge cases beyond Tesseract.js capabilities.

## Overview

- **Primary OCR**: Tesseract.js (included, cost: $0)
- **Fallback OCR (Optional)**: Custom OCR AI service or managed API
- **Failover Strategy**: Try primary → fallback → error
- **Status**: Production-ready, requires external API setup

## Prerequisites

You need:
1. An OCR AI endpoint (self-hosted or managed service) that accepts multipart POST requests
2. Optional API key for authentication
3. Response format: JSON with `fullText` or `text` field

### Example OCR AI Services

- **Self-hosted**: Deploy your own ML-based OCR (e.g., EasyOCR, Keras-OCR, PaddleOCR)
- **Managed APIs**: 
  - Google Cloud Vision (premium accuracy, ~$1.50/1000 requests)
  - Microsoft Azure Computer Vision (~$1-2/1000 requests)
  - AWS Textract (~$0.02/page)
  - Hugging Face Inference API (cheap, slower)

## 1) Environment Configuration

### On Vercel (Web/API)

```
OCR_PROVIDER_CHAIN=tesseract,ocr_ai
OCR_AI_ENDPOINT=https://your-ocr-api.example.com/ocr
OCR_AI_API_KEY=sk-your-secret-key-here
OCR_AI_TIMEOUT_MS=120000
OCR_AI_MAX_RETRIES=2
OCR_ENABLE_PROVIDER_FAILOVER=true
```

### On Railway (Worker)

Same environment variables. Set via Railway dashboard or CLI:

```bash
railway variable set \
  OCR_PROVIDER_CHAIN=tesseract,ocr_ai \
  OCR_AI_ENDPOINT=https://your-ocr-api.example.com/ocr \
  OCR_AI_API_KEY=sk-your-secret-key-here \
  OCR_AI_TIMEOUT_MS=120000 \
  OCR_AI_MAX_RETRIES=2 \
  OCR_ENABLE_PROVIDER_FAILOVER=true \
  --service capstonehub-ocr-worker
```

### Key Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OCR_AI_ENDPOINT` | ✅ Yes | — | URL of OCR AI service (must start with http:// or https://) |
| `OCR_AI_API_KEY` | ❌ No | — | Bearer token for authentication (optional if endpoint is public) |
| `OCR_AI_TIMEOUT_MS` | ❌ No | 120000 | Request timeout in milliseconds (default: 120s) |
| `OCR_AI_MAX_RETRIES` | ❌ No | 2 | Number of retry attempts on transient errors |
| `OCR_PROVIDER_CHAIN` | ❌ No | tesseract,ocr_ai | Comma-separated provider order (fallback sequence) |
| `OCR_ENABLE_PROVIDER_FAILOVER` | ❌ No | true | If false, fail immediately on primary provider error |

## 2) Endpoint Contract

Your OCR AI endpoint must:

**Method**: POST  
**Content-Type**: `multipart/form-data`

**Request**:
```
File field: `file` (binary image or PDF)
Optional header: `Authorization: Bearer <API_KEY>`
```

**Response** (200 OK):
```json
{
  "fullText": "Extracted text content here...",
  "confidence": 0.95,
  "language": "en"
}
```

Or alternatively:
```json
{
  "text": "Extracted text content here..."
}
```

**Error Responses**:
```json
{
  "error": "Failed to process image"
}
```

### Example Node.js OCR AI Endpoint (EasyOCR)

```javascript
import express from 'express'
import multer from 'multer'
import * as fs from 'fs'
import * as spawn from 'child_process'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.post('/ocr', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })

  try {
    // Example: spawn Python EasyOCR process or call ML library
    const text = await runOCR(req.file.buffer)
    res.json({ fullText: text })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => console.log('OCR AI service running on :3000'))
```

## 3) Verification

### Health Check Endpoint

```bash
curl https://capstone-hub-repo.vercel.app/api/internal/ocr-health
```

Expected output (OCR AI configured):
```json
{
  "status": "healthy",
  "providers": [
    { "name": "tesseract", "enabled": true, "configured": true },
    { "name": "ocr_ai", "enabled": true, "configured": true },
    { "name": "google_vision", "enabled": false, "configured": false }
  ],
  "ocrAi": {
    "endpoint": "https://your-ocr-api.example.com/ocr",
    "apiKeySet": true
  }
}
```

### Test Connectivity

```bash
# Test OCR AI endpoint reachability
curl https://capstone-hub-repo.vercel.app/api/internal/ocr-health?testEndpoint=true
```

### End-to-End Test (Railway)

```bash
railway run node scripts/verify-ocr-ai.mjs
```

Or with explicit credentials:

```bash
railway run node scripts/verify-ocr-ai.mjs \
  https://your-ocr-api.example.com/ocr \
  sk-your-secret-key
```

## 4) Configuration on Railway

### Via CLI

```bash
# Set variables for capstonehub-ocr-worker service
railway variable set OCR_PROVIDER_CHAIN=tesseract,ocr_ai \
  --service capstonehub-ocr-worker

railway variable set OCR_AI_ENDPOINT=https://your-ocr-api.example.com/ocr \
  --service capstonehub-ocr-worker

railway variable set OCR_AI_API_KEY=sk-your-secret-key-here \
  --service capstonehub-ocr-worker

# Redeploy to apply changes
railway up --detach
```

### Via Dashboard

1. Go to [Railway Dashboard](https://railway.app)
2. Select **Project** → **Environments** → **Production**
3. Click **capstonehub-ocr-worker** service
4. Go to **Variables** tab
5. Add/update:
   - `OCR_AI_ENDPOINT`
   - `OCR_AI_API_KEY`
   - `OCR_PROVIDER_CHAIN`
6. Click **Redeploy**

### Via Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select **capstone-hub-repo** project
3. Settings → **Environment Variables**
4. Add/update:
   - `OCR_AI_ENDPOINT`
   - `OCR_AI_API_KEY`
   - `OCR_PROVIDER_CHAIN`
5. Redeploy

## 5) Monitoring & Troubleshooting

### Worker Logs

```bash
# View worker logs for OCR AI requests
railway service logs --service capstonehub-ocr-worker --lines 100

# Look for:
# [OCR:AIRecognition] Starting OCR AI request...
# [OCR:AIRecognition] Attempt X: Connected in Yms, status=200
# [OCR:AIRecognition] SUCCESS: N chars extracted
```

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| `OCR_AI_ENDPOINT not set` | Missing env var | Set `OCR_AI_ENDPOINT` on Railway/Vercel |
| `Endpoint unreachable` | Network/DNS error | Verify endpoint URL is correct and accessible |
| `Timed out after 120000ms` | Service too slow | Increase `OCR_AI_TIMEOUT_MS` or check service health |
| `Empty text response` | Service returned no extraction | Verify OCR AI service is working; check logs |
| `HTTP 401 / 403` | Invalid API key | Verify `OCR_AI_API_KEY` is correct |
| `HTTP 500` | Service error | Check OCR AI service logs for errors |

### Debugging

Enable verbose logging:

```bash
# On Railway
railway run OCR_AI_TIMEOUT_MS=300000 npx tsx workers/ocr-poll-worker.ts

# Then check logs:
# [OCR:AIRecognition] Attempt 1: Sending request to OCR AI...
# [OCR:AIRecognition] Attempt 1: Connected in Xms, status=Y
```

## 6) Fallback Chain Strategy

With `OCR_PROVIDER_CHAIN=tesseract,ocr_ai`:

1. **Try Tesseract first** → Fast, local, free
   - Success: Return result
   - Fail: Continue to next provider
2. **Try OCR AI** → Slower, possibly paid, more accurate
   - Success: Return result
   - Fail: Return error
3. **Error**: User gets clear message: "Could not extract text using available providers"

## 7) Cost Estimation

Assuming:
- 100 documents/day
- 70% succeed on Tesseract (free)
- 30% fall back to OCR AI (~$0.002 per request)

**Monthly Cost**: ~$0.002 × 30 × 30 ≈ **$1.80/month**

Compare with:
- Google Vision only: ~$4.50/month (100 docs × 30 days × $1.50/1000)
- Always OCR AI: Depends on service

## 8) Production Readiness Checklist

- [ ] OCR AI endpoint deployed and tested
- [ ] `OCR_AI_ENDPOINT` set on Railway
- [ ] `OCR_AI_API_KEY` set on Railway (if required)
- [ ] `OCR_PROVIDER_CHAIN` includes `ocr_ai`
- [ ] Health check passes: `/api/internal/ocr-health`
- [ ] E2E test passes: `railway run node scripts/verify-ocr-ai.mjs`
- [ ] Worker logs show OCR AI fallback working
- [ ] Vercel web app can upload and process documents
- [ ] Monitoring alerts configured for OCR AI timeouts

---

## Support

For issues or questions:
- Check Railway logs: `railway service logs --service capstonehub-ocr-worker --lines 200`
- Check Vercel function logs: Vercel Dashboard → Functions → /api/datasets/[id]/ocr
- Review OCR engine config: [lib/ocr-engine.ts](../lib/ocr-engine.ts)
