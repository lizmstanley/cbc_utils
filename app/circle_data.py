# This is a sample Python script.

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.
import csv
import json
from urllib import request
from urllib.request import Request
import requests

from app.settings import EBIRD_API_TOKEN, DISTANCE, DAYS_BACK, LONGITUDE, LATITUDE

ebird_api_url = "https://api.ebird.org/v2"
recent_obs_endpoint = f"{ebird_api_url}/data/obs/geo/recent"
hotspots_endpoint = f"{ebird_api_url}/ref/hotspot/geo"
request_headers = headers = {"X-eBirdApiToken": EBIRD_API_TOKEN, "Accept": "application/json"}
request_params = {"lat": LATITUDE, "lng": LONGITUDE, "dist": DISTANCE}

def fetch_ebird_data(url, params):
    return requests.get(url, params=params, headers=request_headers).json()

def fetch_ebird_obs(ob_type):
   obs_url = recent_obs_endpoint
   if ob_type == "notable":
       obs_url += "/notable"
   print(f"Fetching {ob_type} obs from {obs_url}")
   return fetch_ebird_data(url=obs_url, params = request_params | {"back": DAYS_BACK, "includeProvisional": True})

def fetch_ebird_hotspots():
    print(f"Fetching hotspots from {hotspots_endpoint}")
    return fetch_ebird_data(url=hotspots_endpoint, params=request_params | {"fmt": "json"})

def parse_obs(ob_type):
    obs = fetch_ebird_obs(ob_type)
    obs_data_valid = open(f"cbc_{ob_type}_valid.csv", "w")
    obs_data_provisional = open(f"cbc_{ob_type}_provisional.csv", "w")
    csv_writer_valid = csv.writer(obs_data_valid)
    print(f"Writing valid {ob_type} obs to {obs_data_valid.name}")
    csv_writer_provisional = csv.writer(obs_data_provisional)
    print(f"Writing provisional {ob_type} obs to {obs_data_provisional.name}")
    header = ["location", "species", "latitude", "longitude", "date"]
    csv_writer_valid.writerow(header)
    csv_writer_provisional.writerow(header)
    for ob in obs:
        vals = [ob["locName"], ob["comName"], ob["lat"], ob["lng"], ob["obsDt"]]
        if not ob["obsValid"]:
            csv_writer_provisional.writerow(vals)
            continue
        csv_writer_valid.writerow(vals)
    obs_data_valid.close()
    obs_data_provisional.close()

def parse_ebird_hotspots():
    hotspots = fetch_ebird_hotspots()
    hotspots_data = open("cbc_hotspots.csv", "w")
    csv_writer_hotspots = csv.writer(hotspots_data)
    print(f"Writing hotspots to {hotspots_data.name}")
    header = ["name", "latitude", "longitude"]
    csv_writer_hotspots.writerow(header)
    for hotspot in hotspots:
        vals = [hotspot["locName"], hotspot["lat"], hotspot["lng"]]
        csv_writer_hotspots.writerow(vals)
    hotspots_data.close()


if __name__ == "__main__":
    parse_obs("notable")
    parse_obs("recent")
    parse_ebird_hotspots()


