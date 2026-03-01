# Capstone Hub - System Architecture Guide

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPSTONE HUB SYSTEM                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│   FRONTEND      │      │    BACKEND       │      │   DATABASE   │
│ (Next.js + React)      │  (Server Actions)│      │  (Supabase)  │
├─────────────────┤      ├──────────────────┤      ├──────────────┤
│ - Dashboard UI  │──────│ - Auth callback  │──────│ - users      │
│ - Wizard        │  API │ - File upload    │      │ - profiles   │
│ - Forms         │      │ - OCR submit     │      │ - datasets   │
│ - Role views    │      │ - Role checks    │      │ - roles      │
│                 │      │ - Data fetching  │      │              │
└─────────────────┘      └──────────────────┘      └──────────────┘
         │                      │                         │
         └──────────────────────┼─────────────────────────┘
                       Supabase SDK
```

---

## 📊 Data Flow Diagram

### Login Flow
```
User → /login → Supabase Auth
  │
  └─→ [Credentials verified]
  │
  └─→ /auth/callback → Fetch user profile from DB
  │
  └─→ Check user.role (student/adviser/admin)
  │
  └─→ Redirect to appropriate dashboard
       - student → /student/dashboard
       - adviser → /adviser/dashboard
       - admin → /admin/dashboard
```

### Submission Flow
```
Student → /submit → DatasetSubmissionWizard
  │
  Step 1: Fill form
  ├─→ POST createDatasetDraft() → Save to DB
  │
  Step 2: Upload PDF
  ├─→ POST uploadDatasetFile() → Save to Supabase Storage
  ├─→ INSTANT: Move to Step 3 ✨ (non-blocking)
  ├─→ BACKGROUND: submitForOCR() → Queue OCR job
  │   └─→ pollOcrWithTimeout() → Async polling
  │
  Step 3: Monitor OCR Status
  ├─→ Polling updates UI in real-time
  ├─→ If timeout (20s) → Show placeholder text
  ├─→ User can continue anytime
  │
  Step 4: Review Extracted Text
  ├─→ Can edit text before final submission
  │
  Step 5: Submit for Admin Review
  ├─→ POST submitForAdminReview() → Change status
  ├─→ Redirect to /student/dashboard
```

### Admin Review Flow
```
Admin → /admin/dashboard → View pending submissions
  │
  ├─→ GET all datasets with status='pending_admin_review'
  │
  ├─→ Click submission → View details
  │   ├─→ GET dataset details
  │   ├─→ GET extracted OCR text
  │   ├─→ GET extracted metadata (program, year, etc.)
  │
  ├─→ Review & Decide
  │   ├─→ POST approveSubmission() → status='approved'
  │   └─→ POST rejectSubmission() → status='rejected'
```

---

## 🔐 Authentication & Authorization

### Authentication (Supabase Auth)
```
┌─────────────────────────────────────────┐
│        Supabase Authentication          │
├─────────────────────────────────────────┤
│ • Email/Password sign up & login        │
│ • Session management with HTTP-only     │
│   cookies                               │
│ • JWT tokens for server actions         │
│ • Automatic session refresh             │
└─────────────────────────────────────────┘
```

### Authorization (Role-Based Access Control)
```
┌───────────────────────────────────────────────────┐
│ User Role (from profiles.role in database)        │
├───────────────────────────────────────────────────┤
│                                                   │
│ STUDENT                                           │
│ • Can submit own capstones                       │
│ • Can view own submissions                       │
│ • Can't see other students' work                 │
│ • Can't access admin/adviser features            │
│                                                   │
│ ADVISER                                           │
│ • Can view capstones from advised students       │
│ • Read-only access (no approval)                 │
│ • Can't see other advisers' students             │
│ • Can't access admin features                    │
│                                                   │
│ ADMIN                                             │
│ • Can see all submissions                        │
│ • Can approve/reject capstones                   │
│ • Can add remarks/comments                       │
│ • Full system access                             │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Role Checking (Database-Backed)
```
Request → /app/(app)/layout.tsx
  │
  ├─→ supabase.auth.getUser() → Get authenticated user
  │
  ├─→ supabase.from('profiles').select('role')
  │   .eq('id', user.id).single()
  │   → Fetch role from database ✨ (NO METADATA)
  │
  ├─→ Check if user allowed for this page
  │
  ├─→ If allowed: Render page with user context
  │
  └─→ If denied: redirect() to appropriate dashboard
```

---

## 🗄️ Database Schema (Key Tables)

### users (Supabase Auth)
```
id          UUID (primary key)
email       String (unique)
created_at  Timestamp
updated_at  Timestamp
```

### profiles
```
id              UUID (foreign key → users.id)
email           String
display_name    String
role            String ('student' | 'adviser' | 'admin')
organization    String (optional)
bio             String (optional)
avatar_url      String (optional)
created_at      Timestamp
updated_at      Timestamp
```

### datasets
```
id                    UUID (primary key)
user_id               UUID (foreign key → users.id)
title                 String
description           String
program               String
doc_type              String ('thesis' | 'capstone' | 'research')
school_year           String
category              String
tags                  String[] (array)
status                String ('draft' | 'ocr_processing' | 'pending_admin_review' | 'approved' | 'rejected' | 'returned')
file_path             String (Supabase Storage path)
extracted_text        Text (OCR results)
license               String ('CC-BY-4.0' | etc.)
admin_remarks         Text (optional)
adviser_id            UUID (optional, foreign key → users.id)
created_at            Timestamp
updated_at            Timestamp
```

---

## 🚀 Component Architecture

### Page Hierarchy
```
app/layout.tsx (Root)
├── app/(public)/
│   ├── page.tsx (Home)
│   ├── login/page.tsx (Login)
│   └── signup/page.tsx (Sign up)
│
└── app/(app)/layout.tsx ✨ (User Context Provider)
    ├── student/dashboard/page.tsx
    │   ├── StudentDashboardContent (Client)
    │   └── Uses UserContext for display name, role
    │
    ├── admin/dashboard/page.tsx
    │   └── Admin-only view (role check)
    │
    ├── adviser/dashboard/page.tsx
    │   └── Adviser-only view (role check)
    │
    └── submit/page.tsx
        └── DatasetSubmissionWizard
            ├── Step 1: Project Details
            ├── Step 2: Upload PDF
            ├── Step 3: OCR Status ✨ (Non-blocking)
            ├── Step 4: Review Text
            └── Step 5: Success
```

### Component Tree (Non-Blocking OCR)
```
DatasetSubmissionWizard (Client component)
│
├── Step 1: Form Fields
│   └── handleNext() → createDatasetDraft()
│
├── Step 2: File Upload
│   ├── handleDragDrop()
│   └── handleNext()
│       ├── uploadDatasetFile() → Instant
│       ├── setStep(3) → IMMEDIATELY ✨
│       └── submitForOCR() → Background
│           └── pollOcrWithTimeout() → Async
│
├── Step 3: OCR Monitor ✨ (Key to demo safety)
│   ├── Shows OCR status
│   ├── Updates in real-time
│   ├── Never blocks progression
│   └── Timeout after 20s
│
├── Step 4: Text Review
│   └── Editable textarea with extracted text
│
└── Step 5: Success
    └── Redirect to dashboard
```

---

## 🔄 OCR Processing Pipeline (Non-Blocking)

```
USER UPLOADS FILE
    │
    ├─→ uploadDatasetFile() ✅ (Instant)
    │   └─→ File saved to Supabase Storage
    │
    ├─→ setStep(3) ✨ (IMMEDIATE, no wait)
    │   └─→ User sees OCR progress screen
    │
    └─→ submitForOCR() (Background, fire & forget)
        │
        ├─→ OCR_POLL_INTERVAL_MS = 2000ms
        │   (Check status every 2 seconds)
        │
        ├─→ pollOcrWithTimeout()
        │   │
        │   ├─→ Loop: getOCRStatus(datasetId)
        │   │   └─→ Check every 2 seconds
        │   │
        │   ├─→ If 'done' (before 20s timeout)
        │   │   └─→ getOCRResults() + Show text ✅
        │   │
        │   ├─→ If 'failed'
        │   │   └─→ setOcrUiState('failed') 
        │   │       Show error + placeholder ✅
        │   │
        │   └─→ If timeout (20s max)
        │       └─→ setOcrUiState('timeout')
        │           Show placeholder + continue ✅
        │
        └─→ User can click "Continue" anytime
            └─→ Doesn't wait for OCR completion ✨
```

---

## 📱 Context Provider Pattern (Optimization)

### Problem (Before Optimization)
```
Request → /app/(app)/layout.tsx
  │
  ├─→ Query 1: getUser() from auth
  ├─→ Query 2: /student/dashboard → getUserProfile()
  ├─→ Query 3: /student/dashboard → getSubmissions()
  └─→ Query 4: Navbar → getUserProfile() again ❌
  
RESULT: 4 queries, potential connection pool lock
```

### Solution (After Optimization)
```
Request → /app/(app)/layout.tsx ✨
  │
  ├─→ Query 1: getUser() from auth
  ├─→ Query 2: Get profile + role from DB (ONLY ONCE)
  │
  ├─→ Create UserContext with:
  │   ├─→ userId
  │   ├─→ email
  │   ├─→ role
  │   └─→ displayName
  │
  ├─→ Wrap all children with UserProvider
  │
  └─→ All children read from context (NO NEW QUERIES)
      ├─→ /student/dashboard
      ├─→ navbar (uses context)
      ├─→ student-profile-menu (uses context)
      └─→ etc.

RESULT: 2 queries total, no connection pool issues ✅
```

### Context Type Definition
```typescript
interface UserContextType {
  userId: string
  email: string
  role: 'student' | 'adviser' | 'admin'
  displayName: string
}

export const UserContext = createContext<UserContextType | null>(null)
```

---

## 🔒 Security Measures

### 1. Authentication
- ✅ Supabase Auth handles login/session
- ✅ JWT tokens in HTTP-only cookies
- ✅ Auto session refresh

### 2. Authorization
- ✅ Role-based access control (database-backed)
- ✅ Page-level checks (redirect if not allowed)
- ✅ No metadata leaks (database-only roles)

### 3. Database
- ✅ Row-level security (RLS) policies
- ✅ User can only see own submissions
- ✅ Admin sees all
- ✅ Adviser sees advised students only

### 4. File Storage
- ✅ Files saved to Supabase Storage
- ✅ Access controlled via RLS
- ✅ Encrypted at rest

### 5. Data Validation
- ✅ Input validation on forms
- ✅ File type checking (PDF only)
- ✅ Server-side validation

---

## ⚡ Performance Optimizations

### 1. Single Database Query Per Page
```
layout.tsx → Query once for user profile
           → Provide via context
           → All children use context (no new queries)
```

### 2. Async/Await Pattern
```
uploadFile() → Returns immediately
OCRProcessing → Runs in background
UI → Never blocks, shows status updates
```

### 3. Context Caching
```
User info fetched once per session
Shared across all components
Reduces database load
```

### 4. Optimized Queries
```
SELECT id, role, display_name  (only needed columns)
WHERE user_id = $1            (indexed column)
LIMIT 1                        (single row lookup)
```

---

## 🛡️ Error Handling

### Network Errors
```
Try/Catch → Catch error
         → Display user-friendly message
         → Suggest retry or alternative
```

### OCR Failures
```
OCR fails → setOcrUiState('failed')
         → Show error message
         → Provide placeholder text
         → Allow user to continue
```

### Timeout Protection
```
OCR starts → Set 20s timeout
           → Poll status every 2s
           → If 20s elapsed → Stop waiting
           → Use placeholder text
           → User can continue
```

### Auth Failures
```
No session → Redirect to /login
Wrong role → Redirect to correct dashboard
Expired token → Auto refresh or re-login
```

---

## 📈 Scalability Considerations

### Current Architecture
- ✅ Handles 100s of users/submissions
- ✅ Simple, maintainable code
- ✅ Database queries optimized

### For 1000s of Users
- Add caching layer (Redis)
- Full-text search index on extracted_text
- API rate limiting
- CDN for static assets
- Database connection pooling

### For 10,000+ Users
- Microservices architecture
- Event-driven OCR processing
- Message queue (Kafka, etc.)
- Distributed caching
- Database replication/sharding

---

## 🔧 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Next.js | 16 |
| UI Library | React | 19 |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui | Latest |
| Database | Supabase | PostgreSQL |
| Auth | Supabase Auth | JWT |
| Storage | Supabase Storage | S3-compatible |
| OCR | TBD | TBD |
| Deployment | Vercel | Latest |

---

## 🚦 Demo Safety Features Summary

```
┌────────────────────────────────────────┐
│  DEMO SAFETY ARCHITECTURE              │
├────────────────────────────────────────┤
│                                        │
│ 1. Non-Blocking OCR ✨                │
│    └─→ File upload → Immediately next │
│    └─→ OCR processes asynchronously   │
│                                        │
│ 2. Timeout Protection                  │
│    └─→ Max 20 second wait              │
│    └─→ Graceful fallback after        │
│                                        │
│ 3. Error Handling                      │
│    └─→ All errors caught              │
│    └─→ User-friendly messages         │
│    └─→ Never shows stack traces       │
│                                        │
│ 4. Demo Data Pre-Populated             │
│    └─→ 5 sample submissions           │
│    └─→ No empty states                │
│    └─→ Looks professional             │
│                                        │
│ 5. Optimized Queries                   │
│    └─→ Context provider reduces calls │
│    └─→ No connection pool locks       │
│    └─→ Fast page loads                │
│                                        │
│ 6. Configuration Centralized           │
│    └─→ /lib/demo-mode.ts              │
│    └─→ Easy to adjust timeouts        │
│    └─→ Feature flags for testing      │
│                                        │
└────────────────────────────────────────┘
```

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `/lib/demo-mode.ts` | Demo configuration (timeouts, fallback) |
| `/lib/user-context.ts` | Context type definitions |
| `/components/user-provider.tsx` | Context provider |
| `/components/dataset-submission-wizard.tsx` | Main wizard (non-blocking) |
| `/lib/datasets-actions.ts` | Server actions |
| `/app/(app)/layout.tsx` | App layout with context |
| `/DEMO_FEATURES.md` | Detailed feature guide |
| `/DEMO_QUICK_START.md` | Quick demo script |

---

## ✅ Conclusion

Capstone Hub architecture is designed for:
- **Reliability**: No metadata deps, optimized queries, timeout protection
- **Performance**: Context caching, async operations, minimal DB calls
- **Scalability**: Clean architecture, separates concerns
- **Maintainability**: Simple code, well-documented, centralized config
- **Demo Safety**: Non-blocking operations, graceful errors, fallback content

🟢 **READY FOR PRODUCTION DEMO**

---

For questions about specific components, see:
- `/DEMO_FEATURES.md` - Feature walkthrough
- `/DEMO_QUICK_START.md` - Demo script
- Individual component files for code details
