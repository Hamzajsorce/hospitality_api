const { documentRoute } = require('../swagger/documentRoute');

function registerRoutes(app) {
  documentRoute('get', '/api', {
    tags: ['System'],
    summary: 'API status',
    description: 'Returns a simple JSON status payload for the custom REST layer.',
    responses: {
      200: {
        description: 'API is running',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 1 },
                message: { type: 'string', example: 'Hospitality API is running' },
              },
            },
          },
        },
      },
    },
  });

  app.get('/api', (req, res) => {
    res.json({ code: 1, message: 'Hospitality API is running' });
  });
}

module.exports = { registerRoutes };
