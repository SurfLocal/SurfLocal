-- Trigger to update boards.updated_at on row update
CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON public.boards
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TRIGGER update_boards_updated_at ON public.boards IS 'Automatically updates updated_at timestamp on board changes';
