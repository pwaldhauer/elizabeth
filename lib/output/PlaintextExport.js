var moment = require('moment');
var _ = require('underscore');

function PlaintextExport(options) {
	this.help = {
		name: 'PlaintextExport',
		description: 'Exports as plaintext',
		options: {
			outputFile: 'File name format for output files, placeholders: %date%',
			dateFormat: 'Date format to use'
		}
	}


	// todo: merge
	this.options = _.extend({
		outputFile: '%date%.txt',
		dateFormat: 'YYYYmmdd'
	}, options);
}


PlaintextExport.prototype.exportDay = function exportDay(day, cb) {
	// blahblah

	console.log('Moves log for day: ', day.date)

	day.segments.forEach(function(segment) {
		var start = moment(segment.startTime, 'YYYYMMDDTHHmmssZ');
		var end = moment(segment.endTime, 'YYYYMMDDTHHmmssZ');

		if(segment.type == 'place') {
			console.log('## ', segment.place.name, end.diff(start, 'minutes'), 'min');
			return;
		}

		if(segment.type == 'move') {
			segment.activities.forEach(function(activity) {
				console.log('-> ', activity.activity, activity.duration, 'secs ', activity.distance, 'meters');
			});
		}
	});

}


exports.Plugin = PlaintextExport;
