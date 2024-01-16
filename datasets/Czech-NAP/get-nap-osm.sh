#!/bin/bash

URL=https://www.cyklistevitani.cz/Specialni-stranky/Export-OSM
URL_GET=https://www.cyklistevitani.cz/FOS/download/CV_OSM.csv

DIR=/var/www/poi-importer/datasets/Czech-NAP/

cd $DIR || exit

date

wget -q -Y off -O /dev/null $URL && {
 wget -q -Y off -O nap_cv.csv $URL_GET && {
   echo 'Download OK'
   rm */*/*.json
   python3 $HOME/POI-Importer.git/datasets/Czech-NAP/process_file.py
 }
}

#update current date-time of data
NOW=`date "+%Y-%m-%d %H:%M"`
echo "{ \"updated\" : \"$NOW\"}" >$DIR/updated.json
