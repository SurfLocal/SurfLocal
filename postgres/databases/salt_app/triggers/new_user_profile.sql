-- Trigger to create profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auth.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically creates a profile when a new user signs up';
