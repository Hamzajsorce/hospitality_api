const swaggerUi = require('swagger-ui-express');
const { buildSpec } = require('./buildSpec');
const { documentRoute } = require('./documentRoute');

function registerSystemRoutes(config = {}) {
  documentRoute('get', '/health', {
    tags: ['System'],
    summary: 'Health check',
    description: 'Returns backend health status.',
    responses: {
      200: {
        description: 'Backend is running',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 1 },
                message: { type: 'string', example: 'Backend is running' },
              },
            },
          },
        },
      },
    },
  });

  documentRoute('get', '/', {
    tags: ['System'],
    summary: 'Root status page',
    description: 'Simple text response with links to Parse and Dashboard.',
    responses: {
      200: { description: 'Server is running' },
    },
  });
}

function setupSwagger(app, config = {}) {
  registerSystemRoutes(config);

  const serveSpec = (req, res) => {
    res.json(buildSpec(config));
  };

  app.get('/docs/swagger.json', serveSpec);
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: {
        url: '/docs/swagger.json',
      },
      customSiteTitle: 'Hospitality API Docs',
    })
  );
}

module.exports = { setupSwagger, buildSpec };
