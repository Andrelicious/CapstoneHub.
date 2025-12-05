-- Create notifications table for role-based notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'pending_submission', 'capstone_approved', 'capstone_rejected', 'revision_requested', 'comment'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID, -- ID of the capstone or other entity this notification relates to
  is_read BOOLEAN DEFAULT FALSE,
  target_role TEXT, -- 'admin', 'faculty', 'student' or NULL for specific user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications OR role-based notifications for their role
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (
    user_id = auth.uid() 
    OR (
      target_role IS NOT NULL 
      AND target_role IN (
        SELECT role FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (
      target_role IS NOT NULL 
      AND target_role IN (
        SELECT role FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: System can insert notifications (using service role)
CREATE POLICY "Anyone can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create a function to automatically create notification when capstone is submitted
CREATE OR REPLACE FUNCTION notify_on_capstone_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for faculty/admin when new capstone is submitted
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (title, description, reference_id, target_role, type)
    VALUES (
      'New Capstone Submission',
      'A new capstone "' || NEW.title || '" has been submitted for review.',
      NEW.id,
      'faculty',
      'pending_submission'
    );
    INSERT INTO notifications (title, description, reference_id, target_role, type)
    VALUES (
      'New Capstone Submission',
      'A new capstone "' || NEW.title || '" has been submitted for review.',
      NEW.id,
      'admin',
      'pending_submission'
    );
  END IF;
  
  -- Create notification for student when capstone is approved
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, description, reference_id, type)
    VALUES (
      NEW.uploader_id,
      'Capstone Approved',
      'Your capstone "' || NEW.title || '" has been approved!',
      NEW.id,
      'capstone_approved'
    );
  END IF;
  
  -- Create notification for student when capstone is rejected
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, description, reference_id, type)
    VALUES (
      NEW.uploader_id,
      'Capstone Rejected',
      'Your capstone "' || NEW.title || '" has been rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided'),
      NEW.id,
      'capstone_rejected'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS capstone_notification_trigger ON capstones;

-- Create trigger for capstone status changes
CREATE TRIGGER capstone_notification_trigger
AFTER INSERT OR UPDATE OF status ON capstones
FOR EACH ROW
EXECUTE FUNCTION notify_on_capstone_submission();
