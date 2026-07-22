const { parseConfig } = require('../config/parseConfig');
const { documentRoute } = require('../swagger/documentRoute');
const schemaService = require('../services/schemaService');
const { ok, fail } = require('../utils/response');
const { AppError } = require('../utils/AppError');

function requireSchemaAccess(req) {
  const headerKey = req.get('x-schema-sync-key') || req.get('x-parse-master-key');
  const bearerToken = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const providedKey = headerKey || bearerToken;
  const allowedKey = process.env.SCHEMA_SYNC_KEY || parseConfig.masterKey;

  if (!providedKey || providedKey !== allowedKey) {
    throw new AppError('Schema sync key is invalid or missing', 403);
  }
}

function registerSchemaRoutes(app) {
  documentRoute('get', '/api/schema/definitions', {
    tags: ['Schema'],
    summary: 'List expected Parse classes and columns',
    description: 'Returns the schema definition used by the schema sync endpoint.',
  });

  app.get('/api/schema/definitions', (req, res) => {
    res.json(ok(schemaService.getSchemaDefinitions(), 'Schema definitions loaded'));
  });

  documentRoute('post', '/api/schema/sync', {
    tags: ['Schema'],
    summary: 'Create missing Parse classes and columns',
    description:
      'Requires `X-Schema-Sync-Key` or `X-Parse-Master-Key`. Pass `{ "dryRun": true }` to only check.',
    parameters: [
      {
        name: 'X-Schema-Sync-Key',
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: 'Set this to SCHEMA_SYNC_KEY. If SCHEMA_SYNC_KEY is not configured, use PARSE_MASTER_KEY.',
      },
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              dryRun: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  });

  app.post('/api/schema/sync', async (req, res) => {
    try {
      requireSchemaAccess(req);
      const result = await schemaService.syncSchemas({ dryRun: req.body?.dryRun === true });
      res.json(ok(result, result.dryRun ? 'Schema checked' : 'Schema synchronized'));
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json(fail(error));
    }
  });
}

module.exports = { registerSchemaRoutes };
