var customerController = require('../controllers/customerController.js');

module.exports = function(app) {

	app.post('/signin', customerController.signin);
	app.post('/signup', customerController.signup);
	app.post('/update-location', customerController.updateLocation);
	// app.get('/', customerController.checkAuth);
};
