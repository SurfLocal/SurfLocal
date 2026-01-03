-- Trigger to update shaka count when forecast_comment_likes are inserted or deleted
DROP TRIGGER IF EXISTS update_forecast_shaka_count_trigger ON forecast_comment_likes;
CREATE TRIGGER update_forecast_shaka_count_trigger
AFTER INSERT OR DELETE ON forecast_comment_likes
FOR EACH ROW EXECUTE FUNCTION update_forecast_shaka_count();
