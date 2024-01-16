#!/usr/bin/env python3
"""Process POIs from Nadace partnertsvi for OSM import.

Reads input CSV file, convert it and generate tiles for POI-Importer

More info on
 Github: https://github.com/mkyral/osm/tree/master/import/zasilkovna
 @talk-cz: https://lists.openstreetmap.org/listinfo/talk-cz
"""

import csv
import sys
import time
import os
import datetime
import json

import pyproj

#https://github.com/frewsxcv/python-geojson
from geojson import Feature, Point, FeatureCollection

# for distance calculation
from math import sin, cos, tan, sqrt, atan2, radians, pi, floor, log

from locale import atof, setlocale, LC_NUMERIC

import csv
import re

__author__ = "Tomáš Kašpárek"
__copyright__ = "Copyright 2022"
__credits__ = ["Tomáš Kašpárek"]
__license__ = "GPLv3+"
__version__ = "1.0"
__maintainer__ = "Tomáš Kašpárek"
__email__ = "tomas.kasparek@gmail.com"
__status__ = "Test"

# configuration
osm_precision = 7
bbox = {'min': {'lat': 48.55, 'lon': 12.09}, 'max': {'lat': 51.06, 'lon': 18.87}}

#take zoom from one of config files
tiles_config="guest_house/dataset.json"
# where to store POI-Importer tiles
tiles_dir_base="data"

# Get tile xy coors
def latlonToTilenumber(zoom, lat, lon):
    n = (2 ** zoom);
    lat_rad = lat * pi / 180;
    return ({
            "x": floor(n * ((lon + 180) / 360)),
            "y": floor(n * (1 - (log(tan(lat_rad) + 1/cos(lat_rad)) / pi)) / 2) })

def processPhone(phone):
    #remove any spaces
    phone = re.sub(' ', '', phone)

    #save prefix if any
    int_prefix = '+420'
    m = re.search('^\+42[01]', phone)
    if m: 
        int_prefix = m.group(0)

    #remove international prefix if any
    phone = re.sub('^\+?42[01]', '', phone)

    #split to group of 3 numbers
    phone = re.sub('([0-9]{3})', '\\1 ', phone)

    #add international prefix 
    return int_prefix + ' ' + phone.rstrip(' /')

def processURL(url):
    #no web address - return empty to match POI importer OSM data
    if url == "" : return "";

    #remove potential protocol prefix
    phone = re.sub('https?://', '', url)

    #add fixed protocol prefix
    return 'https://' + url.rstrip(' /') + '/'

def processOpeningHours(oh):

    times = {}
    for day in oh:
        if type(oh['monday']) != str:
            continue
        #print(oh[day])
        time = oh[day].replace('–', '-')
        if not time in times:
            times[time] = [day[0:2].capitalize()]
        else:
            times[time].append(day[0:2].capitalize())

    if len(times) == 0:
        return ''

    if len(times.keys()) == 1:
        time = list(times.keys())[0]
        if time == '00:00-23:59' and len(times[time]) == 7:
            return ("24/7")
        if len(times[time]) == 7:
            return (time)

        ret = []
        for day in times[time]:
            ret.append(day)
        return ",".join(ret)+" "+times[time]
    else:
        ret = []
        for time in times.keys():
            ret.append(",".join(times[time])+" "+time)
        return "; ".join(ret)

    #print(3)
    return ''

def reporthook(count, block_size, total_size):
    global start_time
    if count == 0:
        start_time = time.time()
        return
    duration = time.time() - start_time
    progress_size = int(count * block_size)
    speed = int(progress_size / (1024 * duration))
    if total_size != -1:
        percent = int(count*block_size*100/total_size)
        sys.stdout.write("\r...%d%%, %d MB, %d KB/s, %d seconds passed" %
                        (percent, progress_size / (1024 * 1024), speed, duration))
    else:
        sys.stdout.write("\r%d MB, %d KB/s, %d seconds passed" %
                        (progress_size / (1024 * 1024), speed, duration))
    sys.stdout.flush()

# Read input parameters
program_name = sys.argv[0]
arguments = sys.argv[1:]

## len(arguments) < 1

infile = "nap_cv.csv"

if (not os.path.exists(infile)):
    print("Input file does not exists: %s" % infile)
    exit(1)

# Load dataset config file
try:
    with open(tiles_config) as cfg:
        dataset = json.load(cfg)
        print("Zoom: %s" % (dataset['zoom']))
except Exception as error:
    print('Error during loading of dataset configuration file!')
    print(error)
    exit(1)

files = {}

setlocale(LC_NUMERIC, 'cs_CZ.UTF-8')

print("\nLoading CSV file...")
start_time = time.time()
cnt = 0
try:
    with open(infile, newline='', encoding='utf-8') as inputfile:
        reader = csv.reader(inputfile, delimiter=";")
        #skip header
        next(reader, None)

        try:
            for row in reader:
                props = {}

                #print('row: %s %s %s' % (row[0], row[1], row[7]))

                #process just pensions ObjectTypeNodeID=74, ObjectAccommodationTypeNodeID=6732
                if (int(row[1]) == 74 and int(row[7]) == 6732):
                    props['tourism']    = 'guest_house'
                    tiles_dir = 'guest_house' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 74 and int(row[7]) == 6733):
                    props['tourism']    = 'hotel'
                    tiles_dir = 'hotel' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 74 and (int(row[7]) == 6734 or int(row[7]) == 65832)):
                    props['tourism']    = 'hostel'
                    tiles_dir = 'hostel' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 74 and int(row[7]) == 6735):
                    props['tourism']    = 'chalet'
                    tiles_dir = 'chalet' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 74 and int(row[7]) == 65833):
                    props['tourism']    = 'apartment'
                    tiles_dir = 'apartment' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 74 and int(row[7]) == 6736):
                    props['tourism']    = 'motel'
                    tiles_dir = 'motel' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 76):
                    props['tourism']    = 'camp_site'
                    tiles_dir = 'camp_site' + '/' + tiles_dir_base
                    osm_tags='tourism=' + props['tourism']
                elif (int(row[1]) == 281):
                    props['tourism']     = 'information'
                    props['information'] = 'office'
                    tiles_dir = 'information_office' + '/' + tiles_dir_base
                    osm_tags='tourism=information;office'
                else:
                    continue

                print('Id: %s Obj: %s Accomod: %s' % (row[0], row[1], row[7]))

                cnt = cnt+1

                props['ref:nap']    = row[0]
                props['name']       = row[2]
                props['addr']       = row[3]
                props['postal_code'] = row[4]
                props['website']    = processURL(row[8])
                props['email']      = row[9]
                props['phone']      = processPhone(row[10])
                props['capacity']      = row[11]

                lat=atof(row[5])
                lon=atof(row[6])
                #print('lat: %f lon: %f' % (lat, lon))

                props['_note'] = ('<br/>osm: %s</br><b>ObjType:</b> %s, <b>ObjAccomType:</b> %s &nbsp; <a href="https://www.cyklistevitani.cz/Specialni-stranky/OSM-edit.aspx?id=%s">edit</a>' % (osm_tags, row[1], row[7], row[0]))
                feature = Feature(geometry=Point((lon, lat)), properties=props)

                tile = latlonToTilenumber(dataset['zoom'], lat, lon)
                #print('tile: %d, %d' % (tile['x'], tile['y']))
                filename = "%s/%s_%s.json" % (tiles_dir, tile['x'], tile['y'])

                if filename not in files:
                    coll = []
                    files[filename] = coll

                files[filename].append(feature)
        except csv.Error as e:
            sys.exit('file {}, line {}: {}'.format(infile, reader.line_num, e))
except Exception as error:
    print('Error ;-(')
    print(error)
    exit(1)

print ("...CSV file processsed in %ss, Total of %i objects exported" % (round(time.time() - start_time, 2), cnt))

# write tiles
start_time_tiles = time.time()
try:
    for k in sorted(files.keys()):
        feature_collection = FeatureCollection(files[k])

        with open(k, encoding='utf-8', mode='w+') as geojsonfile:
            geojsonfile.write(json.dumps(feature_collection, ensure_ascii=False, indent=2, sort_keys=True))

except Exception as error:
    print('Error :-(')
    print(error)
    exit(1)

print ("...Tiles generated in %ss" % (round(time.time() - start_time_tiles, 2)))

# Get list

local_files = []
for file in sorted(files.keys()):
    local_files.append(file.split('/')[-1])


