"""
Unit tests for wind_scraper_hourly.py
"""
import pytest
from unittest.mock import MagicMock, patch, Mock
import requests

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from wind_scraper_hourly import fetch_wind_data, get_spot_info, insert_wind_data


class TestFetchWindData:
    """Test the fetch_wind_data function."""
    
    @patch('wind_scraper_hourly.requests.get')
    def test_successful_fetch(self, mock_get, mock_logger, sample_wind_api_response):
        """Test successful wind data fetch."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_wind_api_response
        mock_get.return_value = mock_response
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is not None
        assert result['wind_speed'] == 5.5
        assert result['wind_direction'] == 270
        assert result['wind_gust'] == 8.2
        
        mock_get.assert_called_once()
        assert 'lat=37.7749' in mock_get.call_args[0][0]
        assert 'lon=-122.4194' in mock_get.call_args[0][0]
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_without_gust(self, mock_get, mock_logger):
        """Test wind data fetch when gust is not available."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "wind": {
                "speed": 3.2,
                "deg": 180
            }
        }
        mock_get.return_value = mock_response
        
        result = fetch_wind_data(40.7128, -74.0060, mock_logger)
        
        assert result is not None
        assert result['wind_speed'] == 3.2
        assert result['wind_direction'] == 180
        assert result['wind_gust'] is None
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_http_error(self, mock_get, mock_logger):
        """Test handling of HTTP errors."""
        mock_get.side_effect = requests.exceptions.HTTPError("404 Not Found")
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Error fetching wind data",
            {"error": "404 Not Found", "latitude": 37.7749, "longitude": -122.4194}
        )
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_connection_error(self, mock_get, mock_logger):
        """Test handling of connection errors."""
        mock_get.side_effect = requests.exceptions.ConnectionError("Connection refused")
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Error fetching wind data",
            {"error": "Connection refused", "latitude": 37.7749, "longitude": -122.4194}
        )
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_timeout(self, mock_get, mock_logger):
        """Test handling of timeout errors."""
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Error fetching wind data",
            {"error": "Request timed out", "latitude": 37.7749, "longitude": -122.4194}
        )
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_missing_wind_key(self, mock_get, mock_logger):
        """Test handling when wind key is missing from response."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"main": {"temp": 285.5}}
        mock_get.return_value = mock_response
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Missing key in API response",
            {"error": "'wind'", "latitude": 37.7749, "longitude": -122.4194}
        )
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_missing_speed_key(self, mock_get, mock_logger):
        """Test handling when speed key is missing from wind data."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "wind": {
                "deg": 270
            }
        }
        mock_get.return_value = mock_response
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Missing key in API response",
            {"error": "'speed'", "latitude": 37.7749, "longitude": -122.4194}
        )
    
    @patch('wind_scraper_hourly.requests.get')
    def test_fetch_with_zero_values(self, mock_get, mock_logger):
        """Test wind data fetch with zero values (calm conditions)."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "wind": {
                "speed": 0.0,
                "deg": 0,
                "gust": 0.0
            }
        }
        mock_get.return_value = mock_response
        
        result = fetch_wind_data(37.7749, -122.4194, mock_logger)
        
        assert result is not None
        assert result['wind_speed'] == 0.0
        assert result['wind_direction'] == 0
        assert result['wind_gust'] == 0.0


class TestGetSpotInfo:
    """Test the get_spot_info function."""
    
    def test_successful_retrieval(self, mock_logger, mock_db_connection):
        """Test successful spot info retrieval."""
        mock_db_connection.select.return_value = [
            (1, 37.7749, -122.4194),
            (2, 40.7128, -74.0060),
            (3, 34.0522, -118.2437)
        ]
        
        with patch('wind_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            result = get_spot_info(mock_logger)
        
        assert len(result) == 3
        assert result[0] == (1, 37.7749, -122.4194)
        assert result[1] == (2, 40.7128, -74.0060)
        assert result[2] == (3, 34.0522, -118.2437)
        
        mock_db_connection.select.assert_called_once_with(
            "reference.spot_info",
            "id, latitude, longitude"
        )
    
    def test_no_spots_found(self, mock_logger, mock_db_connection):
        """Test handling when no spots are found."""
        mock_db_connection.select.return_value = []
        
        with patch('wind_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            result = get_spot_info(mock_logger)
        
        assert result == []
        mock_logger.log_json.assert_called_with(
            "WARNING",
            "No spots found in the database"
        )


class TestInsertWindData:
    """Test the insert_wind_data function."""
    
    @patch('wind_scraper_hourly.datetime')
    def test_successful_insert(self, mock_datetime, mock_logger, mock_db_connection):
        """Test successful wind data insertion."""
        mock_datetime.now.return_value.strftime.return_value = "2025-12-30 01:50:00"
        mock_db_connection.insert.return_value = True
        
        wind_data = {
            'wind_speed': 5.5,
            'wind_direction': 270,
            'wind_gust': 8.2
        }
        
        with patch('wind_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            insert_wind_data(1, wind_data, mock_logger)
        
        mock_db_connection.insert.assert_called_once()
        call_args = mock_db_connection.insert.call_args
        assert call_args[0][0] == "ingested.wind_data"
        assert call_args[0][1]['spot_id'] == 1
        assert call_args[0][1]['wind_speed'] == 5.5
        assert call_args[0][1]['wind_direction'] == 270
        assert call_args[0][1]['wind_gust'] == 8.2
        
        mock_logger.log_json.assert_called_with(
            "INFO",
            "Wind data inserted successfully",
            {"spot_id": 1}
        )
    
    @patch('wind_scraper_hourly.datetime')
    def test_insert_without_gust(self, mock_datetime, mock_logger, mock_db_connection):
        """Test insertion when gust data is not available."""
        mock_datetime.now.return_value.strftime.return_value = "2025-12-30 01:50:00"
        mock_db_connection.insert.return_value = True
        
        wind_data = {
            'wind_speed': 3.2,
            'wind_direction': 180,
            'wind_gust': None
        }
        
        with patch('wind_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            insert_wind_data(2, wind_data, mock_logger)
        
        call_args = mock_db_connection.insert.call_args
        assert call_args[0][1]['wind_gust'] is None
    
    @patch('wind_scraper_hourly.datetime')
    def test_failed_insert(self, mock_datetime, mock_logger, mock_db_connection):
        """Test handling of failed insertion."""
        mock_datetime.now.return_value.strftime.return_value = "2025-12-30 01:50:00"
        mock_db_connection.insert.return_value = False
        
        wind_data = {
            'wind_speed': 5.5,
            'wind_direction': 270,
            'wind_gust': 8.2
        }
        
        with patch('wind_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            insert_wind_data(1, wind_data, mock_logger)
        
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Failed to insert wind data",
            {"spot_id": 1, "data": {
                "spot_id": 1,
                "timestamp": "2025-12-30 01:50:00",
                "wind_speed": 5.5,
                "wind_direction": 270,
                "wind_gust": 8.2
            }}
        )
