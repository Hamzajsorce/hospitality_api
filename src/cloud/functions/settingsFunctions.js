const settingsService = require('../../services/settingsService');
const { requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../constants/hospitality');
const { ok, fail } = require('../../utils/response');
const { defineCloudFunction } = require('../../swagger/defineCloudFunction');

const ADMIN_ROLES = [ROLES.ADMIN];

function registerSettingsFunctions() {
  defineCloudFunction(
    'getTelegramGroups',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const groups = await settingsService.listTelegramGroups();
        return ok(groups, 'Telegram groups loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Settings'],
      summary: 'List Telegram notification groups',
      roles: ADMIN_ROLES,
    }
  );

  defineCloudFunction(
    'saveTelegramGroup',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const group = await settingsService.saveTelegramGroup(request.params.groupData);
        return ok(group, request.params.groupData?.objectId ? 'Telegram group updated' : 'Telegram group created');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Settings'],
      summary: 'Create or update a Telegram notification group',
      roles: ADMIN_ROLES,
      parameters: {
        groupData: {
          required: true,
          schema: {
            type: 'object',
            properties: {
              objectId: { type: 'string' },
              role: { type: 'string', enum: Object.values(ROLES) },
              label: { type: 'string' },
              chatId: { type: 'string' },
              isActive: { type: 'boolean' },
              sortOrder: { type: 'integer' },
            },
          },
        },
      },
    }
  );

  defineCloudFunction(
    'deleteTelegramGroup',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const group = await settingsService.deleteTelegramGroup(request.params.groupId);
        return ok(group, 'Telegram group deleted');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Settings'],
      summary: 'Delete a Telegram notification group',
      roles: ADMIN_ROLES,
      parameters: {
        groupId: { required: true, schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'testTelegramGroup',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const result = await settingsService.testTelegramGroup(request.params.groupId);
        return ok(result, 'Telegram test sent');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Settings'],
      summary: 'Send a test message to a Telegram notification group',
      roles: ADMIN_ROLES,
      parameters: {
        groupId: { required: true, schema: { type: 'string' } },
      },
    }
  );
}

module.exports = { registerSettingsFunctions };
