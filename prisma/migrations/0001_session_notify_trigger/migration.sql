-- Trigger function: fires pg_notify on ConversationSession changes
-- that matter for sidebar and session event subscribers.
CREATE OR REPLACE FUNCTION notify_session_changes()
RETURNS trigger AS $$
DECLARE
  changed_fields text[];
  payload jsonb;
BEGIN
  changed_fields := ARRAY[]::text[];

  IF OLD."agentActiveAt" IS DISTINCT FROM NEW."agentActiveAt" THEN
    changed_fields := array_append(changed_fields, 'agentActiveAt');
  END IF;

  IF OLD."title" IS DISTINCT FROM NEW."title" THEN
    changed_fields := array_append(changed_fields, 'title');
  END IF;

  IF OLD."messageCount" IS DISTINCT FROM NEW."messageCount" THEN
    changed_fields := array_append(changed_fields, 'messageCount');
  END IF;

  IF OLD."lastMessageAt" IS DISTINCT FROM NEW."lastMessageAt" THEN
    changed_fields := array_append(changed_fields, 'lastMessageAt');
  END IF;

  -- Only notify if a watched field actually changed
  IF array_length(changed_fields, 1) > 0 THEN
    payload := jsonb_build_object(
      'sessionId', NEW."id",
      'userId', NEW."userId",
      'changed', to_jsonb(changed_fields)
    );
    PERFORM pg_notify('session_changes', payload::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to ConversationSession table
DROP TRIGGER IF EXISTS session_changes_trigger ON "ConversationSession";
CREATE TRIGGER session_changes_trigger
  AFTER UPDATE ON "ConversationSession"
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_changes();
