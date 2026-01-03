-- Trigger to update sessions.updated_at on row update
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER update_sessions_updated_at ON public.sessions IS 'Automatically updates updated_at timestamp on session changes';
