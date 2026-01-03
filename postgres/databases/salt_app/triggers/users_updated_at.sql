-- Trigger to update auth.users.updated_at on row update
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER update_users_updated_at ON auth.users IS 'Automatically updates updated_at timestamp on user changes';
