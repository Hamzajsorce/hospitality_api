const { registerHospitalityFunctions } = require('./functions/hospitalityFunctions');
const { registerHospitalityOptionFunctions } = require('./functions/hospitalityOptionFunctions');
const { registerUserFunctions } = require('./functions/userFunctions');
const { registerNotificationFunctions } = require('./functions/notificationFunctions');
const { registerSettingsFunctions } = require('./functions/settingsFunctions');

registerHospitalityFunctions();
registerHospitalityOptionFunctions();
registerUserFunctions();
registerNotificationFunctions();
registerSettingsFunctions();
