-- Function to automatically update total_shakas_received in profiles
-- when session_likes are inserted or deleted
CREATE OR REPLACE FUNCTION update_shaka_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET total_shakas_received = total_shakas_received + 1
    WHERE user_id = (SELECT user_id FROM sessions WHERE id = NEW.session_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET total_shakas_received = GREATEST(0, total_shakas_received - 1)
    WHERE user_id = (SELECT user_id FROM sessions WHERE id = OLD.session_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
