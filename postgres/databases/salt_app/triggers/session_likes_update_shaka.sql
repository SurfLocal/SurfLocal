-- Trigger to update shaka count when session_likes are inserted or deleted
DROP TRIGGER IF EXISTS update_shaka_count_trigger ON session_likes;
CREATE TRIGGER update_shaka_count_trigger
AFTER INSERT OR DELETE ON session_likes
FOR EACH ROW EXECUTE FUNCTION update_shaka_count();
