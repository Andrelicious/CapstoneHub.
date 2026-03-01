# VERIFY STABILITY FIXES - FINAL CHECKLIST

Run through this checklist to confirm all stability fixes are in place.

---

## ✅ Code Quality Checks

### 1. Browser Client - HMR-Safe
```bash
✓ Check: /lib/supabase/client.ts contains globalThis.__supabaseBrowserClient
```

Should see:
```typescript
declare global {
  var __supabaseBrowserClient: SupabaseClient | undefined
}
```

**Status:** [ ] Verified

---

### 2. Middleware - Cookie Safety
```bash
✓ Check: /lib/supabase/middleware.ts does NOT mutate request.cookies
```

Should see:
```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    supabaseResponse.cookies.set(name, value, options)
  })
}
```

**Should NOT see:** `request.cookies.set()` ❌

**Status:** [ ] Verified

---

### 3. Wizard Logic - Cleaned Up
```bash
✓ Check: /components/dataset-submission-wizard.tsx
```

Should have:
- ✓ Import `useStableRouter` from hooks
- ✓ Step 2 → Step 3 is non-blocking (fire OCR, advance immediately)
- ✓ No corrupted code blocks
- ✓ No broken try/catch blocks

**Status:** [ ] Verified

---

### 4. Stable Router Hook Exists
```bash
✓ Check: /hooks/use-stable-router.ts
```

Should have:
- ✓ Timeout protection (8 seconds)
- ✓ Fallback to window.location
- ✓ Proper error handling

**Status:** [ ] Verified

---

### 5. Loading State Management
```bash
✓ Check: /hooks/use-stable-loading.ts
```

Should have:
- ✓ Auto-clear after 6 seconds
- ✓ Cleanup on unmount
- ✓ startLoading/stopLoading functions

**Status:** [ ] Verified

---

### 6. Demo Config Exists
```bash
✓ Check: /lib/demo-stability-config.ts
```

Should define:
- ✓ OCR timeout (20 seconds)
- ✓ Route timeout (8 seconds)
- ✓ Loading timeout (6 seconds)

**Status:** [ ] Verified

---

## 🔍 Runtime Checks

### Browser Console (F12)

**Before clicking anything:**
```
✓ No "Multiple GoTrueClient instances detected" warning
✓ No red errors in console
✓ No session cookies errors
```

**Status:** [ ] Verified

---

### Login Test

**Test steps:**
1. Go to `/login`
2. Enter credentials
3. Click "Login"
4. Wait for navigation

**Verify:**
```
✓ Dashboard loads in <2 seconds
✓ No frozen page
✓ URL changed to /student/dashboard
✓ Page shows user info correctly
```

**Status:** [ ] Verified

---

### Navigation Test

**Test steps:**
1. Click on a link that changes routes
2. Measure time to new page
3. Click back
4. Try different routes

**Verify:**
```
✓ All routes load in <2 seconds
✓ No hanging navigation
✓ Back button works
✓ Can navigate without getting stuck
```

**Status:** [ ] Verified

---

### File Upload Test

**Test steps:**
1. Go to student dashboard
2. Click "Submit New Capstone"
3. Fill form
4. Click "Next" (creates draft)
5. Select PDF file
6. Click "Upload"
7. Watch for Step 3

**Verify:**
```
✓ Step 1 loads instantly
✓ Step 2 loads instantly after "Next"
✓ File upload completes quickly
✓ Step 3 loads IMMEDIATELY (even if OCR still processing)
✓ OCR indicator shows it's working in background
✓ Can click "Review" before OCR completes
✓ No frozen spinners
```

**Status:** [ ] Verified

---

### Loading States Test

**Test steps:**
1. Look for any loading spinner
2. Leave it spinning
3. Wait 6 seconds
4. See if it auto-clears

**Verify:**
```
✓ Spinners appear during operations
✓ Spinners disappear within 6 seconds (auto-clear)
✓ No spinner ever spins forever
✓ Page is always usable after 6 seconds
```

**Status:** [ ] Verified

---

### Session Stability Test

**Test steps:**
1. Login
2. Go to dashboard
3. Refresh page (F5)
4. Verify still logged in
5. Logout
6. Verify redirect to login

**Verify:**
```
✓ Session persists after refresh
✓ No random logouts
✓ Logout works cleanly
✓ Can login again without issues
```

**Status:** [ ] Verified

---

## 📊 Performance Metrics

**Use DevTools Network tab to verify:**

| Operation | Target | Actual | Pass |
|-----------|--------|--------|------|
| Login | <3s | ___ | [ ] |
| Dashboard load | <2s | ___ | [ ] |
| Step creation | <1s | ___ | [ ] |
| File upload | <3s | ___ | [ ] |
| Page navigation | <2s | ___ | [ ] |

---

## 🎬 Demo Walkthrough Test

**Run through entire demo flow once:**

1. [ ] Login as student (should be fast)
2. [ ] Dashboard loads (should be instant)
3. [ ] Submit New → Step 1 (should be instant)
4. [ ] Fill form, Next → Step 2 (should be instant)
5. [ ] Upload file → Step 3 (SHOULD BE INSTANT)
6. [ ] Review text, Continue → Step 4 (should be instant)
7. [ ] Submit → Success → Dashboard (should be smooth)
8. [ ] Logout
9. [ ] Login as admin (should be fast)
10. [ ] Admin dashboard visible (should be instant)
11. [ ] Can see submissions (should be instant)

**Overall feeling:**
- [ ] System feels responsive
- [ ] No hangs or delays
- [ ] Everything feels modern and smooth
- [ ] Confident this will impress in demo

---

## ✨ Final Sign-Off

- [ ] All code checks passed
- [ ] All runtime checks passed
- [ ] All navigation tests passed
- [ ] Demo walkthrough successful
- [ ] No console errors
- [ ] No stuck loading states
- [ ] No frozen pages
- [ ] Ready for live demo

---

## 📝 Notes Section

Use this to record any issues found and how you fixed them:

```
Issue found: _________________________________
Location: ____________________________________
Fix applied: _________________________________
Verified: [ ]
```

---

## 🚀 READY FOR DEMO?

If all checks are ✓, then yes - your system is demo-ready!

Print this page and keep it nearby during the demo as a checklist.

If anything fails a check:
1. Note it in the Issues section
2. Apply the fix from the documentation
3. Re-run the check
4. Don't proceed to demo until all pass

**Good luck! Your system is solid.** 💪
