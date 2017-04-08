var fs = require('fs');
var argv = require('optimist').argv;
var nconf = require('nconf');
var moment = require('moment');
var ospath = require('ospath');

var movesApi = require('moves-api').MovesApi;

var configFilePath = ospath.home() + '/.elizabeth.json';
var configSamplePath = __dirname + '/../config.sample.json';
var dateFormat = 'YYYYMMDD';

function Elizabeth() {}

Elizabeth.prototype.startInit = function startInit() {
  console.log('Welcome to Elizabeth, your Moves.app exporter!');
  console.log('----------------------------------------------');
  console.log('');

  console.log('> Checking for config file.');

  if (fs.existsSync(configFilePath)) {
    console.log('> Found existing config file. To recreate it, delete it.');
    console.log('> Found at path: ' + configFilePath);
    process.exit(1);
  }

  _copyFileSync(configSamplePath, configFilePath, 'UTF-8');
  nconf.file(configFilePath);

  console.log('> Creating new configuration file.');
  console.log('');
  console.log('> Step 1: Create a Moves API Client.');
  console.log('Go to this URL and follow the instructions to create a new app.');
  console.log('');
  console.log('https://dev.moves-app.com/apps');
  console.log('');
  console.log('> Use "http://localhost:3000/auth" when asked for a "Redirect URI"');
  console.log('');

  console.log('> After creating your app, enter your credentials:');
  console.log('');

  _startPrompt(function(clientId, clientSecret) {
    nconf.set('moves:clientId', clientId);
    nconf.set('moves:clientSecret', clientSecret);

    nconf.set('moves:redirectUri', 'http://localhost:3000/auth');

    console.log('');
    console.log('> Step 2: Create an access token.'
    );
    console.log('> Go to this URL and follow the instructions:'
    );
    console.log('');
    console.log('http://localhost:3000/');
    console.log('');

    _initCreateServer(function(accessToken) {
      console.log( '> Storing access token.');

      nconf.set('moves:accessToken', accessToken);

      nconf.save(function(err) {
        if (err) {
          console.log('> Error while saving config: ', err);
          process.exit(1);
        }

        console.log('');
        console.log('> Saved config. Ready to export.');
        process.exit(0);
      });
    });
  });
}

Elizabeth.prototype.showProfile = function showProfile() {
  _loadConfig();

  var moves = new movesApi(nconf.get('moves'));

  moves.getProfile(function(err, profile) {
    if (err) {
      console.log('> ERROR');
      console.log('> ' + err);
      process.exit(1);
    }

    console.log('> Your profile info:');
    console.log(' userId: ', profile.userId);
    console.log(' startDay: ', moment(profile.profile.firstDate,
      'YYYYMMDD').format(dateFormat));
  });
}

function _exportDay(exportPlugin) {
  return function(err, result) {
    if (err) {
      console.log('> Error: ', err);
      process.exit(1);
    }

    result = result[0];

    exportPlugin.exportDay(result, function(err, result) {
      if (err) {
        console.log('! Error: ' + err);
        return;
      }

      console.log('> Exported ' + result);
    });
  }
}

Elizabeth.prototype.startExport = function startExport() {
  _loadConfig();

  var moves = new movesApi(nconf.get('moves'));

  var exportPlugin = null;
  var range = {
    start: null,
    end: null
  };

  if (nconf.get('defaults')) {
    exportPlugin = _getExportFromParameters(exportPlugin, nconf.get('defaults'));
    range = _getDateRangeFromParameters(range, nconf.get('defaults'));
  }

  if (argv) {
    exportPlugin = _getExportFromParameters(exportPlugin, argv);
    range = _getDateRangeFromParameters(range, argv);
  }

  if (!range || !exportPlugin) {
    console.log('> No valid date range or export plugin :(');
    process.exit(1);
  }

  var days = range.end.diff(range.start, 'days');
  var trackPoints = (typeof exportPlugin.options.trackPoints === 'undefined') ? true : exportPlugin.options.trackPoints;

  console.log('> Using ' + exportPlugin.help.name + ' to export ' + days + ' days with trackPoints ' + trackPoints + '!');
  console.log('');

  for (var i = 0; i < days; i++) {
    var day = range.start.add(1, 'days').format('YYYYMMDD');
    moves.getStoryline(
      {from: day, to: day, trackPoints: trackPoints},
      _exportDay(exportPlugin))
  }
}

Elizabeth.prototype.printHelp = function printHelp() {
  console.log('Usage: ellie <command>');
  console.log('');

  console.log('Commands:');
  console.log(' init - Create your configuration file');
  console.log(' show - Shows information for the currently logged in user');
  console.log(' help - Print this help');
  console.log(' export - Start an export!');
  console.log('');

  console.log('Export options:');
  console.log(' --output [Exporter] - Use the specified export plugn');
  console.log(' --dayStart [' + dateFormat + '] - Start exporting at this day');
  console.log(' --dayEnd [' + dateFormat + '] - End exporting at this day');
  console.log('');
  console.log(' --days [n] - Export the last n days');
  console.log(' --yesterday - Export yesterday');
  console.log(' --lastMonth - Export last calendar month');
  console.log('');

  console.log('Available exporters:');

  var exporterFiles = fs.readdirSync(__dirname + '/output');

  exporterFiles.forEach(function(file) {
    if (/\\*.js/.test(file)) {
      _helpForExporter(__dirname + '/output/' + file);
    }
  })

  process.exit(0);
}

function _helpForExporter(file) {
  var exporter = new(require(file).Plugin)();

  if (!exporter.help) {
    return;
  }

  console.log(' ' + exporter.help.name + ': ' + exporter.help.description);
  for (var key in exporter.help.options) {
    console.log('  --' + key + ' ' + exporter.help.options[key]);
  }

  console.log('');
}

function _startPrompt(cb) {
  var prompt = require('prompt');
  prompt.message = '> ';
  prompt.delimiter = '';
  prompt.colors = false;

  prompt.start();

  prompt.get(['clientId', 'clientSecret'], function(err, result) {
    if (err) {
      console.log('> What. I cannot read from the prompt u_u');
      process.exit(1);
    }

    cb(result.clientId, result.clientSecret);
  });
}

function _initCreateServer(cb) {
  var express = require('express');
  var app = express();

  var moves = new movesApi(nconf.get('moves'));

  app.get('/', function(req, res) {
    res.redirect(moves.generateAuthUrl());
  })

  app.get('/auth', function(req, res) {
    if (req.query.error) {
      res.send('Error: ' + req.query.error)
      return;
    }

    moves.getAccessToken(req.query.code, function(err, accessToken) {
      if (err) {
        res.send('Error authenticating: ' + err);
        return;
      }

      res.send(
        'Authentication complete, please return to your terminal.');
      cb(accessToken);
    });
  });

  app.listen(3000);
}

function _getExportFromParameters(exportPlugin, params) {
  if (params.output) {
    var filename = __dirname + '/output/' + params.output + '.js';

    if (!fs.existsSync(filename)) {
      return null;
    }

    exportPlugin = new(require(filename).Plugin)(params || {});
  }

  return exportPlugin;
}

function _getDateRangeFromParameters(range, params) {
	if(params.dayStart) {
		range.start = moment(params.dayStart.toString(), dateFormat);
	}

	if(params.dayEnd) {
		range.end = moment(params.dayEnd.toString(), dateFormat);
	}

	if(params.days) {
		range.start = moment().subtract(params.days, 'days');
		range.end = moment();
	}

	if(params.yesterday) {
		range.start = moment().subtract(2, 'days');
		range.end = moment().subtract(1, 'days');
	}

  if(params.lastMonth) {
		range.start = moment().subtract(1,'months').date(1).subtract(1, 'days');
    range.end = moment().subtract(1,'months').endOf('month');
  }

  return range;
}

function _loadConfig() {
  nconf.file({
    file: configFilePath
  });

  if (!nconf.get('moves')) {
    console.log('> Your config file seems broken :/');
    process.exit(1);
  }
}

function _copyFileSync(srcFile, destFile, encoding) {
  var content = fs.readFileSync(srcFile, encoding);
  fs.writeFileSync(destFile, content, encoding);
}

exports.Elizabeth = Elizabeth;
