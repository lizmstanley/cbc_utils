import csv

from mapping_utils.src.ebird import fetch_ebird_obs, fetch_ebird_hotspots
from mapping_utils.src.root_dir import CSV_DIR

def parse_obs(ob_type):
    obs = fetch_ebird_obs(ob_type)
    obs_data_valid = open(f"{CSV_DIR}/cbc_{ob_type}_valid.csv", "w")
    obs_data_provisional = open(f"{CSV_DIR}/cbc_{ob_type}_provisional.csv", "w")
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
    hotspots_data = open(f"{CSV_DIR}/cbc_hotspots.csv", "w")
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


