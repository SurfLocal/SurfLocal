# Standard Library Imports
import sys
import os
import re
from datetime import datetime
import json
from io import StringIO

# Third-Party Imports
import requests
import pandas as pd
from bs4 import BeautifulSoup

# Local Application Imports
from utils import Logger, PostgresConnection

# Accessing environment variables for DB connection info
DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

def extract_number(text):
    """
    Extract the first numeric value from a given string.

    Args:
        text (str): The input string to extract the numeric value from.

    Returns:
        str or None: The first numeric value found in the string, or None if no number is found.
    """
    match = re.search(r"[\d\.]+", str(text))
    return match.group() if match else None

def fetch_swell_data(buoy_id, logger):
    """
    Fetch swell data from the NOAA buoy website and parse relevant wave and swell information.

    Args:
        buoy_id (str): The ID of the buoy to fetch data for.
        logger (Logger): The logger instance to log messages.

    Returns:
        dict or None: A dictionary containing the parsed wave and swell data, or None if the data could not be fetched or parsed.
    """
    url = f"https://www.ndbc.noaa.gov/station_page.php?station={buoy_id}"
    response = requests.get(url)
    
    if response.status_code != 200:
        logger.log_json("ERROR", f"Failed to fetch data for buoy ID {buoy_id}", {"buoy_id": buoy_id})
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    tables = soup.find_all("table")

    if not tables:
        logger.log_json("WARNING", f"No tables found on the page for buoy ID {buoy_id}", {"buoy_id": buoy_id})
        return None

    # Search for the detailed wave summary table
    detailed_table = next((table for table in tables if "Wave Summary" in table.text), None)

    if not detailed_table:
        logger.log_json("WARNING", f"Detailed wave summary table not found for buoy ID {buoy_id}", {"buoy_id": buoy_id})
        return None

    # Wrap in StringIO to avoid pandas warning
    html_content = str(detailed_table)
    df = pd.read_html(StringIO(html_content))[0]

    try:
        wave_height = extract_number(df.iloc[1, 1]) if len(df) > 1 else None
        swell_height = extract_number(df.iloc[2, 1]) if len(df) > 2 else None
        swell_period = extract_number(df.iloc[3, 1]) if len(df) > 3 else None
        swell_direction = df.iloc[4, 1] if len(df) > 4 else None
        wind_wave_height = extract_number(df.iloc[5, 1]) if len(df) > 5 else None
        wind_wave_period = extract_number(df.iloc[6, 1]) if len(df) > 6 else None
        wind_wave_direction = df.iloc[7, 1] if len(df) > 7 else None
        wave_steepness = df.iloc[8, 1] if len(df) > 8 else None
        average_wave_period = extract_number(df.iloc[9, 1]) if len(df) > 9 else None
    except IndexError:
        logger.log_json("ERROR", f"Failure to extract data from table for buoy ID {buoy_id}", {"buoy_id": buoy_id})
        return None

    return {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "buoy_id": buoy_id,
        "wave_height": wave_height,
        "swell_height": swell_height,
        "swell_period": swell_period,
        "swell_direction": swell_direction,
        "wind_wave_height": wind_wave_height,
        "wind_wave_period": wind_wave_period,
        "wind_wave_direction": wind_wave_direction,
        "wave_steepness": wave_steepness,
        "average_wave_period": average_wave_period
    }

def insert_swell_data(swell_data, logger):
    """
    Insert parsed swell data into the PostgreSQL database.

    Args:
        swell_data (dict): A dictionary containing swell data to be inserted into the database.
        logger (Logger): The logger instance to log messages.
    """
    with PostgresConnection(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) as db_connection:
        if db_connection.insert("ingested.swell_data", {
            "timestamp": swell_data['timestamp'],
            "buoy_id": swell_data['buoy_id'],
            "wave_height": swell_data['wave_height'],
            "swell_height": swell_data['swell_height'],
            "swell_period": swell_data['swell_period'],
            "swell_direction": swell_data['swell_direction'],
            "wind_wave_height": swell_data['wind_wave_height'],
            "wind_wave_period": swell_data['wind_wave_period'],
            "wind_wave_direction": swell_data['wind_wave_direction'],
            "wave_steepness": swell_data['wave_steepness'],
            "average_wave_period": swell_data['average_wave_period']
        }):
            logger.log_json("INFO", "Swell data inserted successfully", {"buoy_id": swell_data['buoy_id']})
        else:
            logger.log_json("ERROR", "Failed to insert swell data", {"buoy_id": swell_data['buoy_id'], "data": swell_data})


def get_buoy_ids(logger):
    """
    Retrieve the list of buoy IDs from the database.

    Returns:
        list: A list of buoy IDs fetched from the database.
    """
    with PostgresConnection(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) as db_connection:
        buoy_ids = db_connection.select("reference.buoy_info", "id")
    
    if not buoy_ids:
        logger.log_json("WARNING", "No buoy IDs found in the database")
        return []

    return [buoy_id[0] for buoy_id in buoy_ids]

if __name__ == "__main__":
    with Logger(job_name="swell-scraper-hourly") as logger:
        buoy_ids = get_buoy_ids(logger)

        if not buoy_ids:
            logger.log_json("WARNING", "No buoy IDs to process swell data for")

        for buoy_id in buoy_ids:
            swell_data = fetch_swell_data(buoy_id, logger)

            if swell_data:
                insert_swell_data(swell_data, logger)
            else:
                logger.log_json("ERROR", "Failed to retrieve or insert swell data", {"buoy_id": buoy_id})
