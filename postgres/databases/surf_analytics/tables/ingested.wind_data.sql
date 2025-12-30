/*
 * Table: wind_data
 * 
 * Description:
 *  This table stores wind data for various spots. 
 *  It is populated automatically by an Argo process or other data source, and new records are inserted based on timestamps. 
 *  The data includes information about wind speed, direction, and gusts, as well as the spot associated with the data.
 * 
 * Modifications:
 *   The table is modified by Argo for hourly data inserts.
 */
CREATE TABLE IF NOT EXISTS ingested.wind_data (
    timestamp TIMESTAMPTZ NOT NULL,
    spot_id INT NOT NULL,
    wind_speed FLOAT NOT NULL,
    wind_direction INT DEFAULT NULL,
    wind_gust FLOAT DEFAULT NULL,
    PRIMARY KEY (timestamp, spot_id),
    FOREIGN KEY (spot_id) REFERENCES reference.spot_info(id) ON DELETE CASCADE
);
