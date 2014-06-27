var moment = require('moment');
var _ = require('underscore');
var nconf = require('nconf');
var mongo = require('mongoose');
var path = require('path-extra');

var configFilePath = path.homedir() + '/.elizabeth.json';
var configSamplePath = __dirname + '/../config.sample.json';

var fs = require('fs');
var request = require('request');

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

function _loadConfig() {
    nconf.file({file: configFilePath});

    if(!nconf.get('moves')) {
        console.log('> Your config file seems broken :/');
        process.exit(1);
    }
}

_loadConfig();

mongo.connect(nconf.get('mongoconnection'));

var Place = mongo.model('Place', {
    name: String,
    type: String,
    foursquareId: String,
    lat: String,
    lon: String,
    count: Number
});

var Track = mongo.model('Track', {
    activity: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    distance: Number,
    steps: Number,
    trackPoints: []
});

function MongoExport(options) {
	this.help = {
		name: 'MongoExport',
		description: 'Saves places and Tracks to Mongodb'
	}
}

MongoExport.prototype = Object.create(DefaultPlugin.prototype);

MongoExport.prototype.exportDay = function exportDay(day, cb) {
	if(!day.segments) {
		cb('This day does not seem to have any segments');
		return;
	}

	day.segments.forEach(function(segment) {
		var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
		var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

		if(segment.type == 'place') {
            var query = Place
                .find()
                .where('name').equals(segment.place.name)
                .where('lat').equals(segment.place.location.lat)
                .where('lon').equals(segment.place.location.lon)
                .exec(function (err, place) {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    if (place.length > 0) {
                        Place.findById(place[0]._id, function (err, oldPlace) {
                            if (err) console.error(err);
                              
                            oldPlace.count++;
                            oldPlace.save(function (err) {
                                if (err) console.error(err);
                                console.log('updated place ' + place[0]._id);
                                return;
                            });
                        });
                    } else {
                        var place = new Place({
                            name: segment.place.name,
                            type: segment.place.type,
                            foursquareId: segment.place.foursquareId,
                            lat: segment.place.location.lat,
                            lon: segment.place.location.lon,
                            count: 1
                        });

                        place.save(function (err) {
                            if (err) console.error(err);
                            console.log('created new place ' + segment.place.name);
                            return;
                        });
                    }
                });
		}

		// Add movements if we got an activities segment
		if(segment.type == 'move' && Array.isArray(segment.activities)) {
			segment.activities.forEach(function(activity) {
                var track = new Track({
                    activity: activity.activity,
                    startTime: new Date(activity.startTime),
                    endTime: new Date(activity.endTime),
                    duration: activity.duration,
                    distance: activity.distance,
                    steps: activity.steps,
                    trackPoints: activity.trackPoints
                });

                track.save(function (err) {
                    if (err) console.error(err);
                    console.log('new track saved');
                    return;
                });
			});
		}
	});
}

exports.Plugin = MongoExport;