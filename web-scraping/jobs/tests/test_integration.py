"""
Integration tests for scraper jobs.
Tests the full workflow from data fetch to database insertion.
"""
import pytest
from unittest.mock import patch, Mock
import requests

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestSwellScraperIntegration:
    """Integration tests for swell scraper workflow."""
    
    @patch('swell_scraper_hourly.PostgresConnection')
    def test_swell_scraper_database_workflow(self, mock_pg_conn, mock_logger):
        """Test database workflow: fetch buoy IDs and insert data."""
        from swell_scraper_hourly import get_buoy_ids, insert_swell_data
        
        # Mock database connection
        mock_db_instance = Mock()
        mock_db_instance.select.return_value = [('41013',), ('46221',)]
        mock_db_instance.insert.return_value = True
        mock_pg_conn.return_value.__enter__.return_value = mock_db_instance
        
        # Test get_buoy_ids workflow
        buoy_ids = get_buoy_ids(mock_logger)
        assert len(buoy_ids) == 2
        assert '41013' in buoy_ids
        assert '46221' in buoy_ids
        
        # Test insert workflow with mock data
        mock_swell_data = {
            'timestamp': '2025-12-30 01:50:00',
            'buoy_id': '41013',
            'wave_height': '6.5',
            'swell_height': '5.2',
            'swell_period': '14',
            'swell_direction': 'WNW',
            'wind_wave_height': '2.3',
            'wind_wave_period': '6',
            'wind_wave_direction': 'NW',
            'wave_steepness': 'AVERAGE',
            'average_wave_period': '8.5',
            'tide': 0.5
        }
        
        insert_swell_data(mock_swell_data, mock_logger)
        
        # Verify database interactions
        assert mock_db_instance.select.call_count == 1
        assert mock_db_instance.insert.call_count == 1
    
    @patch('swell_scraper_hourly.requests.get')
    @patch('swell_scraper_hourly.PostgresConnection')
    def test_swell_scraper_with_failed_fetch(self, mock_pg_conn, mock_get, mock_logger):
        """Test workflow when buoys fail to fetch data due to HTTP errors."""
        from swell_scraper_hourly import get_buoy_ids, fetch_swell_data
        
        # Mock database connection
        mock_db_instance = Mock()
        mock_db_instance.select.return_value = [('41013',), ('99999',)]
        mock_pg_conn.return_value.__enter__.return_value = mock_db_instance
        
        # Mock HTTP responses - all failures (404)
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        # Execute workflow
        buoy_ids = get_buoy_ids(mock_logger)
        successful_fetches = 0
        
        for buoy_id in buoy_ids:
            swell_data = fetch_swell_data(buoy_id, mock_logger)
            if swell_data:
                successful_fetches += 1
        
        # No fetches should succeed
        assert successful_fetches == 0
        
        # Verify errors were logged for failed buoys
        error_calls = [call for call in mock_logger.log_json.call_args_list 
                      if call[0][0] == "ERROR"]
        assert len(error_calls) >= 2


class TestWindScraperIntegration:
    """Integration tests for wind scraper workflow."""
    
    @patch('wind_scraper_hourly.requests.get')
    @patch('wind_scraper_hourly.PostgresConnection')
    def test_full_wind_scraper_workflow(self, mock_pg_conn, mock_get, mock_logger, sample_wind_api_response):
        """Test complete workflow: fetch spot info, scrape wind data, insert to DB."""
        from wind_scraper_hourly import get_spot_info, fetch_wind_data, insert_wind_data
        
        # Mock database connection
        mock_db_instance = Mock()
        mock_db_instance.select.return_value = [
            (1, 37.7749, -122.4194),
            (2, 40.7128, -74.0060)
        ]
        mock_db_instance.insert.return_value = True
        mock_pg_conn.return_value.__enter__.return_value = mock_db_instance
        
        # Mock HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_wind_api_response
        mock_get.return_value = mock_response
        
        # Execute workflow
        spots = get_spot_info(mock_logger)
        assert len(spots) == 2
        
        for spot in spots:
            spot_id, latitude, longitude = spot[0], spot[1], spot[2]
            wind_data = fetch_wind_data(latitude, longitude, mock_logger)
            if wind_data:
                insert_wind_data(spot_id, wind_data, mock_logger)
        
        # Verify database interactions
        assert mock_db_instance.select.call_count == 1
        assert mock_db_instance.insert.call_count == 2
    
    @patch('wind_scraper_hourly.requests.get')
    @patch('wind_scraper_hourly.PostgresConnection')
    def test_wind_scraper_with_api_failure(self, mock_pg_conn, mock_get, mock_logger):
        """Test workflow when API requests fail."""
        from wind_scraper_hourly import get_spot_info, fetch_wind_data, insert_wind_data
        
        # Mock database connection
        mock_db_instance = Mock()
        mock_db_instance.select.return_value = [
            (1, 37.7749, -122.4194),
            (2, 40.7128, -74.0060)
        ]
        mock_db_instance.insert.return_value = True
        mock_pg_conn.return_value.__enter__.return_value = mock_db_instance
        
        # Mock API failure
        mock_get.side_effect = requests.exceptions.ConnectionError("Connection refused")
        
        # Execute workflow
        spots = get_spot_info(mock_logger)
        successful_inserts = 0
        
        for spot in spots:
            spot_id, latitude, longitude = spot[0], spot[1], spot[2]
            wind_data = fetch_wind_data(latitude, longitude, mock_logger)
            if wind_data:
                insert_wind_data(spot_id, wind_data, mock_logger)
                successful_inserts += 1
        
        # No inserts should succeed
        assert successful_inserts == 0
        
        # Verify errors were logged
        error_calls = [call for call in mock_logger.log_json.call_args_list 
                      if call[0][0] == "ERROR"]
        assert len(error_calls) >= 2
    
    @patch('wind_scraper_hourly.requests.get')
    @patch('wind_scraper_hourly.PostgresConnection')
    def test_wind_scraper_with_partial_failures(self, mock_pg_conn, mock_get, mock_logger, sample_wind_api_response):
        """Test workflow with some successful and some failed API calls."""
        from wind_scraper_hourly import get_spot_info, fetch_wind_data, insert_wind_data
        
        # Mock database connection
        mock_db_instance = Mock()
        mock_db_instance.select.return_value = [
            (1, 37.7749, -122.4194),
            (2, 40.7128, -74.0060),
            (3, 34.0522, -118.2437)
        ]
        mock_db_instance.insert.return_value = True
        mock_pg_conn.return_value.__enter__.return_value = mock_db_instance
        
        # Mock mixed responses
        call_count = [0]
        def mock_get_side_effect(url):
            call_count[0] += 1
            if call_count[0] % 2 == 1:  # Odd calls succeed
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = sample_wind_api_response
                return mock_response
            else:  # Even calls fail
                raise requests.exceptions.Timeout("Request timed out")
        
        mock_get.side_effect = mock_get_side_effect
        
        # Execute workflow
        spots = get_spot_info(mock_logger)
        successful_inserts = 0
        
        for spot in spots:
            spot_id, latitude, longitude = spot[0], spot[1], spot[2]
            wind_data = fetch_wind_data(latitude, longitude, mock_logger)
            if wind_data:
                insert_wind_data(spot_id, wind_data, mock_logger)
                successful_inserts += 1
        
        # Should have partial success
        assert 0 < successful_inserts < len(spots)


class TestCrossScraperIntegration:
    """Integration tests involving both scrapers."""
    
    @patch('swell_scraper_hourly.PostgresConnection')
    @patch('wind_scraper_hourly.PostgresConnection')
    def test_database_connection_reuse(self, mock_wind_pg, mock_swell_pg, mock_logger):
        """Test that both scrapers can use database connections properly."""
        from swell_scraper_hourly import get_buoy_ids
        from wind_scraper_hourly import get_spot_info
        
        # Mock database instances
        mock_swell_db = Mock()
        mock_swell_db.select.return_value = [('41013',)]
        mock_swell_pg.return_value.__enter__.return_value = mock_swell_db
        
        mock_wind_db = Mock()
        mock_wind_db.select.return_value = [(1, 37.7749, -122.4194)]
        mock_wind_pg.return_value.__enter__.return_value = mock_wind_db
        
        # Execute both scrapers' DB queries
        buoy_ids = get_buoy_ids(mock_logger)
        spots = get_spot_info(mock_logger)
        
        assert len(buoy_ids) == 1
        assert len(spots) == 1
        
        # Verify both connections were used
        assert mock_swell_db.select.call_count == 1
        assert mock_wind_db.select.call_count == 1
