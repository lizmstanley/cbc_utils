import os

from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

EBIRD_API_TOKEN = os.getenv("EBIRD_API_TOKEN")
CBC_NAME= os.getenv("CBC_NAME")
CIRCLE_CENTER_LATITUDE=float(os.getenv("CIRCLE_CENTER_LATITUDE"))
CIRCLE_CENTER_LONGITUDE=float(os.getenv("CIRCLE_CENTER_LONGITUDE"))
CIRCLE_RADIUS_KM=float(os.getenv("CIRCLE_RADIUS_KM", default=12.0701))
OBS_DAYS_BACK=int(os.getenv("OBS_DAYS_BACK", default=7))
CIRCLE_LINE_COLOR=os.getenv("CIRCLE_LINE_COLOR", default="ff0000ff")
CIRCLE_LINE_WIDTH=int(os.getenv("CIRCLE_LINE_WIDTH", default=1))
CIRCLE_KML_FILE=os.getenv("CIRCLE_KML_FILE", default="simple_cbc_circle.kml")
