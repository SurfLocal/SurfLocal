"""
Unit tests for swell_scraper_hourly.py
"""
import pytest
from unittest.mock import MagicMock, patch, Mock
from datetime import datetime
import pandas as pd
from io import StringIO

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from swell_scraper_hourly import extract_number, fetch_swell_data, insert_swell_data, get_buoy_ids


class TestExtractNumber:
    """Test the extract_number utility function."""
    
    def test_extract_integer(self):
        assert extract_number("Height: 5 ft") == "5"
    
    def test_extract_float(self):
        assert extract_number("Period: 12.5 s") == "12.5"
    
    def test_extract_first_number(self):
        assert extract_number("Wave 6.5 ft at 12 s") == "6.5"
    
    def test_no_number(self):
        assert extract_number("No data available") is None
    
    def test_none_input(self):
        assert extract_number(None) is None
    
    def test_negative_number(self):
        assert extract_number("-2.5") == "2.5"


class TestFetchSwellData:
    """Test the fetch_swell_data function."""
    
    @patch('swell_scraper_hourly.requests.get')
    def test_fetch_failure_bad_status(self, mock_get, mock_logger):
        """Test handling of HTTP error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = fetch_swell_data("99999", mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Failed to fetch data for buoy ID 99999",
            {"buoy_id": "99999"}
        )
    
    @patch('swell_scraper_hourly.requests.get')
    @patch('swell_scraper_hourly.BeautifulSoup')
    def test_no_tables_found(self, mock_bs, mock_get, mock_logger):
        """Test handling when no tables are found on page."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body>No tables here</body></html>"
        mock_get.return_value = mock_response
        
        mock_soup = Mock()
        mock_soup.find_all.return_value = []
        mock_bs.return_value = mock_soup
        
        result = fetch_swell_data("41013", mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "WARNING",
            "No tables found on the page for buoy ID 41013",
            {"buoy_id": "41013"}
        )
    
    @patch('swell_scraper_hourly.requests.get')
    @patch('swell_scraper_hourly.BeautifulSoup')
    def test_no_wave_summary_table(self, mock_bs, mock_get, mock_logger):
        """Test handling when Wave Summary table is not found."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body><table>Other data</table></body></html>"
        mock_get.return_value = mock_response
        
        mock_soup = Mock()
        mock_table = Mock()
        mock_table.text = "Other data"
        mock_soup.find_all.return_value = [mock_table]
        mock_bs.return_value = mock_soup
        
        result = fetch_swell_data("41013", mock_logger)
        
        assert result is None
        mock_logger.log_json.assert_called_with(
            "WARNING",
            "Detailed wave summary table not found for buoy ID 41013",
            {"buoy_id": "41013"}
        )
    
class TestInsertSwellData:
    """Test the insert_swell_data function."""
    
    def test_successful_insert(self, mock_logger, mock_db_connection):
        """Test successful data insertion."""
        mock_db_connection.insert.return_value = True
        
        swell_data = {
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
        
        with patch('swell_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            insert_swell_data(swell_data, mock_logger)
        
        mock_db_connection.insert.assert_called_once()
        mock_logger.log_json.assert_called_with(
            "INFO",
            "Swell data inserted successfully",
            {"buoy_id": '41013'}
        )
    
    def test_failed_insert(self, mock_logger, mock_db_connection):
        """Test handling of failed insertion."""
        mock_db_connection.insert.return_value = False
        
        swell_data = {
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
            'tide': None
        }
        
        with patch('swell_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            insert_swell_data(swell_data, mock_logger)
        
        mock_logger.log_json.assert_called_with(
            "ERROR",
            "Failed to insert swell data",
            {"buoy_id": '41013', "data": swell_data}
        )


class TestGetBuoyIds:
    """Test the get_buoy_ids function."""
    
    def test_successful_retrieval(self, mock_logger, mock_db_connection):
        """Test successful buoy ID retrieval."""
        mock_db_connection.select.return_value = [('41013',), ('46221',), ('46222',)]
        
        with patch('swell_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            result = get_buoy_ids(mock_logger)
        
        assert result == ['41013', '46221', '46222']
        mock_db_connection.select.assert_called_once_with("reference.buoy_info", "id")
    
    def test_no_buoys_found(self, mock_logger, mock_db_connection):
        """Test handling when no buoys are found."""
        mock_db_connection.select.return_value = []
        
        with patch('swell_scraper_hourly.PostgresConnection') as mock_conn:
            mock_conn.return_value.__enter__.return_value = mock_db_connection
            result = get_buoy_ids(mock_logger)
        
        assert result == []
        mock_logger.log_json.assert_called_with(
            "WARNING",
            "No buoy IDs found in the database"
        )
