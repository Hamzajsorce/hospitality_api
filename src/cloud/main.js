const { registerHospitalityFunctions } = require('./functions/hospitalityFunctions');
const { registerHospitalityOptionFunctions } = require('./functions/hospitalityOptionFunctions');
const { registerUserFunctions } = require('./functions/userFunctions');
const { registerNotificationFunctions } = require('./functions/notificationFunctions');

registerHospitalityFunctions();
registerHospitalityOptionFunctions();
registerUserFunctions();
registerNotificationFunctions();
