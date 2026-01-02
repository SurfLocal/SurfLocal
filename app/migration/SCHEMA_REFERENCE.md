# Database Schema Reference

Quick reference for the Surf Session Logger database schema.

**Last Updated:** 2026-01-02

---

## Quick Start

For a fresh PostgreSQL setup, run the single combined file:
```bash
psql -U postgres -d your_database -f migration/sql/00_full_schema.sql
```

Or run files individually in order:
```bash
psql -f 01_enums.sql
psql -f 02_tables.sql
psql -f 03_functions.sql
psql -f 04_triggers.sql
psql -f 05_rls_policies.sql
psql -f 06_storage.sql  # Supabase-specific
```

---

## Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `app_role` | admin, moderator, user | User authorization levels |

---

## Tables Overview

### Core User Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `profiles` | User profile data | user_id, display_name, avatar_url, bio |
| `user_roles` | Authorization roles | user_id, role (app_role enum) |

### Surf Data Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `spots` | Surf spot locations | name, location, latitude, longitude, break_type |
| `boards` | User's surfboards | user_id, name, brand, model, dimensions |
| `sessions` | Logged surf sessions | user_id, location, session_date, wave_height, rating |
| `session_media` | Photos/videos | session_id, url, media_type |
| `session_swell_data` | Weather/swell conditions | session_id, swell_height, wind_speed, tide_height |

### Social/Engagement Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `session_likes` | Shakas on sessions | session_id, user_id |
| `session_kooks` | Kook reactions | session_id, user_id |
| `session_comments` | Session comments | session_id, user_id, content |
| `follows` | User relationships | follower_id, following_id |
| `favorite_spots` | Saved favorite spots | user_id, spot_id, display_order |
| `saved_locations` | Custom map locations | user_id, name, latitude, longitude |

### Forecast Discussion Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `forecast_comments` | Spot forecast discussions | spot_id, user_id, content, parent_id |
| `forecast_comment_likes` | Likes on forecast comments | comment_id, user_id |
| `forecast_comment_kooks` | Kooks on forecast comments | comment_id, user_id |

---

## Functions

| Function | Purpose | Usage |
|----------|---------|-------|
| `update_updated_at_column()` | Auto-update timestamps | Trigger function |
| `handle_new_user()` | Create profile on signup | Supabase Auth trigger |
| `has_role(user_id, role)` | Check user authorization | RLS policies, security checks |

---

## Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `update_profiles_updated_at` | profiles | BEFORE UPDATE | update_updated_at_column |
| `update_boards_updated_at` | boards | BEFORE UPDATE | update_updated_at_column |
| `update_sessions_updated_at` | sessions | BEFORE UPDATE | update_updated_at_column |

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `session-media` | Yes | Session photos/videos |
| `avatars` | Yes | User profile pictures |
| `board-photos` | Yes | Surfboard images |

---

## Foreign Key Relationships

```
sessions.board_id → boards.id (SET NULL on delete)
session_media.session_id → sessions.id (CASCADE)
session_swell_data.session_id → sessions.id (CASCADE)
session_likes.session_id → sessions.id (CASCADE)
session_kooks.session_id → sessions.id (CASCADE)
session_comments.session_id → sessions.id (CASCADE)
favorite_spots.spot_id → spots.id (CASCADE)
forecast_comments.spot_id → spots.id (CASCADE)
forecast_comments.parent_id → forecast_comments.id (CASCADE)
forecast_comment_likes.comment_id → forecast_comments.id (CASCADE)
forecast_comment_kooks.comment_id → forecast_comments.id (CASCADE)
```

---

## RLS Policy Summary

### Public Read Access
- spots (anyone)
- session_likes, session_kooks, session_comments (anyone)
- follows (anyone)
- forecast_comments, forecast_comment_likes, forecast_comment_kooks (anyone)
- profiles (anyone can view)

### User-Owned Data (CRUD own only)
- profiles (own profile)
- boards (own boards)
- sessions (own + public sessions viewable)
- session_media (own media)
- favorite_spots (own favorites)
- saved_locations (own locations)

### Admin Privileges
- user_roles (admins can manage all)
- session_comments (admins can delete any)
- forecast_comments (admins can delete any)

---

## Column Types Reference

### Common Patterns

```sql
-- UUID primary key
id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY

-- User reference (no FK to auth.users due to Supabase)
user_id UUID NOT NULL

-- Timestamps
created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()

-- Coordinates
latitude NUMERIC NOT NULL
longitude NUMERIC NOT NULL
```

### Session Fields

| Column | Type | Purpose |
|--------|------|---------|
| location | TEXT | Spot name |
| session_date | TIMESTAMP WITH TIME ZONE | When surfed |
| duration_minutes | INTEGER | Session length |
| wave_height | TEXT | e.g., "3-4" |
| wave_count | INTEGER | Waves caught |
| shape | TEXT | Wave shape |
| power | TEXT | Wave power |
| crowd | TEXT | Crowd level |
| rating | TEXT | Session rating |
| gear | TEXT | Wetsuit worn |
| barrel_count | INTEGER | Barrels scored |
| air_count | INTEGER | Airs landed |
| is_public | BOOLEAN | Visible to others |

---

## Migration File Inventory

| File | Purpose |
|------|---------|
| `00_full_schema.sql` | Complete schema in one file |
| `01_enums.sql` | Custom enum types |
| `02_tables.sql` | All table definitions + FKs |
| `03_functions.sql` | Database functions |
| `04_triggers.sql` | Trigger definitions |
| `05_rls_policies.sql` | Row Level Security |
| `06_storage.sql` | Storage buckets (Supabase) |
| `07_make_admin.sql` | Admin role assignment |
| `08_data_export.sql` | Data export queries |
