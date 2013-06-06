var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');

function DefaultPlugin(options) {
    this.help = {
        name: 'DefaultPlugin',
        description: 'Base Plugin',
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

DefaultPlugin.prototype.getFilename = function getFilename(date) {
    return process.cwd() + '/' + this.options.outputFile.replace('%date%', moment(date, 'YYYYMMDD').format(this.options.dateFormat));
}

DefaultPlugin.prototype.exportDay = function exportDay(day, cb) {
    // Do your stuff

    cb(null, day.date);
}


exports.Plugin = DefaultPlugin;
