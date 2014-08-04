var fs = require('fs');
var argv = require('optimist').argv;
var nconf = require('nconf');
var moment = require('moment');
var path = require('path-extra');

var movesApi = require('moves-api').MovesApi;

var configFilePath = path.homedir() + '/.elizabeth.json';
var configSamplePath = __dirname + '/../config.sample.json';
var dateFormat = 'YYYYMMDD';

function Elizabeth() {

}

Elizabeth.prototype.startInit = function startInit() {
	_printHeader();

	console.log('> Hello there. Just let me check if you already have a config.');

	if(fs.existsSync(configFilePath)) {
		console.log('> Found a config file. If you want to recreate it, please delete it first.');
                console.log('> Found at path: ' + configFilePath);
                process.exit(1);
	}

	_copyFileSync(configSamplePath, configFilePath, 'UTF-8');
	nconf.file(configFilePath);

	console.log('> Noo, okay. I created an empty one for you.');
	console.log('> I will walk you through the configuration process.');
	console.log('');
	console.log('> First of all we need to create a Moves API Client. Please go to this URL and follow the instructions to create a new app.');
	console.log('');

	console.log('https://dev.moves-app.com/apps');

	console.log('');
	console.log('> (Please use "http://localhost:3000/auth" when asked for a "Redirect URI")');
	console.log('');

	console.log('> After creating your app, please enter your credentials:');
	console.log('');

	_startPrompt(function(clientId, clientSecret) {
	    nconf.set('moves:clientId', clientId);
	    nconf.set('moves:clientSecret', clientSecret);

	    nconf.set('moves:redirectUri', 'http://localhost:3000/auth');

	    console.log('');
		console.log('> Okay, my friend. Step one completed. Now we need to create an access token.');
		console.log('> Point your web browser to this URL and follow the instructions:');
		console.log('');
		console.log('http://localhost:3000/');
		console.log('');

		_initCreateServer(function(accessToken) {
			console.log('> Good work, seems like we managed to get an access token. I will save this for you.');

			nconf.set('moves:accessToken', accessToken);

			nconf.save(function(err) {
				if(err) {
					console.log('> Error while saving your config: ', err);
					process.exit(1);
				}

				console.log('');
				console.log('> Saved! Now I am ready to export all your data, I guess.');
				process.exit(0);
			});
		});
	});
}



Elizabeth.prototype.showProfile = function showProfile() {
	_loadConfig();
	_printHeader();

	var moves = new movesApi(nconf.get('moves'));

	moves.getProfile(function(err, profile) {
		if(err) {
			console.log('> THERE IS SOMETHING WRONG WITH YOU:');
			console.log('> ' + err);
			process.exit(1);
		}

		console.log('> Your profile info:');
		console.log('	userId: ', profile.userId);
		console.log('	startDay: ', moment(profile.profile.firstDate, 'YYYYMMDD').format(dateFormat));

	});
}

Elizabeth.prototype.startExport = function startExport() {
	_loadConfig();
	_printHeader();

	var moves = new movesApi(nconf.get('moves'));

	var exportPlugin = null;
	var range = {
		start: null,
		end: null
	};

	if(nconf.get('defaults')) {
		exportPlugin = _getExportFromParameters(exportPlugin, nconf.get('defaults'));
		range = _getDateRangeFromParameters(range, nconf.get('defaults'));
	}

	if(argv) {
		exportPlugin = _getExportFromParameters(exportPlugin, argv);
		range = _getDateRangeFromParameters(range, argv);
	}

	if(!range || !exportPlugin) {
		console.log('> No valid date range or export plugin :(');
		process.exit(1);
	}

	var days = range.end.diff(range.start, 'days');

	console.log('> Using ' + exportPlugin.help.name + ' to export ' + days + ' days!');
	console.log('');

	for(var i = 0; i < days; i++) {
		var day = range.start.add(1, 'days').format('YYYYMMDD');

		moves.getStoryline({from: day, trackPoints: true}, function(err, result) {
			if(err) {
				console.log('> WHAT? Error: ', err);
				process.exit(1);
			}

			result = result[0];

			exportPlugin.exportDay(result, function(err, result) {
				if(err) {
					console.log('! Error: ' + err);
					return;
				}

				console.log('> Exported ' + result);
			});
		})
	}
}


Elizabeth.prototype.printHelp = function printHelp() {
	_printHeader();

	console.log('Commands:');
	console.log('	ellie init - Create your configuration file');
	console.log('	ellie show - Shows information for the currently logged in user');
	console.log('	ellie help - Print this help');
	console.log('	ellie export - Start an export!');
	console.log('');

	console.log('Options:');
	console.log('	--output [Exporter] - Use the specified export plugn');
	console.log('	--dayStart [' + dateFormat + '] - Start exporting at this day');
	console.log('	--dayEnd [' + dateFormat + '] - End exporting at this day');
	console.log('');
	console.log('	--days [n] - Export the last n days');
	console.log('	--yesterday - Export yesterday');
	console.log('');

	console.log('Available exporters:');

	var exporterFiles = fs.readdirSync(__dirname + '/output');

	exporterFiles.forEach(function(file) {
		if(/\\*.js/.test(file)) {
			_helpForExporter(__dirname + '/output/' + file);
		}
	})

	process.exit(0);
}

function _helpForExporter(file) {
	var exporter = new (require(file).Plugin)();

	if(!exporter.help) {
		return;
	}

	console.log('	' + exporter.help.name + ': ' + exporter.help.description);
	for(var key in exporter.help.options) {
		console.log('		--' + key + ' ' + exporter.help.options[key]);
	}

	console.log('');
}

function _startPrompt(cb) {
	var prompt = require('prompt');
	prompt.message = '> ';
	prompt.delimiter = '';
	prompt.colors = false;

	prompt.start();

	prompt.get(['clientId', 'clientSecret'], function (err, result) {
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
		if(req.query.error) {
			res.send('Error: ' + req.query.error)
			return;
		}

		moves.getAccessToken(req.query.code, function(err, accessToken) {
			if(err) {
				res.send('Error authenticating: ' + err);
				return;
			}

			res.send('Authentication complete, please return to your terminal.');
			cb(accessToken);
		});
	});

	app.listen(3000);
}

function _getExportFromParameters(exportPlugin, params) {
	if(params.output) {
		var filename = __dirname + '/output/' + params.output + '.js';

		if(!fs.existsSync(filename)) {
			return null;
		}

		exportPlugin = new (require(filename).Plugin)(params || {});
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

	return range;
}

function _printHeader() {
	console.log('Welcome to Elizabeth, your Moves.app exporter!');
	console.log('----------------------------------------------');
	console.log('');
}

function _loadConfig() {
	nconf.file({file: configFilePath});

	if(!nconf.get('moves')) {
		console.log('> Your config file seems broken :/');
		process.exit(1);
	}
}

function _copyFileSync(srcFile, destFile, encoding) {
  var content = fs.readFileSync(srcFile, encoding);
  fs.writeFileSync(destFile, content, encoding);
}

exports.Elizabeth = Elizabeth;
