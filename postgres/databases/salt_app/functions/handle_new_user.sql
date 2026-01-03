-- Function to create profile when new user is created
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auth.handle_new_user() IS 'Automatically creates a profile when a new user signs up';
