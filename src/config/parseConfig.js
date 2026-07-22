const path = require('path');

const cleanEnv = (value) => String(value || '').replace(/^['"]|['"]$/g, '');

const required = (key, fallback) => {
  const value = cleanEnv(process.env[key] || fallback);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const parseConfig = {
  port: Number(process.env.PORT || 1337),
  appId: required('PARSE_APP_ID'),
  masterKey: required('PARSE_MASTER_KEY'),
  javascriptKey: required('PARSE_JAVASCRIPT_KEY'),
  serverURL: required('PARSE_SERVER_URL', 'http://localhost:1337/parse'),
  publicServerURL: required('PARSE_PUBLIC_SERVER_URL', 'http://localhost:1337/parse'),
  dashboardUser: required('DASHBOARD_USER', 'admin'),
  dashboardPass: required('DASHBOARD_PASS', 'admin123'),
  dashboardAppName: required('DASHBOARD_APP_NAME', 'Hospitality Requests'),
};

parseConfig.serverOptions = {
  databaseURI: required('DATABASE_URI'),
  cloud: path.join(__dirname, '../cloud/main.js'),
  appId: parseConfig.appId,
  masterKey: parseConfig.masterKey,
  masterKeyIps: ['0.0.0.0/0'],
  javascriptKey: parseConfig.javascriptKey,
  serverURL: parseConfig.serverURL,
  publicServerURL: parseConfig.publicServerURL,
  allowClientClassCreation: process.env.ALLOW_CLIENT_CLASS_CREATION === 'true',
  liveQuery: {
    classNames: ['HospitalityRequest', 'HospitalityLog', 'Notification'],
  },
  fileUpload: {
    enableForPublic: false,
    enableForAnonymousUser: false,
    enableForAuthenticatedUser: true,
  },
};

module.exports = { parseConfig };
