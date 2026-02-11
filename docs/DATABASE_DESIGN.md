# Capstone Hub - Database Design Documentation

## Overview
This document describes the complete database schema for the Capstone Hub system, a repository for managing academic capstone projects with role-based access control.

## Database Management System
- **DBMS**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Security**: Row Level Security (RLS) enabled on all tables

---

## Entity Relationship Diagram

\`\`\`
┌──────────────────┐
│   auth.users     │ (Supabase managed)
│─────────────────-│
│ id (PK)          │
│ email            │
│ encrypted_pass   │
└────────┬─────────┘
         │
         │ 1:1
         │
┌────────▼─────────┐
│   profiles       │
│──────────────────│
│ id (PK, FK)      │───┐
│ email            │   │
│ display_name     │   │
│ role             │   │
│ created_at       │   │
│ updated_at       │   │
└──────────────────┘   │
         │             │
         │             │
         │ 1:N         │
         │             │
┌────────▼─────────┐   │
│   capstones      │   │
│──────────────────│   │
│ id (PK)          │   │
│ title            │   │
│ abstract         │   │
│ authors[]        │   │
│ year             │   │
│ category         │   │
│ keywords[]       │   │
│ pdf_url          │   │
│ thumbnail_url    │   │
│ status           │   │
│ rejection_reason │   │
│ uploader_id (FK) │───┘
│ created_at       │
│ updated_at       │
└──────┬───────────┘
       │
       │ 1:N
       │
┌──────▼────────────┐
│  notifications    │
│───────────────────│
│ id (PK)           │
│ user_id (FK)      │
│ type              │
│ title             │
│ description       │
│ reference_id (FK) │
│ is_read           │
│ target_role       │
│ created_at        │
└───────────────────┘
\`\`\`

---

## Table Definitions

### 1. profiles
Extends Supabase auth.users with application-specific user data and role management.

**Purpose**: Store user metadata and role-based access control

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID from Supabase Auth |
| email | TEXT | NOT NULL, UNIQUE | User email address |
| display_name | TEXT | | User's display name |
| role | TEXT | NOT NULL, DEFAULT 'student', CHECK (role IN ('student', 'faculty', 'admin')) | User role for access control |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last profile update timestamp |

**Indexes**:
- Primary key on `id`
- Unique constraint on `email`
- Index on `role` for fast role-based queries

**RLS Policies**:
- Users can view their own profile
- Users can update their own profile (except role)
- Only admins can change user roles

---

### 2. capstones
Stores capstone project submissions and metadata.

**Purpose**: Central repository for all capstone projects with approval workflow

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique capstone identifier |
| title | TEXT | NOT NULL | Project title |
| abstract | TEXT | NOT NULL | Project abstract/description |
| authors | TEXT[] | NOT NULL, DEFAULT '{}' | Array of author names |
| year | INTEGER | NOT NULL | Academic year of submission |
| category | TEXT | NOT NULL | Project category/field |
| keywords | TEXT[] | DEFAULT '{}' | Search keywords |
| pdf_url | TEXT | | URL to PDF document in storage |
| thumbnail_url | TEXT | | URL to project thumbnail image |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK (status IN ('draft', 'pending', 'approved', 'rejected')) | Approval status |
| rejection_reason | TEXT | | Reason for rejection (if rejected) |
| uploader_id | UUID | REFERENCES profiles(id) ON DELETE SET NULL | Student who uploaded the project |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Initial submission timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- Primary key on `id`
- `idx_capstones_status` on `status` - Fast filtering by status
- `idx_capstones_category` on `category` - Fast category searches
- `idx_capstones_year` on `year` - Fast year filtering
- `idx_capstones_uploader` on `uploader_id` - Fast user submission lookups

**RLS Policies**:
1. **Public read for approved**: Anyone can view approved capstones
2. **Own submissions**: Students can view all their submissions (any status)
3. **Faculty/Admin access**: Faculty and admins can view all capstones
4. **Insert own**: Students can insert capstones with their own uploader_id
5. **Update own pending**: Students can update their pending capstones
6. **Faculty/Admin full access**: Faculty and admins can update any capstone

**Triggers**:
- `update_capstones_updated_at` - Automatically updates `updated_at` on modification
- `capstone_notification_trigger` - Creates notifications on status changes

---

### 3. notifications
Manages user and role-based notifications for system events.

**Purpose**: Real-time notification system for capstone workflow events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique notification identifier |
| user_id | UUID | REFERENCES profiles(id) ON DELETE CASCADE | Target user (NULL for role-based) |
| type | TEXT | NOT NULL | Notification type code |
| title | TEXT | NOT NULL | Notification headline |
| description | TEXT | NOT NULL | Detailed notification message |
| reference_id | UUID | | Related capstone ID (if applicable) |
| is_read | BOOLEAN | DEFAULT FALSE | Read/unread status |
| target_role | TEXT | CHECK (target_role IN ('admin', 'faculty', 'student')) | Target role for broadcast notifications |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Notification creation timestamp |

**Notification Types**:
- `pending_submission` - New capstone submitted for review
- `capstone_approved` - Capstone approved by faculty/admin
- `capstone_rejected` - Capstone rejected with reason
- `revision_requested` - Changes requested on submission
- `comment` - Comment or feedback added

**Indexes**:
- Primary key on `id`
- `idx_notifications_user_id` on `user_id` - Fast user notification lookups
- `idx_notifications_target_role` on `target_role` - Fast role-based notifications
- `idx_notifications_created_at` on `created_at DESC` - Chronological ordering

**RLS Policies**:
1. **Read own**: Users can view notifications where `user_id = auth.uid()`
2. **Read role-based**: Users can view notifications targeting their role
3. **Update own**: Users can mark their own notifications as read
4. **System insert**: Service role can create any notification

**Triggers**:
- `capstone_notification_trigger` - Auto-creates notifications on capstone events

---

## Database Triggers & Functions

### 1. update_updated_at_column()
**Purpose**: Automatically maintain `updated_at` timestamp

\`\`\`sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
\`\`\`

**Applied to**: `capstones`, `profiles`

---

### 2. notify_on_capstone_submission()
**Purpose**: Create notifications for capstone workflow events

**Trigger Events**:
- **INSERT with status='pending'**: Notify faculty and admin of new submission
- **UPDATE to 'approved'**: Notify student of approval
- **UPDATE to 'rejected'**: Notify student with rejection reason

\`\`\`sql
CREATE OR REPLACE FUNCTION notify_on_capstone_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- New submission: notify faculty and admin
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending') THEN
    INSERT INTO notifications (title, description, reference_id, target_role, type)
    VALUES (
      'New Capstone Submission',
      'A new capstone "' || NEW.title || '" has been submitted for review.',
      NEW.id, 'faculty', 'pending_submission'
    );
    -- Duplicate for admin role
  END IF;
  
  -- Approval: notify student
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, description, reference_id, type)
    VALUES (
      NEW.uploader_id,
      'Capstone Approved',
      'Your capstone "' || NEW.title || '" has been approved!',
      NEW.id, 'capstone_approved'
    );
  END IF;
  
  -- Rejection: notify student with reason
  IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, description, reference_id, type)
    VALUES (
      NEW.uploader_id,
      'Capstone Rejected',
      'Your capstone "' || NEW.title || '" has been rejected. Reason: ' || 
      COALESCE(NEW.rejection_reason, 'No reason provided'),
      NEW.id, 'capstone_rejected'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
\`\`\`

---

## Security Model

### Row Level Security (RLS)
All tables have RLS enabled to enforce access control at the database level.

### Role Hierarchy
1. **Student** (default)
   - View approved capstones (public)
   - View, create, and edit own submissions
   - Receive notifications about own submissions
   
2. **Faculty**
   - All student permissions
   - View all capstones (any status)
   - Approve/reject capstone submissions
   - Receive notifications about new submissions
   
3. **Admin**
   - All faculty permissions
   - Full CRUD access to all capstones
   - Manage user roles
   - System administration

### Authentication Flow
1. User signs up via Supabase Auth (`auth.users`)
2. Trigger creates profile in `profiles` table with default role='student'
3. Admin can promote users to faculty/admin via role update
4. RLS policies enforce role-based access automatically

---

## Data Flow Diagrams

### Capstone Submission Workflow

\`\`\`
┌─────────┐         ┌──────────────┐         ┌──────────────┐
│ Student │         │   Database   │         │Faculty/Admin │
└────┬────┘         └──────┬───────┘         └──────┬───────┘
     │                     │                        │
     │ 1. Upload capstone  │                        │
     │────────────────────>│                        │
     │  (status='pending') │                        │
     │                     │                        │
     │                     │ 2. Trigger creates     │
     │                     │    notification        │
     │                     │───────────────────────>│
     │                     │    (target_role=       │
     │                     │     'faculty')         │
     │                     │                        │
     │                     │ 3. Faculty reviews     │
     │                     │<───────────────────────│
     │                     │                        │
     │                     │ 4. Update status       │
     │                     │<───────────────────────│
     │                     │   (approved/rejected)  │
     │                     │                        │
     │ 5. Notification sent│                        │
     │<────────────────────│                        │
     │  (user_id=student)  │                        │
     │                     │                        │
\`\`\`

### Notification Delivery

\`\`\`
┌───────────┐
│   Event   │ (INSERT/UPDATE on capstones)
└─────┬─────┘
      │
      ▼
┌─────────────────────┐
│     Trigger         │ notify_on_capstone_submission()
│   Function          │
└─────┬───────────────┘
      │
      ├──────────────┐
      │              │
      ▼              ▼
┌────────────┐  ┌──────────────┐
│User-based  │  │ Role-based   │
│notification│  │ notification │
│            │  │              │
│user_id SET │  │target_role   │
│target_role │  │SET           │
│NULL        │  │user_id NULL  │
└────────────┘  └──────────────┘
\`\`\`

---

## Migration Scripts

The database is set up through sequential SQL migration scripts:

1. **001-create-capstones-table.sql** - Core capstones table with RLS
2. **002-create-admin-user.sql** - Instructions for promoting admin users
3. **003-add-faculty-rls-policy.sql** - Faculty access policies
4. **004-create-notifications-table.sql** - Notifications system
5. **005-fix-notification-trigger.sql** - Fixed trigger for INSERT operations
6. **add-draft-status.sql** - Added 'draft' status for work-in-progress

---

## Performance Considerations

### Indexing Strategy
- **Frequently queried columns**: `status`, `category`, `year`, `role`
- **Foreign keys**: `uploader_id`, `user_id`, `reference_id`
- **Sort columns**: `created_at DESC` for chronological ordering

### Query Optimization
- Use indexes for filtering large result sets
- RLS policies leverage indexed columns (`role`, `status`)
- Partial indexes can be added for specific use cases (e.g., only pending capstones)

### Scalability Notes
- Array fields (`authors[]`, `keywords[]`) use PostgreSQL GIN indexes if full-text search needed
- Consider partitioning `notifications` table by date if volume grows large
- Implement notification cleanup job for old read notifications

---

## Future Enhancements

### Potential Schema Additions

1. **comments table**
   - Allow faculty to leave feedback on capstones
   - Thread-based discussion system

2. **capstone_versions table**
   - Track revision history
   - Store multiple PDF versions

3. **groups table**
   - Organize students into research groups
   - Group-based permissions

4. **tags table**
   - Normalized tagging system
   - Many-to-many relationship with capstones

5. **analytics_events table**
   - Track views, downloads, searches
   - Generate usage reports

---

## Backup and Recovery

### Backup Strategy
- Supabase provides automatic daily backups
- Point-in-time recovery (PITR) available
- Export SQL dumps for additional safety

### Data Retention
- Capstones: Permanent retention
- Notifications: Consider 90-day retention with archive
- Audit logs: If implemented, 1-year retention

---

## Conclusion

This database design provides a robust foundation for the Capstone Hub system with:
- Clear role-based access control
- Automated notification workflow
- Scalable architecture
- Security-first approach with RLS
- Extensible schema for future features

For implementation details, refer to the SQL scripts in `/scripts` directory.
