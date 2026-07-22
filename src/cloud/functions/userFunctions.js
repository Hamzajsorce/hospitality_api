const userService = require('../../services/userService');
const { requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../constants/hospitality');
const { ok, fail } = require('../../utils/response');
const { defineCloudFunction } = require('../../swagger/defineCloudFunction');

const ADMIN_ROLES = [ROLES.ADMIN];

function registerUserFunctions() {
  defineCloudFunction(
    'getUserList',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const result = await userService.getList(request.params);
        return ok(result.data, 'Users loaded', result.meta);
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Users'],
      summary: 'List users',
      roles: ADMIN_ROLES,
      parameters: {
        limit: { schema: { type: 'integer' } },
        skip: { schema: { type: 'integer' } },
        search: { schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'getUser',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const user = await userService.getById(request.params.userId);
        return ok(user, 'User loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Users'],
      summary: 'Get a user by id',
      roles: ADMIN_ROLES,
      parameters: {
        userId: { required: true, schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'saveUser',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const user = await userService.save(request.params.userData, request.user);
        return ok(user, request.params.userData?.objectId ? 'User updated' : 'User created');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Users'],
      summary: 'Create or update a user',
      roles: ADMIN_ROLES,
      parameters: {
        userData: {
          required: true,
          schema: {
            type: 'object',
            properties: {
              objectId: { type: 'string' },
              username: { type: 'string' },
              password: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: {
                type: 'string',
                enum: Object.values(ROLES),
              },
            },
          },
        },
      },
      requestExample: {
        userData: {
          username: 'frontdesk1',
          password: 'password123',
          email: 'frontdesk1@hotel.com',
          name: 'Front Desk',
          role: 'request_user',
        },
      },
    }
  );
}

module.exports = { registerUserFunctions };
