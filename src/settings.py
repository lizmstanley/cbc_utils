import os

from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

EBIRD_API_TOKEN = os.getenv("EBIRD_API_TOKEN")
LATITUDE=os.getenv("CIRCLE_CENTER_LATITUDE")
LONGITUDE=os.getenv("CIRCLE_CENTER_LONGITUDE")
DISTANCE=os.getenv("CIRCLE_RADIUS_KM", default="12.0701")
DAYS_BACK=os.getenv("DAYS_BACK", default="7")
