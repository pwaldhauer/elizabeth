function GpxExport(options) {
	this.help = {
		name: 'GpxExport',
		description: 'Exports as a .gpx file',
		options: {
			outputFile: 'File name format for output files, placeholders: %date%',
			dateFormat: 'Date format to use'
		}
	}


	// todo: merge
	this.options = options || {
		outputFile: '%date%.txt',
		dateFormat: 'YYYYmmdd'
	}
}


GpxExport.prototype.export = function exportDay(day, cb) {
	// blahblah
}


exports.Plugin = GpxExport;