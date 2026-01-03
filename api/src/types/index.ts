export interface User {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  home_break: string | null;
  years_surfing: number | null;
  longest_streak: number;
  longest_streak_start: Date | null;
  total_shakas_received: number;
  total_kooks_received: number;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  session_date: Date;
  duration_minutes: number | null;
  wave_height: string | null;
  wave_count: number | null;
  wave_consistency: string | null;
  shape: string | null;
  power: string | null;
  crowd: string | null;
  form: string | null;
  rating: string | null;
  gear: string | null;
  notes: string | null;
  board_id: string | null;
  barrel_count: number | null;
  air_count: number | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Board {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  board_type: string | null;
  length_feet: number | null;
  length_inches: number | null;
  volume_liters: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Spot {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string | null;
  difficulty: string | null;
  break_type: string | null;
  created_at: Date;
}

export interface SessionMedia {
  id: string;
  session_id: string;
  user_id: string;
  url: string;
  media_type: string;
  created_at: Date;
}

export interface SessionSwellData {
  id: string;
  session_id: string;
  swell_height: number | null;
  swell_direction: string | null;
  wind_speed: number | null;
  wind_direction: string | null;
  tide_height: number | null;
  created_at: Date;
}

export interface SessionLike {
  id: string;
  session_id: string;
  user_id: string;
  created_at: Date;
}

export interface SessionComment {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  created_at: Date;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: Date;
}

export interface FavoriteSpot {
  id: string;
  user_id: string;
  spot_id: string;
  display_order: number;
  created_at: Date;
}
