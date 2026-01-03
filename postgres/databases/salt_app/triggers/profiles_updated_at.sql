-- Trigger to update profiles.updated_at on row update
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER update_profiles_updated_at ON public.profiles IS 'Automatically updates updated_at timestamp on profile changes';
