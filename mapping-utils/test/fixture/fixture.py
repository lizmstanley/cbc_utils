import json

from mapping_utils.src.ebird import fetch_ebird_hotspots, fetch_ebird_obs

if __name__ == "__main__":
    with open("recent.json", 'w') as f:
        data = fetch_ebird_obs("recent")
        print(data)
        json.dump(data, f, indent=4)
    with open("notable.json", 'w') as f:
        data = fetch_ebird_obs("notable")
        json.dump(data, f, indent=4)
    with open("hotspots.json", "w") as f:
        data = fetch_ebird_hotspots()
        json.dump(data, f, indent=4)