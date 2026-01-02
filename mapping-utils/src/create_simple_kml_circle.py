from geopy import Point
from geopy.distance import geodesic

from root_dir import KML_DIR
from settings import CIRCLE_LINE_COLOR, CIRCLE_LINE_WIDTH, CIRCLE_CENTER_LONGITUDE, CIRCLE_RADIUS_KM, CBC_NAME, \
    CIRCLE_CENTER_LATITUDE, CIRCLE_KML_FILE


def create_simple_kml_circle():
    kml_file = open(f"{KML_DIR}/{CIRCLE_KML_FILE}", "w")
    print(f"Writing to {kml_file.name}")
    kml_file.write(f'''<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
        <name>{CBC_NAME} CBC</name>
        <Placemark>
            <name>{CBC_NAME} Circle</name>         
            <Style>
                <IconStyle>
                    <Icon/>
                </IconStyle>
                <LineStyle>
	                <color>{CIRCLE_LINE_COLOR}</color>
	                <width>{CIRCLE_LINE_WIDTH}</width>
	            </LineStyle>
            </Style>
            <LineString>
	            <tessellate>1</tessellate>
	            <coordinates>{",".join(circle_coordinates())}</coordinates>
	        </LineString>
	    </Placemark>
	</Document>
</kml>''')
    kml_file.close()

def circle_coordinates():
    center_point = Point(CIRCLE_CENTER_LATITUDE, CIRCLE_CENTER_LONGITUDE)
    circle_points = []
    for bearing in range(361):
        destination = geodesic(kilometers=CIRCLE_RADIUS_KM).destination(center_point, bearing)
        circle_points.append(f"{destination.longitude},{destination.latitude},0.0")
    return circle_points


if __name__ == "__main__":
    create_simple_kml_circle()