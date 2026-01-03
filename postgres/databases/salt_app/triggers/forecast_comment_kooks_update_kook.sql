-- Trigger to update kook count when forecast_comment_kooks are inserted or deleted
DROP TRIGGER IF EXISTS update_forecast_kook_count_trigger ON forecast_comment_kooks;
CREATE TRIGGER update_forecast_kook_count_trigger
AFTER INSERT OR DELETE ON forecast_comment_kooks
FOR EACH ROW EXECUTE FUNCTION update_forecast_kook_count();
