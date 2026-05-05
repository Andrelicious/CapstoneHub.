# ✅ Production Deployment Checklist: Tesseract-Only OCR

**Status**: Ready for production  
**Commit**: 8932b99 (main branch)  
**Cost**: $0/month for OCR processing

---

## Quick Start: 2-Step Deployment

### Step 1: Set Vercel Environment Variables (5 min)

Go to [vercel.com/dashboard](https://vercel.com/dashboard):

1. Click your **CapstoneHub** project
2. Go to **Settings → Environment Variables**
3. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lhlkgyowrygzbhtrfibv.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   OCR_PROVIDER=tesseract
   OCR_ENABLE_PROVIDER_FAILOVER=false
   OCR_TESSERACT_LANG=eng
   OCR_TESSERACT_TIMEOUT_MS=120000
   ```
4. Click **"Deploy"** → Vercel auto-builds and deploys

**Expected result**: API endpoints return 202 queued within ~200ms

---

### Step 2: Deploy Worker to Railway (10 min)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Connect to your GitHub account
4. Select **CapstoneHub** repo and **main** branch
5. Railway will ask which service to deploy
6. Select **Docker** and set **Dockerfile path**: `./Dockerfile.worker`
7. Set these environment variables in Railway:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=https://lhlkgyowrygzbhtrfibv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   OCR_PROVIDER=tesseract
   OCR_ENABLE_PROVIDER_FAILOVER=false
   OCR_TESSERACT_LANG=eng
   OCR_TESSERACT_TIMEOUT_MS=120000
   OCR_WORKER_POLL_INTERVAL_MS=2000
   OCR_WORKER_MAX_ATTEMPTS=3
   ```
8. Click **"Deploy"** → Railway builds and starts worker
9. Check logs for `[worker started]` message

**Expected result**: Worker logs show polling for queued jobs every 2s

---

## Verification Checklist

After deployment, verify each component:

### ✅ Vercel API Deployment
- [ ] `npm run build` completed successfully (automatic)
- [ ] No OCR credential errors in Vercel logs
- [ ] POST `/api/datasets/[id]/ocr` returns `{ success: true, status: 'queued' }`
- [ ] Response time < 500ms (typically ~200ms)

### ✅ Railway Worker Deployment
- [ ] Worker service is running (green status in Railway dashboard)
- [ ] Logs show `[worker started]`
- [ ] Logs show polling interval: `[INFO: worker polling...]` every 2s
- [ ] No connection errors to Supabase
- [ ] Memory usage stable ~150-200MB

### ✅ End-to-End Flow
- [ ] Submit searchable PDF via API → Status: `queued`
- [ ] Worker processes job → Status transitions: `queued` → `processing` → `done`
- [ ] Fetch results → Returns `full_text` with extracted content
- [ ] UI Step 3 displays extracted text without timeout

---

## Production Architecture

```
User (CapstoneHub)
    ↓
Vercel API (Next.js on Vercel)
    ├─ POST /api/datasets/[id]/ocr
    │   └─ Returns 202 queued immediately
    ├─ GET /api/datasets/[id]/ocr/status
    │   └─ Returns job status from Supabase
    └─ GET /api/datasets/[id]/ocr/results
        └─ Returns extracted text

            ↓ (via Supabase DB polling)

Railway Worker (OCR Processing)
    ├─ Polls ocr_jobs table every 2s
    ├─ Claims queued jobs
    ├─ Runs Tesseract OCR locally
    └─ Updates Supabase with results
            ↓
Supabase (Database + Storage)
    ├─ ocr_jobs table (job status tracking)
    ├─ ocr_results table (extracted text)
    └─ Object Storage (document files)
```

**Cost**: $0/month for OCR processing  
**Scaling**: Add more Railway worker instances if needed

---

## Expected Performance

| Metric | Expected Value |
|---|---|
| **API Response Time** | 200-500ms (queued immediately) |
| **Searchable PDF Processing** | 1-5s (extract text layer) |
| **Scanned Image Processing** | 5-30s (OCR via Tesseract) |
| **Worker Memory Usage** | 150-200MB per process |
| **Polling Interval** | 2s |
| **Max Retries** | 3 attempts per job |
| **Monthly OCR Cost** | $0 |

---

## Production Logs to Monitor

Check Railway logs for:

**Healthy worker:**
```
[2026-05-05T15:46:37Z] INFO: worker started
[2026-05-05T15:46:40Z] INFO: polling for queued jobs...
[2026-05-05T15:47:10Z] INFO: claimed job: {jobId: "abc-123"}
[2026-05-05T15:47:15Z] INFO: [OCR:Tesseract] Processing file="document.pdf"
[2026-05-05T15:47:18Z] INFO: [OCR:Tesseract] SUCCESS: 2345 chars
[2026-05-05T15:47:20Z] INFO: job "abc-123" status: done
```

**Error scenarios:**
```
[ERROR] SUPABASE_SERVICE_ROLE_KEY not set → Fix: Add env var in Railway
[ERROR] Connection timeout to Supabase → Fix: Verify Supabase URL + credentials
[ERROR] [OCR:Tesseract] FAILED → Normal for non-text documents; user gets error message
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Worker not starting | Check Railway logs; verify `SUPABASE_SERVICE_ROLE_KEY` is set |
| Jobs stuck in `queued` | Verify worker memory (increase to 1GB if needed) |
| API returns 500 error | Check Vercel logs; verify all Supabase env vars |
| OCR extraction empty | Normal for scanned/low-quality images; user gets error |
| High memory usage | Tesseract loads ~100MB WASM on first run; subsequent jobs reuse memory |

---

## Next Steps: Post-Deployment (Optional)

1. **Monitor in Production** (1 week):
   - Watch worker logs for errors
   - Monitor processing times
   - Track OCR success/failure rates

2. **Optimize if Needed**:
   - Increase Railway instance memory if WASM loading causes OOM
   - Scale to 2+ worker instances if processing queues up

3. **Future Enhancements** (not required now):
   - Add Redis + BullMQ for persistent job queue (Phase B)
   - Add Google Cloud Vision fallback if Tesseract accuracy insufficient
   - Add Prometheus metrics + Grafana dashboard for monitoring

---

## Rollback Plan

If deployment has issues:

**API Rollback**:
1. Go to Vercel dashboard
2. Click your project
3. Go to **Deployments**
4. Click the previous stable deployment
5. Click **"Promote to Production"**

**Worker Rollback**:
1. Go to Railway dashboard
2. Select `ocr-worker` service
3. Click **"Revert Deploy"**
4. Select previous stable version

---

## Support & Documentation

- **Deployment Guide**: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- **Production Checklist**: [docs/OCR_PRODUCTION_CHECKLIST.md](docs/OCR_PRODUCTION_CHECKLIST.md)
- **Architecture Docs**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **OCR Engine Code**: [lib/ocr-engine.ts](lib/ocr-engine.ts)
- **Worker Code**: [workers/ocr-poll-worker.ts](workers/ocr-poll-worker.ts)

---

## Deployment Status

✅ **Code Ready**: Commit 8932b99 (main)  
✅ **Build Verified**: 34 routes compiled, 0 errors  
✅ **Configuration**: Zero-cost Tesseract-only OCR  
✅ **Documentation**: Complete deployment guides provided  

**Next**: Follow the 2-Step Deployment above to go live! 🚀
