var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');

var DefaultPlugin = require(__dirname + '/../DefaultPlugin').Plugin;

function JsonExport(options) {
    this.help = {
        name: 'JsonExport',
        description: 'Export as raw JSON',
        options: {
          outputFile: 'File name format for output files, placeholders: %date%',
          dateFormat: 'Date format to use'
        }
      };

    this.options = _.extend({
      outputFile: '%date%.json',
      dateFormat: 'YYYYMMDD'
    }, options);
}

JsonExport.prototype = Object.create(DefaultPlugin.prototype);

JsonExport.prototype.exportDay = function exportDay(day, cb) {
  fs.writeFile(this.getFilename(day.date), JSON.stringify(day), function(err) {
    if(err) {
      cb(err);
      return;
    }

    cb(null, day.date);
  });
}


exports.Plugin = JsonExport;
