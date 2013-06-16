var moment = require('moment');
var _ = require('underscore');

var fs = require('fs');
var request = require('request');

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

function GoogleMapExport(options) {
	this.help = {
		name: 'GoogleMapExport',
		description: 'Exports as a static google map',
		options: {
			outputFile: 'File name format for output files, placeholders: %date%',
			dateFormat: 'Date format to use',
			size: 'Size of the map (default: 800x600)',
			zoomFactor: 'Map zoom factor (default: 13)',
            format: 'Image format (default: png, see https://developers.google.com/maps/documentation/staticmaps/?hl=de#ImageFormats)',
			addPlaces: 'Add places as markers (default: false)'
		}
	}

	this.options = _.extend({
		outputFile: '%date%.png',
		dateFormat: 'YYYYMMDD',
		size: '800x600',
		zoomFactor: 13,
        format: 'png',
		addPlaces: false
	}, options);
}

GoogleMapExport.prototype = Object.create(DefaultPlugin.prototype);

GoogleMapExport.prototype.exportDay = function exportDay(day, cb) {
	var points = [];
	var places = [];

	if(!day.segments) {
		cb('This day does not seem to have any segments');
		return;
	}

	day.segments.forEach(function(segment) {
		var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
		var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

		if(segment.type == 'place') {
			places.push({
				name: segment.place.name,
				lat: segment.place.location.lat,
				lon: segment.place.location.lon,
			})
			return;
		}

		// Add movements if we got an activities segment
		if(segment.type == 'move' && Array.isArray(segment.activities)) {
			segment.activities.forEach(function(activity) {
				activity.trackPoints.forEach(function(point) {
					points.push({
						lat: round_coord(point.lat),
						lon: round_coord(point.lon)
					});
				})
			});
		}
	});

	// We need to reduce the count of locations because the maps
	// have a maximum length of 2000 characters or so
	points = reduceLocations(points, 30);

	var base_url = 'http://maps.googleapis.com/maps/api/staticmap?sensor=false&maptype=roadmap';
	var url = base_url + '&format=' + this.options.format + '&size=' + this.options.size + '&scale=1' +
	'&path=color:0x0000ff%7Cweight:5' + coordinates_to_string(points);

	url = url + '&markers=color:blue%7Csize:normal' + coordinates_to_string(places);

	// Save the image
	var writeStream = fs.createWriteStream(this.getFilename(day.date));
	writeStream.on('finish', function(err) {
		if(err) {
			cb(err);
			return;
		}

		cb(null, day.date);
	});

	request(url).pipe(writeStream);
}

function round_coord(x) {
	return Math.round(parseFloat(x) * 10000, 4) / 10000;
}

function coordinates_to_string(coords) {
    var locationString = '';

    coords.forEach(function(point) {
        locationString += '%7C' + point.lat + ',' + point.lon;
    });

    return locationString;
}

function reduceLocations(locations, number) {
    if (locations.length <= number) {
        return locations;
    };

    var distance = locations.length / number;
    var currentObject = 0;
    var newLocations = new Array();

    for (var i = 0; i < number; i++) {
        newLocations.push(locations[Math.round(currentObject)]);
        currentObject += distance;
    }

    newLocations.push(locations[locations.length - 1]);

    return newLocations;
}


exports.Plugin = GoogleMapExport;
