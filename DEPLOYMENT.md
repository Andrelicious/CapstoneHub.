# OCR Deployment Guide — Phase A

## Overview
This guide covers deploying the async OCR pipeline to production:
- API remains on Vercel (enqueue-only, returns 202 queued).
- Worker runs on a containerized platform (ECS, Railway, Render, etc.).
- Database polling for job coordination (migration to Redis/BullMQ in Phase B).

---

## 1. Vercel API Deployment

The API now enqueues jobs immediately and returns without blocking. **No changes needed** — just push to main and Vercel auto-deploys.

```bash
# Push to main (already done)
git push origin main

# Vercel will auto-build and deploy
# Verify: POST /api/datasets/{id}/ocr returns { success: true, status: 'queued' } ~200ms
```

### Environment Variables (Vercel)
Ensure these are set in Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (for OCR job writes)
- `OCR_AI_ENDPOINT` — OCR AI endpoint URL (if using)
- `GOOGLE_APPLICATION_CREDENTIALS` — Google Vision credentials (if using)

---

## 2. Worker Deployment

### Option A: Railway (Recommended for rapid deployment)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize and deploy**
   ```bash
   railway init
   railway up
   ```

4. **Set environment variables in Railway dashboard**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OCR_WORKER_MAX_ATTEMPTS=3`
   - `OCR_POLLING_INTERVAL_MS=2000` (poll every 2s)

5. **Verify worker is running**
   ```bash
   railway logs
   # Should see: [ISO-TIMESTAMP] INFO: worker started
   ```

### Option B: AWS ECS

1. **Build Docker image**
   ```bash
   docker build -f Dockerfile.worker -t capstonehub-ocr-worker:latest .
   ```

2. **Push to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com
   docker tag capstonehub-ocr-worker:latest <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/capstonehub-ocr-worker:latest
   docker push <ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/capstonehub-ocr-worker:latest
   ```

3. **Create ECS task definition**
   - Image URI: `<ACCOUNT>.dkr.ecr.us-east-1.amazonaws.com/capstonehub-ocr-worker:latest`
   - Memory: 512 MB
   - CPU: 256
   - Environment: same as Railway

4. **Create ECS service**
   - Task definition: capstonehub-ocr-worker
   - Desired count: 1 (scale up as needed)
   - Auto-scaling: enable on queue depth metrics

### Option C: Docker Compose (Local Testing)

```bash
docker-compose -f docker-compose.worker.yml up
```

See `docker-compose.worker.yml` for local setup.

---

## 3. Verify Deployment

### Health Check
```bash
# Test environment validation
npm run validate:env

# Output should show:
# [OCR-HEALTH] Diagnostic Report at ISO-TIMESTAMP
#   Environment: production
#   Primary Provider: tesseract (or configured)
#   Status: ✓ All configured providers are healthy
```

### End-to-End Test

1. **Submit a dataset via UI** (or curl):
   ```bash
   curl -X POST https://capstonehub.vercel.app/api/datasets/{id}/ocr \
     -H "Authorization: Bearer <user-token>"
   ```

2. **Expect fast response** (~200ms):
   ```json
   { "success": true, "status": "queued" }
   ```

3. **Watch worker logs**:
   ```bash
   # Railway
   railway logs

   # ECS
   aws logs tail /ecs/capstonehub-ocr-worker --follow

   # Local
   docker-compose logs -f ocr-worker
   ```

4. **Verify job processed**:
   ```bash
   # Check ocr_jobs table
   SELECT id, dataset_id, status, created_at, finished_at 
   FROM ocr_jobs 
   ORDER BY created_at DESC 
   LIMIT 5;

   # Should see: status transitions from queued → processing → done (or failed)
   ```

5. **Check OCR results** (via API):
   ```bash
   curl https://capstonehub.vercel.app/api/datasets/{id}/ocr/results \
     -H "Authorization: Bearer <user-token>"
   ```

---

## 4. Monitoring & Scaling

### Metrics to Track
- Job queue depth (queued jobs count)
- Job processing time (p50, p95, p99)
- Job failure rate (failed / total)
- Worker uptime & restarts

### Scaling Strategy
- **1 worker**: handles ~50–100 jobs/hour (small deployments)
- **2–5 workers**: handles 100–500 jobs/hour (medium)
- **10+ workers**: handles 500+ jobs/hour (large)

Scale up when:
- Queue depth > 50 jobs
- Processing latency > 2 minutes
- Worker CPU > 80%

### Logs & Debugging
- Worker logs: `[ISO-TIMESTAMP] INFO/ERROR: message`
- API logs: Vercel dashboard, search for `[OCR:*]` prefix
- Database: `ocr_jobs` table shows job lifecycle

---

## 5. Rollback & Troubleshooting

### Worker Crashes
1. Check logs: `railway logs` or `docker logs`
2. Common issues:
   - Missing `SUPABASE_SERVICE_ROLE_KEY` → worker exits immediately
   - Database connection timeout → retry loop after 2s
   - Out of memory (large PDF) → increase task memory in ECS

### API Timeout (before Phase A)
- Symptom: POST /api/datasets/{id}/ocr returns 502/504
- Cause: previous sync processing was too slow
- Fix: already deployed (Phase A enqueue-only)

### Job Stuck in "processing"
- Symptom: job `status='processing'` for >30 minutes
- Cause: worker crashed mid-job
- Fix: manually update: `UPDATE ocr_jobs SET status='queued' WHERE id=...`

---

## 6. Phase B: Async Queue Upgrade (Coming Soon)

Replace DB polling with BullMQ + Redis:

1. Provision Redis (Upstash, ElastiCache)
2. Install BullMQ: `npm install bullmq ioredis`
3. Replace `workers/ocr-poll-worker.ts` with BullMQ consumer
4. Add dead-letter queue and auto-retry
5. Migrate existing queued jobs to Redis

Timeline: 2–3 weeks after Phase A stabilizes.

---

## Quick Start (Summary)

```bash
# 1. Ensure main branch is deployed
git push origin main  # Vercel auto-deploys

# 2. Deploy worker to Railway (recommended)
npm install -g @railway/cli
railway login
railway init
railway up
# Set env vars in Railway dashboard

# 3. Test
npm run validate:env
# Submit a dataset; watch worker logs and verify job completes

# 4. Monitor
# Visit Vercel dashboard and Railway logs
```

---

**Status**: Phase A deployment ready. Worker scaffold tested locally; ready for containerized production deployment.
