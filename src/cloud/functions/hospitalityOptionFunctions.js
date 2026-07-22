const hospitalityOptionService = require('../../services/hospitalityOptionService');
const { requireUser, requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../constants/hospitality');
const { ok, fail } = require('../../utils/response');
const { defineCloudFunction } = require('../../swagger/defineCloudFunction');

const ADMIN_ROLES = [ROLES.ADMIN];

function registerHospitalityOptionFunctions() {
  defineCloudFunction(
    'getHospitalityOptions',
    async (request) => {
      try {
        requireUser(request);
        const options = await hospitalityOptionService.getOptions(request.params.type);
        return ok(options, 'Options loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality Options'],
      summary: 'Get hospitality dropdown options',
      description: 'Returns active hospitality types and items. Seeds default options on first call.',
      authRequired: true,
      parameters: {
        type: {
          schema: { type: 'string', enum: ['type', 'item'] },
          description: 'Filter by option type',
        },
      },
    }
  );

  defineCloudFunction(
    'saveHospitalityOption',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const option = await hospitalityOptionService.saveOption(request.params.optionData);
        return ok(option, 'Option saved');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality Options'],
      summary: 'Create or update a hospitality option',
      roles: ADMIN_ROLES,
      parameters: {
        optionData: {
          required: true,
          schema: { $ref: '#/components/schemas/HospitalityOptionInput' },
        },
      },
      requestExample: {
        optionData: {
          type: 'item',
          name: 'Cake',
          sortOrder: 1,
          isActive: true,
        },
      },
    }
  );

  defineCloudFunction(
    'getHospitalityOptionList',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const options = await hospitalityOptionService.listOptions(request.params);
        return ok(options, 'Options loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality Options'],
      summary: 'List all hospitality options for admin management',
      roles: ADMIN_ROLES,
      parameters: {
        type: { schema: { type: 'string', enum: ['type', 'item'] } },
        search: { schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'deleteHospitalityOption',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const option = await hospitalityOptionService.deleteOption(request.params.optionId);
        return ok(option, 'Option deleted');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality Options'],
      summary: 'Delete a hospitality option if it is not used in requests',
      roles: ADMIN_ROLES,
      parameters: {
        optionId: { required: true, schema: { type: 'string' } },
      },
    }
  );
}

module.exports = { registerHospitalityOptionFunctions };
