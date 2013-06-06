var request = require('request');

function MovesApi(options) {
	this.baseUrl = 'https://api.moves-app.com/';

	this.options = options || {
		clientId: '',
		clientSecret: '',
		redirectUri: '',
		accessToken: ''
	}
}

MovesApi.prototype.generateAuthUrl = function generateAuthUrl() {
	return this.baseUrl +
		'oauth/v1/authorize?response_type=code&client_id=' + this.options.clientId +
		'&scope=activity location&redirect_uri=' + this.options.redirectUri;
}

MovesApi.prototype.getAccessToken = function getAccessToken(code, cb) {
	request.post(this.baseUrl + 'oauth/v1/access_token?grant_type=authorization_code' +
			'&code=' + code + '&client_id=' + this.options.clientId + '&client_secret=' +
			this.options.clientSecret + '&redirect_uri=' + this.options.redirectUri,

			function(error, response, body) {
				body = JSON.parse(body);

				if(body.error) {
					cb(body.error);
					return;
				}

				cb(null, body.access_token)
	});
}

MovesApi.prototype.verifyToken = function verifyToken(cb) {
	request.get(this.baseUrl + 'oauth/v1/tokeninfo?access_token=' + this.options.accessToken,
		function(error, response, body) {
			body = JSON.parse(body);

			if(body.error) {
				cb(false);
				return;
			}

			cb(true);
		})
}

MovesApi.prototype.getProfile = function getProfile(cb) {
	request.get(this.baseUrl + 'api/v1/user/profile?access_token=' + this.options.accessToken,
		function(error, response, body) {
			if(error) {
				cb(error);
				return;
			}

			if(body.error) {
				cb(body.error);
				return;
			}
			
			cb(null, JSON.parse(body));
		});
}

MovesApi.prototype.getStoryline = function getStoryline(day, cb) {
	request.get(this.baseUrl + 'api/v1/user/storyline/daily/' + day + '?trackPoints=true&access_token=' + this.options.accessToken,
		function(error, response, body) {
			if(error) {
				cb(error);
				return;
			}

			body = JSON.parse(body);

			if(body.error) {
				cb(body.error);
				return;
			}

			if(Array.isArray(body)) {
				body = body[0];
			}

			cb(null, body);
		});
}

exports.MovesApi = MovesApi;
