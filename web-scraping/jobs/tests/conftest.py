"""
Pytest configuration and shared fixtures for scraper tests.
"""
import pytest
import os
from unittest.mock import MagicMock, patch
from io import StringIO
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock boto3 and psycopg2 before importing scraper modules
sys.modules['boto3'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

@pytest.fixture
def mock_logger():
    """Mock Logger instance for testing."""
    logger = MagicMock()
    logger.log_json = MagicMock()
    return logger

@pytest.fixture
def mock_db_connection():
    """Mock PostgresConnection for testing."""
    with patch('utils.PostgresConnection') as mock_conn:
        mock_instance = MagicMock()
        mock_conn.return_value.__enter__.return_value = mock_instance
        yield mock_instance

@pytest.fixture
def mock_env_vars():
    """Mock environment variables."""
    env_vars = {
        'DB_HOST': 'test_host',
        'DB_USER': 'test_user',
        'DB_PASSWORD': 'test_password',
        'DB_NAME': 'test_db',
        'API_KEY': 'test_api_key'
    }
    with patch.dict(os.environ, env_vars):
        yield env_vars

@pytest.fixture
def sample_swell_html():
    """Sample HTML response from NOAA buoy page."""
    return """
    <html>
    <body>
        <table>
            <tr><th>Wave Summary</th></tr>
            <tr><td>Significant Wave Height</td><td>6.5 ft</td></tr>
            <tr><td>Dominant Wave Period</td><td>12 s</td></tr>
            <tr><td>Swell Height</td><td>5.2 ft</td></tr>
            <tr><td>Swell Period</td><td>14 s</td></tr>
            <tr><td>Swell Direction</td><td>WNW</td></tr>
            <tr><td>Wind Wave Height</td><td>2.3 ft</td></tr>
            <tr><td>Wind Wave Period</td><td>6 s</td></tr>
            <tr><td>Wind Wave Direction</td><td>NW</td></tr>
            <tr><td>Steepness</td><td>AVERAGE</td></tr>
            <tr><td>Average Period</td><td>8.5 s</td></tr>
        </table>
        <table>
            <thead>
                <tr><th>Date</th><th>WDIR</th><th>WSPD</th><th>TIDE</th></tr>
            </thead>
            <tbody>
                <tr><th>2025-12-30 01:50</th><td>NW</td><td>21.4</td><td>+0.5</td></tr>
                <tr><th>2025-12-30 01:40</th><td>NW</td><td>23.3</td><td>-0.3</td></tr>
            </tbody>
        </table>
    </body>
    </html>
    """

@pytest.fixture
def sample_wave_df():
    """Sample Wave Summary DataFrame for testing."""
    import pandas as pd
    return pd.DataFrame([
        ['Significant Wave Height', '6.5 ft'],
        ['Swell Height', '5.2 ft'],
        ['Swell Period', '14 s'],
        ['Swell Direction', 'WNW'],
        ['Wind Wave Height', '2.3 ft'],
        ['Wind Wave Period', '6 s'],
        ['Wind Wave Direction', 'NW'],
        ['Steepness', 'AVERAGE'],
        ['Average Period', '8.5 s']
    ], columns=[0, 1])

@pytest.fixture
def sample_tide_df():
    """Sample tide DataFrame for testing."""
    import pandas as pd
    return pd.DataFrame([
        ['2025-12-30 01:50', 'NW', '21.4', '+0.5']
    ], columns=[0, 1, 2, 3])

@pytest.fixture
def sample_wind_api_response():
    """Sample API response from OpenWeather."""
    return {
        "wind": {
            "speed": 5.5,
            "deg": 270,
            "gust": 8.2
        },
        "main": {
            "temp": 285.5
        }
    }
