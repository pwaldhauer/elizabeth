var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

function PlaintextExport(options) {
  this.help = {
    name: 'PlaintextExport',
    description: 'Exports as plaintext',
    options: {
      outputFile: 'File name format for output files, placeholders: %date%',
      dateFormat: 'Date format to use'
    }
  }

  this.options = _.extend({
    outputFile: '%date%.txt',
    dateFormat: 'YYYYMMDD'
  }, options);
}

PlaintextExport.prototype = Object.create(DefaultPlugin.prototype);

PlaintextExport.prototype.exportDay = function exportDay(day, cb) {
  var text = 'Moves log for ' + day.date + '\n';

  if (!day.segments) {
    cb('Day ' + day.date + ' seems to have no segments')
    return;
  }

  day.segments.forEach(function(segment) {
    var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
    var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

    if (segment.type == 'place') {
      text += '# Been at "' + segment.place.name + '" for ' + end.diff(start, 'minutes') + 'min.\n';
      return;
    }

    if (segment.type == 'move' && Array.isArray(segment.activities)) {
      segment.activities.forEach(function(activity) {
        text += '> Moved by ' + activity.activity + ' for ' + activity.duration + ' seconds (' + activity.distance + 'm)\n';
      });
    }
  });

  fs.writeFile(this.getFilename(day.date), text, function(err) {
    if (err) {
      cb(err);
      return;
    }

    cb(null, day.date);
  });
}

exports.Plugin = PlaintextExport;
