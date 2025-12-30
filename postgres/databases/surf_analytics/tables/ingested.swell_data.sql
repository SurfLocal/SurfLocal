/*
 * Table: swell_data
 * 
 * Description:
 *  This table stores hourly swell data for various buoys. 
 *  It is populated automatically by Argo, and new records are 
 *  inserted every hour. The data includes information about 
 *  wave height, swell period, wind wave direction, and other 
 *  related metrics.
 * 
 * Modifications:
 *   The table is only modified by Argo for hourly data inserts.
 */
CREATE TABLE IF NOT EXISTS ingested.swell_data (
    timestamp TIMESTAMPTZ NOT NULL,
    buoy_id INT NOT NULL,
    wave_height FLOAT DEFAULT NULL,
    swell_height FLOAT DEFAULT NULL,
    swell_period FLOAT DEFAULT NULL,
    swell_direction VARCHAR(255) DEFAULT NULL,
    wind_wave_height FLOAT DEFAULT NULL,
    wind_wave_period FLOAT DEFAULT NULL,
    wind_wave_direction VARCHAR(255) DEFAULT NULL,
    wave_steepness VARCHAR(255) DEFAULT NULL,
    average_wave_period FLOAT DEFAULT NULL,
    PRIMARY KEY (timestamp, buoy_id),
    FOREIGN KEY (buoy_id) REFERENCES reference.buoy_info(id) ON DELETE CASCADE
);
