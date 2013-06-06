var moment = require('moment');
var _ = require('underscore');

var fs = require('fs');
var request = require('request');

function GoogleMapExport(options) {
	this.help = {
		name: 'GoogleMapExport',
		description: 'Exports as a static google map',
		options: {
			outputFile: 'File name format for output files, placeholders: %date%',
			dateFormat: 'Date format to use',
			size: 'Size of the map (default: 800x600)',
			zoomFactor: 'Map zoom factor (default: 13)',
			addPlaces: 'Add places as markers (default: false)'
		}
	}

	this.options = _.extend({
		outputFile: '%date%.png',
		dateFormat: 'YYYYMMDD',
		size: '800x600',
		zoomFactor: 13,
		addPlaces: false
	}, options);
}

GoogleMapExport.prototype.getFilename = function getFilename(date) {
	return process.cwd() + '/' + this.options.outputFile.replace('%date%', moment(date, 'YYYYMMDD').format(this.options.dateFormat));
}

GoogleMapExport.prototype.exportDay = function exportDay(day, cb) {
	console.log('Moves log for day: ', day.date)

	var points = [];
	var places = [];

	day.segments.forEach(function(segment) {
		var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
		var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

		if(segment.type == 'place') {
			console.log('Place: ', segment.place.name, end.diff(start, 'minutes'), 'min');

			places.push({
				name: segment.place.name,
				lat: segment.place.location.lat,
				lon: segment.place.location.lon,
			})
			return;
		}

		if(segment.type == 'move') {
			console.log('Moved!');

			segment.activities.forEach(function(activity) {
				console.log('-> ', activity.activity, activity.duration, 'secs ', activity.distance, 'meters');
				console.log(activity.trackPoints);

				activity.trackPoints.forEach(function(point) {
					points.push({
						lat: Math.round(parseFloat(point.lat) * 10000, 4) / 10000,
						lon: Math.round(parseFloat(point.lon) * 10000, 4) / 10000
					});
				})
			});
		}
	});

	console.log(points);
	console.log(points.length);
	console.log(places);

	points = reduceLocations(points, 30);
	console.log(points.length);

	var base_url = 'http://maps.googleapis.com/maps/api/staticmap?sensor=false&maptype=roadmap';
	var url = base_url + '&size=' + this.options.size + '&scale=1' +
	'&path=color:0x0000ff%7Cweight:5' + coordinates_to_string(points);

	url = url + '&markers=color:blue%7Csize:normal' + coordinates_to_string(places);

	console.log(url);

	request(url).pipe(fs.createWriteStream(this.getFilename(day.date)));


	cb();

}

function coordinates_to_string(coords) {
    var locationString = '';

    coords.forEach(function(point) {
        locationString += '%7C' + point.lat + ',' + point.lon;
    });

    return locationString;
}

var reduceLocations = function reduceLocations(locations, number) {
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
