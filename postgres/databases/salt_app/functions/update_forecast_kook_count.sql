-- Function to automatically update total_kooks_received in profiles
-- when forecast_comment_kooks are inserted or deleted
CREATE OR REPLACE FUNCTION update_forecast_kook_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET total_kooks_received = total_kooks_received + 1
    WHERE user_id = (SELECT user_id FROM forecast_comments WHERE id = NEW.comment_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET total_kooks_received = GREATEST(0, total_kooks_received - 1)
    WHERE user_id = (SELECT user_id FROM forecast_comments WHERE id = OLD.comment_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
