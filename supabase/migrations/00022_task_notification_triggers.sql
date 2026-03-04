-- ============================================================
-- Task Notification Triggers
-- Automatically notify task assignee on task changes
-- ============================================================

-- Helper function: insert notification for task assignee
CREATE OR REPLACE FUNCTION notify_task_assignee(
  p_task_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_assignee_id UUID;
  v_project_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get assignee and project from task
  SELECT assignee_id, project_id INTO v_assignee_id, v_project_id
  FROM tasks WHERE id = p_task_id;

  -- Skip if no assignee
  IF v_assignee_id IS NULL THEN
    RETURN;
  END IF;

  -- Skip self-notification (current user = assignee)
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL AND v_actor_id = v_assignee_id THEN
    RETURN;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_assignee_id,
    p_notification_type,
    p_title,
    p_body,
    jsonb_build_object('task_id', p_task_id, 'project_id', v_project_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------
-- Trigger 1: Task assigned
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_task_assigned() RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when assignee actually changed to a non-null value
  IF NEW.assignee_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    PERFORM notify_task_assignee(
      NEW.id,
      'task_assigned',
      'Byl/a jste přiřazen/a k úkolu: ' || NEW.title
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_assigned();

-- -------------------------------------------------------
-- Trigger 2: Task field changes (status, priority, due_date)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_task_fields_changed() RETURNS TRIGGER AS $$
BEGIN
  -- Status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM notify_task_assignee(
      NEW.id,
      'status_changed',
      'Status úkolu změněn: ' || NEW.title,
      OLD.status || ' → ' || NEW.status
    );
  END IF;

  -- Priority changed
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    PERFORM notify_task_assignee(
      NEW.id,
      'task_updated',
      'Priorita úkolu změněna: ' || NEW.title,
      OLD.priority || ' → ' || NEW.priority
    );
  END IF;

  -- Due date changed
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    PERFORM notify_task_assignee(
      NEW.id,
      'task_updated',
      'Termín úkolu změněn: ' || NEW.title
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_task_fields_changed
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status
     OR OLD.priority IS DISTINCT FROM NEW.priority
     OR OLD.due_date IS DISTINCT FROM NEW.due_date)
  EXECUTE FUNCTION trigger_task_fields_changed();

-- -------------------------------------------------------
-- Trigger 3: New comment on task
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_comment_added() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    PERFORM notify_task_assignee(
      NEW.task_id,
      'comment_added',
      'Nový komentář k úkolu',
      LEFT(NEW.body, 100)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comment_added
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_added();

-- -------------------------------------------------------
-- Trigger 4: New photo on task
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_photo_added() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_id IS NOT NULL THEN
    PERFORM notify_task_assignee(
      NEW.task_id,
      'photo_added',
      'Nová fotka k úkolu',
      NEW.caption
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_photo_added
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_photo_added();

-- -------------------------------------------------------
-- Trigger 5: Checklist changes
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_checklist_changed() RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_task_assignee(
    NEW.task_id,
    'checklist_updated',
    'Checklist změněn: ' || NEW.title
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_checklist_changed
  AFTER INSERT OR UPDATE ON checklists
  FOR EACH ROW
  EXECUTE FUNCTION trigger_checklist_changed();
