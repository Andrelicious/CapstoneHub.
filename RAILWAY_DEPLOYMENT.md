# Railway Deployment Guide — Tesseract-Only OCR Worker

## Prerequisites

1. **Railway Account**: Sign up at https://railway.app (free tier available)
2. **GitHub Connected**: Railway will connect to your GitHub repo
3. **Supabase Credentials**: Have these ready:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## Deployment Steps

### 1. Connect GitHub to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub"**
3. Authorize Railway to access your GitHub account
4. Select repository: **CapstoneHub** (or your repo name)
5. Select branch: **main**
6. Railway will detect the project and ask which service to deploy

### 2. Configure Railway Project

In Railway dashboard:

1. **Create New Service** → **"Docker"**
2. **Dockerfile Path**: `./Dockerfile.worker`
3. **Service Name**: `ocr-worker`

### 3. Set Environment Variables in Railway

Go to **Project Settings → Variables** and add:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://lhlkgyowrygzbhtrfibv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
OCR_PROVIDER=tesseract
OCR_ENABLE_PROVIDER_FAILOVER=false
OCR_TESSERACT_LANG=eng
OCR_TESSERACT_TIMEOUT_MS=240000
OCR_WORKER_POLL_INTERVAL_MS=2000
OCR_WORKER_MAX_ATTEMPTS=3
```

### 4. Deploy

1. Click **"Deploy"** button
2. Railway builds Docker image and starts the worker
3. Monitor logs in Railway dashboard
4. Wait for: `[worker started]` message in logs

### 5. Verify Deployment

Once deployed, check logs for:
```
[worker started]
[INFO: worker polling for queued jobs...]
```

If you see error messages about Supabase credentials, re-check your environment variables.

---

## Expected Logs on Production

**Successful worker startup:**
```
[2026-05-05T15:46:37.401Z] INFO: worker started
[2026-05-05T15:46:40.123Z] INFO: polling for queued jobs...
```

**OCR job processing:**
```
[2026-05-05T15:47:10.456Z] INFO: claimed job: {jobId: "abc-123", dataset_id: 45}
[2026-05-05T15:47:15.789Z] INFO: [OCR:Tesseract] Processing... file="document.pdf"
[2026-05-05T15:47:18.012Z] INFO: [OCR:Tesseract] SUCCESS: 2345 chars extracted
[2026-05-05T15:47:20.345Z] INFO: job {jobId: "abc-123"} status updated to done
```

---

## Scaling

- **Memory**: Worker uses ~150-200MB per instance
- **Concurrency**: Run 1-2 workers (Railway can scale horizontally)
- **Cost**: Railway free tier includes $5 credits/month; worker typically costs $0-5/month

To scale: Go to Railway dashboard → Select service → Increase replicas count

---

## Monitoring & Troubleshooting

### Worker not starting?
- Check logs in Railway: **Project → ocr-worker → Logs**
- Verify all environment variables are set (especially `SUPABASE_SERVICE_ROLE_KEY`)
- Verify Supabase URL is accessible

### Jobs not being processed?
- Confirm database polling interval: `OCR_WORKER_POLL_INTERVAL_MS=2000`
- Check if jobs exist in Supabase: `ocr_jobs` table should have `status='queued'` rows
- Verify Supabase service role key has write permissions on `ocr_jobs` table

### Memory issues?
- Increase Railway instance memory: **Settings → Instance Memory** (default 512MB)
- Consider running multiple smaller instances vs. one large instance

---

## Rollback

If deployment fails:
1. Go to Railway dashboard
2. Select the `ocr-worker` service
3. Click **"Revert Deploy"** to previous version
4. Or disconnect and re-deploy after fixing issues

---

## Production Health Checks

After deployment, test end-to-end:

```bash
# 1. Submit a PDF for OCR
curl -X POST https://your-vercel-app.vercel.app/api/datasets/[DATASET_ID]/ocr \
  -H "Authorization: Bearer [TOKEN]"
# Expected: { success: true, status: 'queued' }

# 2. Poll status (should progress: queued → processing → done)
curl https://your-vercel-app.vercel.app/api/datasets/[DATASET_ID]/ocr/status

# 3. Fetch results
curl https://your-vercel-app.vercel.app/api/datasets/[DATASET_ID]/ocr/results
# Expected: { full_text: "extracted document text...", ... }
```

---

## Support

For issues:
1. Check Railway logs for error details
2. Verify Supabase connectivity: test with `psql` connection string
3. Review `docs/OCR_PRODUCTION_CHECKLIST.md` for diagnostics
