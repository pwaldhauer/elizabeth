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
    dateFormat: 'YYYYMMDD',
    trackPoints: false,
    resolution: "interval"
  }, options);
}

LocationExport.prototype = Object.create(DefaultPlugin.prototype);

LocationExport.prototype.exportDay = function exportDay(days, cb) {
  var text = '';
  var lastSegment = undefined;

  days.forEach(function(day) {
    day.segments.forEach(function(segment) {
      var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
      var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

      if (segment.type == 'place') {
        var lastSegmentDefined = !(typeof lastSegment === 'undefined');
        var sameAsLast = lastSegmentDefined && (segment.place.name == lastSegment.place.name) && (segment.startTime == lastSegment.startTime)
          if (!sameAsLast) {
            text += segment.place.name + ' ' + segment.startTime + ' ' +
              segment.endTime + ' ' + end.diff(start, 'minutes') + ' min\n';
            lastSegment = segment;
            return;
          };
      };
    });
  });

  fs.writeFile(this.getFilename(days[0].date), text, function(err) {
    if (err) {
      cb(err);
      return;
    }

    cb(null, days[0].date);
  });
}

exports.Plugin = LocationExport;
