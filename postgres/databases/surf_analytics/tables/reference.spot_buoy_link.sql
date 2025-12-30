/*
 * Table: spot_buoy_link
 * 
 * Description:
 *   This table establishes a many-to-many relationship between spots and buoys.
 *   It links a spot with one or more buoys using their respective IDs.
 * 
 * Modifications:
 *   This table will not have any records inserted or removed manually.
 */
CREATE TABLE IF NOT EXISTS reference.spot_buoy_link (
    spot_id INT,
    buoy_id INT,
    PRIMARY KEY (spot_id, buoy_id),
    FOREIGN KEY (spot_id) REFERENCES reference.spot_info(id),
    FOREIGN KEY (buoy_id) REFERENCES reference.buoy_info(id)
);

-- Insert seed data (idempotent - ON CONFLICT DO NOTHING)
INSERT INTO reference.spot_buoy_link (spot_id, buoy_id)
VALUES
-- Del Mar Nearshore and Torrey Pines Outer linked with both Del Mar spots
(6, 46266),  -- Del Mar (15th Street) with Del Mar Nearshore
(6, 46225),  -- Del Mar (15th Street) with Torrey Pines Outer
(7, 46266),  -- Del Mar (25th Street) with Del Mar Nearshore
(7, 46225),  -- Del Mar (25th Street) with Torrey Pines Outer

-- Torrey Pines Outer and Scripps Nearshore linked with Blacks and Scripps
(5, 46225),  -- Blacks with Torrey Pines Outer
(4, 46254),  -- Scripps with Scripps Nearshore

-- Mission Bay West and Point Loma South linked with Pacific Beach Drive, Sunset Cliffs, and Ocean Beach
(3, 46258),  -- Pacific Beach Drive with Mission Bay West
(1, 46258),  -- Sunset Cliffs with Mission Bay West
(2, 46258),  -- Ocean Beach with Mission Bay West
(3, 46232),  -- Pacific Beach Drive with Point Loma South
(1, 46232),  -- Sunset Cliffs with Point Loma South
(2, 46232)   -- Ocean Beach with Point Loma South
ON CONFLICT (spot_id, buoy_id) DO NOTHING;
