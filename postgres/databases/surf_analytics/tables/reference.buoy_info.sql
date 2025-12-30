/*
 * Table: buoy_info
 * 
 * Description:
 *   This table stores information about various buoys, including the buoy's name,
 *   latitude, and longitude. The 'id' field represents the NOAA station ID, which
 *   is unique for each buoy, ensuring that no two buoys share the same identifier.
 * 
 * Modifications:
 *   This table will not have any records inserted or removed manually.
 */
CREATE TABLE IF NOT EXISTS reference.buoy_info (
    id INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL
);

-- Insert seed data (idempotent - ON CONFLICT DO NOTHING)
INSERT INTO reference.buoy_info (id, name, latitude, longitude) VALUES
(46274, 'Leucadia Nearshore', 33.062, -117.314),
(46225, 'Torrey Pines Outer', 32.933, -117.391),
(46266, 'Del Mar Nearshore', 32.957, -117.279),
(46254, 'Scripps Nearshore', 32.868, -117.267),
(46258, 'Mission Bay West', 32.749, -117.502),
(46232, 'Point Loma South', 32.517, -117.425),
(46235, 'Imperial Beach Nearshore', 32.570, -117.169)
ON CONFLICT (id) DO NOTHING;
