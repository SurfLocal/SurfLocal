/*
 * Table: spot_info
 * 
 * Description:
 *   This table stores information about various spots, including the spot name,
 *   latitude, longitude, and associated buoy IDs.
 *   The 'buoy_ids' column contains a comma-separated list of buoy IDs linked to the spot.
 * 
 * Modifications:
 *   This table will not have any records inserted or removed manually.
 */
CREATE TABLE IF NOT EXISTS reference.spot_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL
);

-- Insert seed data (idempotent - ON CONFLICT DO NOTHING)
INSERT INTO reference.spot_info (name, latitude, longitude)
VALUES 
('Sunset Cliffs', 32.717984, -117.256269),
('Ocean Beach', 32.752463, -117.252912),
('Pacific Beach Drive', 32.790586, -117.255453),
('Scripps', 32.866565, -117.254110),
('Blacks', 32.879067, -117.251771),
('Del Mar (15th Street)', 32.957927, -117.268223),
('Del Mar (25th Street)', 32.969365, -117.269284)
ON CONFLICT (name) DO NOTHING;
