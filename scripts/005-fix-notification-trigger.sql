-- Fix the notification trigger to properly handle INSERT vs UPDATE
-- The previous trigger used OLD.status on INSERT which doesn't exist

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS capstone_notification_trigger ON capstones;
DROP FUNCTION IF EXISTS notify_on_capstone_submission();

-- Create improved function that handles both INSERT and UPDATE
CREATE OR REPLACE FUNCTION notify_on_capstone_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: Create notification for faculty/admin when new capstone is submitted with pending status
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
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
  
  -- For UPDATE: Check status transitions
  IF TG_OP = 'UPDATE' THEN
    -- Status changed from pending/draft to pending (resubmission)
    IF NEW.status = 'pending' AND OLD.status != 'pending' THEN
      INSERT INTO notifications (title, description, reference_id, target_role, type)
      VALUES (
        'Capstone Resubmitted',
        'The capstone "' || NEW.title || '" has been resubmitted for review.',
        NEW.id,
        'faculty',
        'pending_submission'
      );
      INSERT INTO notifications (title, description, reference_id, target_role, type)
      VALUES (
        'Capstone Resubmitted',
        'The capstone "' || NEW.title || '" has been resubmitted for review.',
        NEW.id,
        'admin',
        'pending_submission'
      );
    END IF;
    
    -- Capstone approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
      INSERT INTO notifications (user_id, title, description, reference_id, type)
      VALUES (
        NEW.uploader_id,
        'Capstone Approved',
        'Your capstone "' || NEW.title || '" has been approved!',
        NEW.id,
        'capstone_approved'
      );
    END IF;
    
    -- Capstone rejected
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      INSERT INTO notifications (user_id, title, description, reference_id, type)
      VALUES (
        NEW.uploader_id,
        'Capstone Rejected',
        'Your capstone "' || NEW.title || '" has been rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided'),
        NEW.id,
        'capstone_rejected'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for both INSERT and UPDATE on capstones
CREATE TRIGGER capstone_notification_trigger
AFTER INSERT OR UPDATE OF status ON capstones
FOR EACH ROW
EXECUTE FUNCTION notify_on_capstone_submission();
