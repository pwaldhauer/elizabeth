var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');
var path = require('path-extra');
var plist = require('plist');
var hat = require('hat');

var GoogleMapExport = require(__dirname + '/GoogleMapExport').Plugin;

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

// Some nice unicode.
var movementTypes = {
    'trp': "\uD83D\uDE83",
    'wlk': "\uD83D\uDEB6",
    'run': "\uD83C\uDFC3",
    'cyc': "\uD83D\uDEB2"
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

        if(!fs.existsSync(that.options.directory))
            cb('Directory not found: ' + that.options.directory + ', trying with Dropbox application directory.');

        that.options.directory = path.join(path.homedir(), 'Dropbox/Applications/Day One/Journal.dayone/');
        if(!fs.existsSync(that.options.directory)) {
            cb('Directory not found: ' + that.options.directory);
            return;
        }

        console.log('> Using DayOne directory: ' + that.options.directory + '\n');
    }

    this.loadEntries();

    var entry = null;
    if(this.entryCache.hasOwnProperty(day.date)) {
        if(!this.options.overwrite) {
            cb('Already imported, skipped ' + day.date);

            return;
        }

        entry = this.entryCache[day.date];
    }

    var text = this.createText(day);

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
    var fullpath = path.join(this.options.directory, 'entries');

    var uid;

    if(entry == null) {
        uid = 'moves_' + hat().toUpperCase();
        entry = {
                "Creation Date": moment(date, 'YYYYMMDD').toDate(),
                "Starred": false,
                "Tags": [that.options.tag],
                "Time Zone": that.options.timezone,
                "UUID": uid
            }
    }

    entry['Entry Text'] = text;

    var encoded = plist.build(entry);

    fs.writeFile(path.join(fullpath, entry['UUID'] + '.doentry'), encoded.toString(), function(err) {
        if(err) {
            cb(err);
            return;
        }

        // Seems like we need to use jpgs, because DayOne for iPhone just
        // does not display .png files :/
        fs.renameSync(mapfile, path.join(that.options.directory, 'photos', entry['UUID'] + '.jpg'));

        cb(null, date);
    });
}

DayOneExport.prototype.loadEntries = function loadEntries() {
    var that = this;
    var fullpath = path.join(this.options.directory, 'entries');

    if(that.entryCache != null) {
        return;
    }

    that.entryCache = {};

    fs.readdirSync(fullpath).forEach(function(file) {
        try {
            var entry = plist.parseFileSync(path.join(fullpath, file));

            // Found a generated entry for this day
            if(entry['Tags'] && entry['Tags'].indexOf(that.options.tag) != -1) {
                var date = moment(entry['Creation Date']);
                that.entryCache[date.format('YYYYMMDD')] = entry;
            }
        } catch(err) {
            console.log('Skipping malformed entry: ' + file);
            return;
        }
    });
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
