import os
import zipfile
from enum import StrEnum, auto
from xml.sax.saxutils import escape

from mapping_utils.src.create_simple_kml_circle import create_simple_kml_circle
from mapping_utils.src.ebird import fetch_ebird_obs, fetch_ebird_hotspots
from mapping_utils.src.root_dir import KML_DIR
from mapping_utils.src.settings import CIRCLE_KML_FILE, CBC_NAME


class ObType(StrEnum):
    NOTABLE = auto()
    RECENT = auto()

class ObStatus(StrEnum):
    CONFIRMED = auto()
    PROVISIONAL = auto()


def parse_obs(ob_type: ObType):
    obs = fetch_ebird_obs(ob_type)
    confirmed_icon = f"{ob_type}_{ObStatus.CONFIRMED}"
    provisional_icon = f"{ob_type}_{ObStatus.PROVISIONAL}"
    obs_map = open(f"{KML_DIR}/cbc_obs_map.kml", "w")
    kml_start(obs_map, f"{CBC_NAME} CBC Ebird Recent Sightings", [confirmed_icon, provisional_icon])
    obs_file_confirmed = open(f"{KML_DIR}/cbc_obs_{ob_type}_{ObStatus.CONFIRMED}.kml", "w")
    obs_file_provisional = open(f"{KML_DIR}/cbc_obs_{ob_type}_{ObStatus.PROVISIONAL}.kml", "w")
    map_name = "Recent"
    if ob_type == "notable":
        map_name += " Notables"
    kml_start(obs_file_confirmed, f"{map_name} (confirmed)", [confirmed_icon])
    kml_start(obs_file_provisional, f"{map_name} (provisional)", [provisional_icon])
    for ob in obs:
        placemark = create_ob_placemark(ob)
        if not ob["obsValid"]:
            obs_file_provisional.write(placemark)
            continue
        obs_file_confirmed .write(placemark)
    kml_end(obs_file_confirmed )
    kml_end(obs_file_provisional)
    obs_file_confirmed.close()
    obs_file_provisional.close()

def parse_ebird_hotspots():
    hotspots = fetch_ebird_hotspots()
    hotspots_data = open(f"{KML_DIR}/cbc_hotspots.kml", "w")
    kml_start(hotspots_data, "eBird Hotspots", "hotspot")
    for hotspot in hotspots:
        placemark = create_hotspot_placemark(hotspot)
        hotspots_data.write(placemark)
    kml_end(hotspots_data)
    hotspots_data.close()

def kml_start(kml_file, map_name, map_icons):
    print(f"Writing to {kml_file.name}")
    kml_file.write(f'''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>{escape(map_name)}</name>
    ''')
    for map_icon in map_icons:
        kml_file.write(f'''
        <Style id="{map_icon}_id">
            <IconStyle>
                <scale>1</scale>
                <Icon>
                    <href>images/{map_icon}.png</href>
                </Icon>
            </IconStyle>
        </Style>''')

def kml_end(kml_file):
    kml_file.write('''
    </Document>
</kml>''')


def create_ob_placemark(ob):
    species, ob_date = [ob["comName"], ob["obsDt"]]
    return f'''
        <Placemark>
            <name>{escape(species)}</name>
            <description><![CDATA[{location_cdata(loc_info=ob)}<br>date: {ob_date}]]></description>
            <styleUrl>#map_icon</styleUrl>
            <ExtendedData>
                {location_elements(loc_info=ob)}  
                <Data name="date">
                    <value>{ob_date}</value>
                </Data>
            </ExtendedData>
            {point_element(loc_info=ob)} 
        </Placemark>'''

def create_hotspot_placemark(hotspot):
    location, latitude, longitude = [hotspot["locName"], hotspot["lat"], hotspot["lng"]]
    return f'''        
        <Placemark>
            <name>{location}</name>
            <description><![CDATA[{location_cdata(loc_info=hotspot)}]]></description>
            <styleUrl>#map_icon</styleUrl>
            <ExtendedData>
                {location_elements(loc_info=hotspot)} 
            </ExtendedData>
            {point_element(loc_info=hotspot)} 
        </Placemark>'''

def location_cdata(loc_info):
    location, latitude, longitude = [loc_info["locName"], loc_info["lat"], loc_info["lng"]]
    return f'''location: {location}<br>latitude: {latitude}<br>longitude: {longitude}'''

def location_elements(loc_info):
    location, latitude, longitude = [loc_info["locName"], loc_info["lat"], loc_info["lng"]]
    return f'''<Data name="location">
                    <value>{escape(location)}</value>
                </Data>
                <Data name="latitude">
                    <value>{latitude}</value>
                </Data>
                <Data name="longitude">
                    <value>{longitude}</value>
                </Data>'''

def point_element(loc_info):
    latitude, longitude = [loc_info["lat"], loc_info["lng"]]
    return f'''<Point>
                <coordinates>
                    {longitude},{latitude},0 
                </coordinates>
            </Point>'''

def create_obs_kmz():
    circle_kml_file = f"{KML_DIR}/{CIRCLE_KML_FILE}"
    obs_image_files = [file for file in os.listdir(f"{KML_DIR}/images") if file.startswith("notable_") or file.startswith("recent_") ]
    if not os.path.isfile(circle_kml_file):
        create_simple_kml_circle()
    with zipfile.ZipFile(f'{KML_DIR}/{CIRCLE_KML_FILE}_obs.kmz', 'w', compression=zipfile.ZIP_STORED) as kmz:
        kmz.write(circle_kml_file, arcname=os.path.basename(CIRCLE_KML_FILE))
        for obs_image_file in obs_image_files:
            kmz.write(f"{KML_DIR}/images/{obs_image_file}", arcname=f"images/{obs_image_file}")

def create_hotspots_kmz():
    circle_kml_file = f"{KML_DIR}/{CIRCLE_KML_FILE}"
    hotspot_image_file= f"{KML_DIR}/images/hotspot.png"
    if not os.path.isfile(circle_kml_file):
        create_simple_kml_circle()
    with zipfile.ZipFile(f'{KML_DIR}/{CIRCLE_KML_FILE}_hotspots.kmz', 'w', compression=zipfile.ZIP_STORED) as kmz:
        kmz.write(circle_kml_file, arcname=os.path.basename(CIRCLE_KML_FILE))
        kmz.write(hotspot_image_file, arcname="images/hotspot.png")

if __name__ == "__main__":
    parse_obs(ObType.RECENT)
    parse_obs(ObType.NOTABLE)
    parse_ebird_hotspots()
    create_obs_kmz()
    create_hotspots_kmz()