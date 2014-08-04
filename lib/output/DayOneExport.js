var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');
var hat = require('hat');
var path = require('path-extra');
var DayOne = require('dayone').DayOne;
var DayOneEntry = require('dayone').DayOneEntry;

var GoogleMapExport = require(__dirname + '/GoogleMapExport').Plugin;

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

// Some nice unicode.
var movementTypes = {
    'trp': "Transport",
    'wlk': "Walk",
    'run': "Run",
    'cyc': "Cycle"
}

function DayOneExport(options) {
    this.help = {
        name: 'DayOneExport',
        description: 'Exports into your day one',
        options: {
            directory: 'DayOne data directory. (default: auto, only works with iCloud and Dropbox sync)',
            overwrite: 'Overwrite existing imported entries. If set to false they will be skipped. (default: false)',
            tag: 'The unique tag that will be added to the generated entries. (default: moves-import)',
            timezone: 'Timezone for new entries. (default: Europe/Berlin)'
        }
    }

    this.options = _.extend({
        directory: 'auto',
        overwrite: false,
        tag: 'moves-import',
        timezone: 'Europe/Berlin'
    }, options);

    this.entryCache = null;
    this.dayOne = null;

    this.gmap = new GoogleMapExport({
        outputFile: '%date%.png',
        dateFormat: 'YYYYMMDD',
        size: '800x450',
        zoomFactor: 13,
        format: 'jpg',
        addPlaces: true
    });
}

DayOneExport.prototype = Object.create(DefaultPlugin.prototype);

DayOneExport.prototype.exportDay = function exportDay(day, cb) {
    if(day.segments == null) return;

    var that = this;

    // Find default iCloud DayOne directory, Dropbox otherwise.
    if(that.options.directory == 'auto') {
        that.options.directory = path.join(path.homedir(), 'Library/Mobile Documents/5U8NS4GX82~com~dayoneapp~dayone/Documents/Journal_dayone/');

        if(!fs.existsSync(that.options.directory)) {
            cb('Directory not found: ' + that.options.directory + ', trying with Dropbox application directory.');
            that.options.directory = path.join(path.homedir(), 'Dropbox/Applications/Day One/Journal.dayone/');
        }

        if(!fs.existsSync(that.options.directory)) {
            cb('Directory not found: ' + that.options.directory);
            return;
        }

        console.log('> Using DayOne directory: ' + that.options.directory + '\n');
    }

    that.dayOne = new DayOne({directory: that.options.directory});

    that.loadEntries(function(err) {
        var entry = null;
        if(that.entryCache.hasOwnProperty(day.date)) {
            if(!that.options.overwrite) {
                cb('Already imported, skipped ' + day.date);

                return;
            }

            entry = that.entryCache[day.date];
        }

        var text = that.createText(day);

        // We use the Google Map export thingy to export the map
        // an just move it to the corresponding Day One folder
        // Yes, this could be optimized!
        that.gmap.exportDay(day, function(err, d) {
            var mapfile = that.gmap.getFilename(day.date);

            that.saveEntry(day.date, text, mapfile, entry, function(error, date) {
                if(error) {
                    cb(error);
                    return;
                }

                cb(null, day.date);
            });
        });
    })
}

DayOneExport.prototype.createText = function createText(day) {
    var text = '# Daily Moves.app log\n';

    var totalDistances = [];
    Object.keys(movementTypes).forEach(function(type){
        totalDistances[type] = 0;
    });

    var movements = [];
    day.segments.forEach(function(segment) {
        var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
        var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

        if(segment.type == 'place') {
            // Print out last movements if there are any
            text = _addMovements(text, movements);
            movements = [];

            var placeName = segment.place.name;

            // Link foursquare venues
            if(segment.place.type == 'foursquare') {
                placeName = '[' + placeName + '](https://foursquare.com/v/' + segment.place.foursquareId + ')'
            }

            // Un-set places
            if(segment.place.type == 'unknown') {
                placeName = '[Unknown place](https://maps.google.de/?q=' + segment.place.location.lat + ',' + segment.place.location.lon + ')';
            }

            text += '* ' + _niceDate(start, end) + ': ' + placeName + '\n';
            return;
        }

        // We group movements together.
        if(segment.type == 'move' && Array.isArray(segment.activities)) {
            segment.activities.forEach(function(activity) {
                movements.push({
                    start: moment(activity.startTime, 'YYYYMMDDTHHmmssZ'),
                    end: moment(activity.endTime, 'YYYYMMDDTHHmmssZ'),
                    type: activity.activity,
                    distance: activity.distance
                });

                totalDistances[activity.activity] += activity.distance
            });
        }
    });

    // Clear any left movements
    text = _addMovements(text, movements);

    text += '\n';
    text += '## Summary\n';
    text += '* ';

    var ds = [];
    for(var type in totalDistances) {
        ds.push(_niceDistance(totalDistances[type]) + ' ' + _niceType(type));
    }

    text += ds.join(', ');

    return text;
}

DayOneExport.prototype.saveEntry = function saveEntry(date, text, mapfile, entry, cb) {
    var that = this;
    var dayOneEntry = new DayOneEntry();

    if(entry == null) {
        dayOneEntry.UUID = 'moves_' + hat().toUpperCase();
        dayOneEntry.creationDate = moment(date, 'YYYYMMDD').toDate();
        dayOneEntry.starred = false;
        dayOneEntry.tags = [that.options.tag];
        dayOneEntry.timezone = that.options.timezone;
    }

    dayOneEntry.text = text;

    dayOneEntry.photo = fs.readFileSync(mapfile);

    this.dayOne.save(dayOneEntry, function(err) {
        fs.unlinkSync(mapfile);
        cb(null, date);
    });
}

DayOneExport.prototype.loadEntries = function loadEntries(cb) {
    var that = this;

    that.entryCache = {};
    that.dayOne.list({
        tags: [that.options.tag]
    }, function(err, list) {
        list.forEach(function(entry) {
            that.entryCache[moment(entry.creationDate).format('YYYYMMDD')] = entry;
        });

        cb(null);
    })
}

function _addMovements(text, movements) {
    if(movements.length) {
        var movementStart = movements[0].start;
        var movementEnd = movements[movements.length - 1].end;
        var movementTypes = [];
        movements.forEach(function(movement) {
            movementTypes.push(_niceType(movement.type));
        })

        text += '* ' + _niceDate(movementStart, movementEnd) + ': ' + movementTypes.join(', ') + '\n';
    }

    return text;
}

function _niceDate(start, end) {
    return start.format('HH:mm') + ' — ' + end.format('HH:mm');
}

function _niceDuration(duration) {
    var seconds = parseInt(duration, 10);

    if(seconds > 3600) {
        return Math.round(seconds/3600) + 'h';
    }

    if(seconds > 60) {
        return Math.round(seconds/60) + 'min';
    }

    return seconds + 's';
}

function _niceDistance(distance) {
    var meters = parseInt(distance, 10);

    if(meters > 1000) {
        return Math.round(meters/1000) + 'km';
    }

    return meters + 'm';
}

function _niceType(type) {
    if(movementTypes.hasOwnProperty(type)) {
        return movementTypes[type];
    }

    return 'Unknown movement';
}

exports.Plugin = DayOneExport;
