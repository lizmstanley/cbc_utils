import requests

from mapping_utils.src.settings import CIRCLE_CENTER_LATITUDE, EBIRD_API_TOKEN, CIRCLE_CENTER_LONGITUDE, CIRCLE_RADIUS_KM, OBS_DAYS_BACK

ebird_api_url = "https://api.ebird.org/v2"
recent_obs_endpoint = f"{ebird_api_url}/data/obs/geo/recent"
hotspots_endpoint = f"{ebird_api_url}/ref/hotspot/geo"
request_headers = headers = {"X-eBirdApiToken": EBIRD_API_TOKEN, "Accept": "application/json"}
request_params = {"lat": CIRCLE_CENTER_LATITUDE, "lng": CIRCLE_CENTER_LONGITUDE, "dist": CIRCLE_RADIUS_KM}

def fetch_ebird_data(url, params):
    return requests.get(url, params=params, headers=request_headers).json()

def fetch_ebird_obs(ob_type):
   obs_url = recent_obs_endpoint
   if ob_type == "notable":
       obs_url += "/notable"
   print(f"Fetching {ob_type} obs from {obs_url}")
   return fetch_ebird_data(url=obs_url, params = request_params | {"back": OBS_DAYS_BACK, "includeProvisional": True})

def fetch_ebird_hotspots():
    print(f"Fetching hotspots from {hotspots_endpoint}")
    return fetch_ebird_data(url=hotspots_endpoint, params=request_params | {"fmt": "json"})

