const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { ParseServer } = require('parse-server');
const ParseDashboard = require('parse-dashboard');
const Parse = require('parse/node');
const { parseConfig } = require('./config/parseConfig');
const { registerRoutes } = require('./routes');
const { setupSwagger } = require('./swagger');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

Parse.initialize(parseConfig.appId, parseConfig.javascriptKey, parseConfig.masterKey);
Parse.serverURL = parseConfig.serverURL;

const api = new ParseServer(parseConfig.serverOptions);
const dashboard = ParseDashboard(
  {
    apps: [
      {
        serverURL: parseConfig.publicServerURL,
        appId: parseConfig.appId,
        masterKey: parseConfig.masterKey,
        appName: parseConfig.dashboardAppName,
      },
    ],
    users: [
      {
        user: parseConfig.dashboardUser,
        pass: parseConfig.dashboardPass,
      },
    ],
    mountPath: '/dashboard',
  },
  { allowInsecureHTTP: true }
);

app.get('/health', (req, res) => {
  res.json({ code: 1, message: 'Backend is running' });
});

app.get('/', (req, res) => {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'local';
  res.send(
    `Hospitality Parse Server is running (${env}). Parse: /parse, Dashboard: /dashboard, Docs: /docs`
  );
});

app.get('/dashboard', (req, res) => {
  res.redirect('/dashboard/');
});

registerRoutes(app);
setupSwagger(app, {
  port: parseConfig.port,
  appId: parseConfig.appId,
  publicServerURL: parseConfig.publicServerURL,
});

async function start() {
  await api.start();
  app.use('/parse', api.app);
  app.use('/dashboard', dashboard);

  const httpServer = http.createServer(app);
  const hostLabel = process.env.RENDER_EXTERNAL_URL || `http://localhost:${parseConfig.port}`;
  httpServer.listen(parseConfig.port, '0.0.0.0', () => {
    console.log(`Hospitality Parse Server running at ${hostLabel}/parse`);
    console.log(`Parse Dashboard running at ${hostLabel}/dashboard`);
    console.log(`Swagger docs running at ${hostLabel}/docs`);
  });

  ParseServer.createLiveQueryServer(httpServer, {
    appId: parseConfig.appId,
    serverURL: parseConfig.serverURL,
    masterKey: parseConfig.masterKey,
  });
}

start().catch((error) => {
  console.error('Failed to start Parse Server:', error.message || error);
  if (String(error.message || '').includes('ECONNREFUSED')) {
    console.error('MongoDB connection refused. Please ensure MongoDB is running or Atlas is reachable.');
  }
  if (String(error.message || '').includes('SSL') || String(error.message || '').includes('TLS')) {
    console.error('MongoDB TLS handshake failed. Check Atlas access, IP allowlist, and Node/OpenSSL compatibility.');
  }
  process.exit(1);
});
