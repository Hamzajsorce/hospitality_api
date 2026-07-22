const cloudRegistry = require('./registries/cloudFunctions');
const restRegistry = require('./registries/restRoutes');
const { getComponents } = require('./schemas');
const { paramsToSchema } = require('./paramsToSchema');

const DEFAULT_RESPONSES = {
  200: {
    description: 'Success',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiResponse' },
      },
    },
  },
  400: {
    description: 'Validation or business error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
  401: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
  403: {
    description: 'Not authorized',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
};

function roleDescription(roles) {
  if (!roles?.length) return '';
  return `\n\n**Allowed roles:** ${roles.map((role) => `\`${role}\``).join(', ')}`;
}

function buildCloudFunctionPaths() {
  const paths = {};

  cloudRegistry.getAll().forEach((fn) => {
    const path = `/parse/functions/${fn.name}`;
    const bodySchema = paramsToSchema(fn.parameters);
    const description = `${fn.description}${roleDescription(fn.roles)}`.trim();

    paths[path] = {
      post: {
        tags: fn.tags,
        summary: fn.summary,
        description,
        security: fn.authRequired
          ? [{ ParseApplicationId: [], ParseSessionToken: [] }]
          : [{ ParseApplicationId: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: bodySchema,
              ...(fn.requestExample ? { example: fn.requestExample } : {}),
            },
          },
        },
        responses: fn.responses || DEFAULT_RESPONSES,
      },
    };
  });

  return paths;
}

function buildRestPaths() {
  const paths = {};

  restRegistry.getAll().forEach((route) => {
    const operation = {
      tags: route.tags,
      summary: route.summary,
      description: route.description,
      responses: route.responses || {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiResponse' },
            },
          },
        },
      },
    };

    if (route.parameters?.length) {
      operation.parameters = route.parameters;
    }

    if (route.requestBody) {
      operation.requestBody = route.requestBody;
    }

    if (!paths[route.path]) paths[route.path] = {};
    paths[route.path][route.method] = operation;
  });

  return paths;
}

function normalizeServerUrl(url) {
  const cleanUrl = String(url || '').replace(/\/+$/g, '');
  if (!cleanUrl) return '';
  return cleanUrl.endsWith('/parse') ? cleanUrl.slice(0, -'/parse'.length) : cleanUrl;
}

function buildServers(config = {}) {
  const { port = 1337 } = config;
  const publicUrl = normalizeServerUrl(
    config.publicServerURL || process.env.RENDER_EXTERNAL_URL || process.env.PARSE_PUBLIC_SERVER_URL
  );
  const servers = [{ url: '/', description: 'Current server' }];

  if (publicUrl && publicUrl !== '/') {
    servers.push({ url: publicUrl, description: 'Configured public server' });
  }

  servers.push({ url: `http://localhost:${port}`, description: 'Local development' });
  return servers;
}

function buildSpec(config = {}) {
  const { port = 1337, appId = 'hospitality-app' } = config;

  return {
    openapi: '3.0.3',
    info: {
      title: 'Hospitality API',
      version: '1.0.0',
      description: [
        'Parse Server backend for hospitality requests.',
        '',
        'Cloud functions are auto-documented when registered with `defineCloudFunction`.',
        'REST routes are auto-documented when registered with `documentRoute` or `documentedRouter`.',
        '',
        `Default Parse App ID: \`${appId}\``,
      ].join('\n'),
    },
    servers: buildServers({ ...config, port }),
    tags: [
      { name: 'System', description: 'Health and status endpoints' },
      { name: 'Hospitality', description: 'Hospitality cloud functions' },
      { name: 'Examples', description: 'Example cloud functions (template)' },
      { name: 'Parse Auth', description: 'Built-in Parse authentication endpoints' },
    ],
    paths: {
      ...buildRestPaths(),
      ...buildCloudFunctionPaths(),
      '/parse/login': {
        post: {
          tags: ['Parse Auth'],
          summary: 'Log in and obtain a session token',
          description: 'Use the returned `sessionToken` as `X-Parse-Session-Token` for cloud functions.',
          security: [{ ParseApplicationId: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string', example: 'admin1' },
                    password: { type: 'string', example: 'password123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            400: { description: 'Invalid credentials' },
          },
        },
      },
      '/parse/users': {
        post: {
          tags: ['Parse Auth'],
          summary: 'Sign up a new Parse user',
          security: [{ ParseApplicationId: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    email: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: ['request_user', 'admin', 'fnb', 'accountant', 'management'],
                    },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created' },
            400: { description: 'Validation error' },
          },
        },
      },
    },
    components: getComponents(),
  };
}

module.exports = { buildSpec };
