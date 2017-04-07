var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

function LocationExport(options) {
  this.help = {
    name: 'LocationExport',
    description: 'Exports only locations as plaintext',
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

LocationExport.prototype = Object.create(DefaultPlugin.prototype);

LocationExport.prototype.exportDay = function exportDay(day, cb) {
  var text = '';

  if (!day.segments) {
    cb('Day ' + day.date + ' seems to have no segments')
    return;
  }

  day.segments.forEach(function(segment) {
    var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
    var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

    if (segment.type == 'place') {
      text += segment.place.name + ' ' + segment.startTime + ' ' +
        segment.endTime + ' ' + end.diff(start, 'minutes') + ' min\n';
      return;
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

exports.Plugin = LocationExport;
