-- Trigger to update kook count when session_kooks are inserted or deleted
DROP TRIGGER IF EXISTS update_kook_count_trigger ON session_kooks;
CREATE TRIGGER update_kook_count_trigger
AFTER INSERT OR DELETE ON session_kooks
FOR EACH ROW EXECUTE FUNCTION update_kook_count();
