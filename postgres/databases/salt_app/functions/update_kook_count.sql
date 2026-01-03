-- Function to automatically update total_kooks_received in profiles
-- when session_kooks are inserted or deleted
CREATE OR REPLACE FUNCTION update_kook_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET total_kooks_received = total_kooks_received + 1
    WHERE user_id = (SELECT user_id FROM sessions WHERE id = NEW.session_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET total_kooks_received = GREATEST(0, total_kooks_received - 1)
    WHERE user_id = (SELECT user_id FROM sessions WHERE id = OLD.session_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
