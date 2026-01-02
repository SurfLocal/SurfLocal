-- Add new session fields for restructured logging
ALTER TABLE public.sessions 
  ADD COLUMN IF NOT EXISTS shape text,
  ADD COLUMN IF NOT EXISTS power text,
  ADD COLUMN IF NOT EXISTS crowd text,
  ADD COLUMN IF NOT EXISTS rating text,
  ADD COLUMN IF NOT EXISTS gear text,
  ADD COLUMN IF NOT EXISTS air_count integer,
  ADD COLUMN IF NOT EXISTS barrel_count integer;

-- Add comment for clarity on rating values
COMMENT ON COLUMN public.sessions.rating IS 'Session rating: dog_shit (0), poor (1), decent (2), fun (3), epic (4)';
COMMENT ON COLUMN public.sessions.shape IS 'Wave shape: jumbled, mushy, closed-out, orderly, peaky, hollow';
COMMENT ON COLUMN public.sessions.power IS 'Wave power: Weak, Medium, Heavy';
COMMENT ON COLUMN public.sessions.crowd IS 'Crowd level: Empty, light, moderate, heavy, Zoo';
COMMENT ON COLUMN public.sessions.gear IS 'Wetsuit/gear: Trunks, 2mm Top, 2mm Suit, 3/2mm Suit, 4/3mm Suit';