/*
 * L.Grid displays a grid of lat/lng lines on the map.
 * 
 */

L.Grid = L.GeoJSON.extend({
	options: {
		tickRes: 300, // how many pixels between ticks, good range is between 30 and 200, I like 80
		// 'decimal' or one of the templates below
		coordStyle: 'MinDec',
		coordTemplates: {
			'MinDec': '{degAbs}&deg;&nbsp;{minDec}\'{dir}',
			'DMS': '{degAbs}{dir}{min}\'{sec}"'
		},

		// Path style for the grid lines
		lineStyle: {
			stroke: true,
			color: '#111',
			opacity: 0.6,
			weight: 1
		},

		// Redraw on move or moveend
		redraw: 'move'
	},

	initialize: function (options) {
		L.GeoJSON.prototype.initialize.call(this);
		L.Util.setOptions(this, options);

	},

	onAdd: function (map) {
		this._map = map;

		var grid = this.redraw();
		this._map.on('viewreset '+ this.options.redraw, function () {
			grid.redraw();
		});

		this.eachLayer(map.addLayer, map);
	},

	onRemove: function (map) {
		// remove layer listeners and elements
		map.off('viewreset '+ this.options.redraw, this.map);
		this.eachLayer(this.removeLayer, this);
	},

	redraw: function () {
		// pad the bounds to make sure we draw the lines a little longer
		this._bounds = this._map.getBounds();

		var grid = [];
		var i;

		var latLines = this._latLines();  
		for (i in latLines) {
			if (Math.abs(latLines[i]) > 90) {
				continue;
			}
			grid.push(this._horizontalLine(latLines[i]));  
			grid.push(this._label('lat', latLines[i]));   
		}
				
		var lngLines = this._lngLines();
		for (i in lngLines) {
			grid.push(this._verticalLine(lngLines[i]));
			grid.push(this._label('lng', lngLines[i]));
		}

		this.eachLayer(this.removeLayer, this);

		for (i in grid) {
			this.addLayer(grid[i]);  
		}
		
		return this;
	},

	_latLines: function () {     // makes a simple list of latitudes from which to make lines
		return this._lines(
			this._bounds.getSouth(),
			this._bounds.getNorth(),
			this._map.getSize().y/this.options.tickRes, // used to calculate ticks according to map pixel size 
			this._containsEquator()
		);
	},
	_lngLines: function () {
		return this._lines(
			this._bounds.getWest(),
			this._bounds.getEast(),
			this._map.getSize().x/this.options.tickRes, // used to caclulate ticks according to map pixel size
			this._containsIRM()
		);
	},

	_lines: function (low, high, ticks, containsZero) {
		var delta = high - low;
		var interval;
		if (Math.abs(1/3600*ticks - delta) < Math.abs(1/1800*ticks - delta)) { interval = 1/3600; } // 1"
		else if (Math.abs(1/1800*ticks - delta) < Math.abs(1/720*ticks - delta)) { interval = 1/1800; }  // 2"
		else if (Math.abs(1/720*ticks - delta) < Math.abs(1/360*ticks - delta)) { interval = 1/720; }    // 5"
		else if (Math.abs(1/360*ticks - delta) < Math.abs(1/180*ticks - delta)) { interval = 1/360; }    // 10"
		else if (Math.abs(1/180*ticks - delta) < Math.abs(1/120*ticks - delta)) { interval = 1/180; }    // 20"
		else if (Math.abs(1/120*ticks - delta) < Math.abs(1/60*ticks - delta)) { interval = 1/120; }     // 30"
		else if (Math.abs(1/60*ticks - delta) < Math.abs(1/30*ticks - delta)) { interval = 1/60; }       // 1'
		else if (Math.abs(1/30*ticks - delta) < Math.abs(1/12*ticks - delta)) { interval = 1/30; }       // 2'
		else if (Math.abs(1/12*ticks - delta) < Math.abs(1/6*ticks - delta)) { interval = 1/12; }        // 5'
		else if (Math.abs(1/6*ticks - delta) < Math.abs(1/3*ticks - delta)) { interval = 1/6; }			 // 10'
		else if (Math.abs(1/3*ticks - delta) < Math.abs(1/2*ticks - delta)) { interval = 1/3; }          // 20'
		else if (Math.abs(1/2*ticks - delta) < Math.abs(ticks - delta)) { interval = 1/2; }              // 30'
		else if (Math.abs(ticks - delta) < Math.abs(2*ticks - delta)) { interval = 1; }              // 1 deg
		else if (Math.abs(2*ticks - delta) < Math.abs(5*ticks - delta)) { interval = 2; }
		else if (Math.abs(5*ticks - delta) < Math.abs(10*ticks - delta)) { interval = 5; }
		else if (Math.abs(10*ticks - delta) < Math.abs(20*ticks - delta)) { interval = 10; }
		else { interval = 20; }

		var tick = interval;
		// next we need to round 'low' to be evenly divisable by 'tick' aka 'interval'
		low = Math.floor((low / tick) - (10)) * tick; // draw 10 extract graticules off the map, for overlap
		ticks = delta/interval + 20; // draw extract graticules, 10 before, 10 after the map bounds
		var lines = [];
		for (var i = 1; i <= ticks; i++) {
			lines.push(low + (i * tick)); 
		}
		return lines;
	},

	_containsEquator: function () {
		var bounds = this._map.getBounds();
		return bounds.getSouth() < 0 && bounds.getNorth() > 0;
	},

	_containsIRM: function () {
		var bounds = this._map.getBounds();
		return bounds.getWest() < 0 && bounds.getEast() > 0;
	},

	_verticalLine: function (lng) {
		return new L.Polyline([
			[90, lng], // this creates overlap, helps when printing.
			[-90, lng]
		], this.options.lineStyle);
	},
	_horizontalLine: function (lat) {  // this makes a standard geojson LineString, I think
		return new L.Polyline([
			[lat, this._bounds.getWest()-180],
			[lat, this._bounds.getEast()+180]
		], this.options.lineStyle);
	},


	_label: function (axis, num) {   // axis is either the string 'lat' or 'lng', 
		
		var latlng;
		var bounds = this._map.getBounds().pad(-0.005);
		
		if (axis == 'lng') {
			latlng = L.latLng(bounds.getNorth(), num);
		} else {
			latlng = L.latLng(num, bounds.getWest());
		}

		return L.marker(latlng, {
			icon: L.divIcon({
				iconSize: [0, 0],
				className: 'leaflet-grid-label',
				html: '<div class="' + axis + '">' + this.formatCoord(num, axis) + '</div>'
			})
		});
	},

	_dec2dms: function (num) {
		var deg = Math.floor(num);
		var min = Math.round((num - deg) * 60 * 100)/100;
		var sec = Math.floor((min - Math.floor(min)) * 60);
		return {
			deg: deg,
			degAbs: Math.abs(deg),
			min: Math.floor(min),
			minDec: min,
			sec: sec
		};
	},

	formatCoord: function (num, axis, style) {
		if (!style) {
			style = this.options.coordStyle;
		}
		if (style == 'decimal') {
			var digits;
			if (num >= 10) {
				digits = 2;
			} else if (num >= 1) {
				digits = 3;
			} else {
				digits = 4;
			}
			return num.toFixed(digits);
		} else {
			// Calculate some values to allow flexible templating
			var dms = this._dec2dms(Math.abs(num) + 0.000014); // this rounds it up so you get something like '60' instead of 59.999999
			var dir;
			if (dms.deg === 0) {
				dir = '&nbsp;';
			} else {
				if (axis == 'lat') {
					dir = (num > 0 ? 'N' : 'S');
				} else {
					dir = (num > 0 ? 'E' : 'W');
				}
			}

			return L.Util.template(
				this.options.coordTemplates[style],
				L.Util.extend(dms, {
					dir: dir,
					sec: Math.round(dms.sec)
				})
			);
		}
	}

});

L.grid = function (options) {
	return new L.Grid(options);
};
