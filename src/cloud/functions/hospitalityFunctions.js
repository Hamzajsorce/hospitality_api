const hospitalityService = require('../../services/hospitalityService');
const { requireUser, requireRole } = require('../../middleware/auth');
const { ROLES } = require('../../constants/hospitality');
const { ok, fail } = require('../../utils/response');
const { defineCloudFunction } = require('../../swagger/defineCloudFunction');

const ADMIN_ROLES = [ROLES.ADMIN];
const FNB_ROLES = [ROLES.FNB];
const REPORT_ROLES = [ROLES.ADMIN, ROLES.FNB, ROLES.ACCOUNTANT, ROLES.MANAGEMENT];

function registerHospitalityFunctions() {
  defineCloudFunction(
    'createHospitalityRequest',
    async (request) => {
      try {
        requireRole(request, [ROLES.REQUESTER, ROLES.ADMIN]);
        const item = await hospitalityService.createRequest(request.params.requestData, request.user);
        return ok(item, 'Request submitted');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Submit a hospitality request',
      roles: [ROLES.REQUESTER, ROLES.ADMIN],
      parameters: {
        requestData: {
          required: true,
          schema: { $ref: '#/components/schemas/HospitalityRequestInput' },
        },
      },
      requestExample: {
        requestData: {
          roomNumber: '101',
          guestName: 'John Smith',
          hospitalityTypeId: 'abc123xyz0',
          requestDate: '2026-06-15',
          items: [{ optionId: 'def456uvw1', quantity: 1 }],
          notes: 'Arriving at 3 PM',
        },
      },
    }
  );

  defineCloudFunction(
    'createHospitalityGroupRequests',
    async (request) => {
      try {
        requireRole(request, [ROLES.REQUESTER, ROLES.ADMIN]);
        const result = await hospitalityService.createGroupRequests(request.params.requestData, request.user);
        return ok(result, 'Group requests submitted');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Submit grouped hospitality requests',
      description: 'Creates one hospitality request per room and links them with a shared groupId.',
      roles: [ROLES.REQUESTER, ROLES.ADMIN],
      parameters: {
        requestData: {
          required: true,
          schema: { $ref: '#/components/schemas/HospitalityGroupRequestInput' },
        },
      },
      requestExample: {
        requestData: {
          groupName: 'Basketball Team',
          roomNumbers: ['11', '12', '13'],
          guestName: 'Basketball Team',
          hospitalityTypeId: 'abc123xyz0',
          requestDate: '2026-06-15',
          items: [{ optionId: 'def456uvw1', quantity: 1 }],
          notes: 'Team arrival hospitality',
        },
      },
    }
  );

  defineCloudFunction(
    'getHospitalityRequestList',
    async (request) => {
      try {
        requireUser(request);
        const result = await hospitalityService.listRequests(request.params, request.user);
        return ok(result.data, 'Requests loaded', result.meta);
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'List hospitality requests',
      description: 'Requesters see only their own requests. F&B users see approved/delivery statuses by default.',
      authRequired: true,
      parameters: {
        limit: { schema: { type: 'integer', example: 10 } },
        skip: { schema: { type: 'integer', example: 0 } },
        status: { schema: { type: 'string', example: 'Pending Approval' } },
        statuses: { schema: { type: 'array', items: { type: 'string' } } },
        roomNumber: { schema: { type: 'string', example: '101' } },
        fromDate: { schema: { type: 'string', format: 'date' } },
        toDate: { schema: { type: 'string', format: 'date' } },
        userId: { schema: { type: 'string' } },
        groupId: { schema: { type: 'string' } },
        orderBy: { schema: { type: 'string', example: '-createdAt' } },
      },
    }
  );

  defineCloudFunction(
    'getHospitalityRequest',
    async (request) => {
      try {
        requireUser(request);
        const item = await hospitalityService.getRequest(request.params.requestId, request.user);
        return ok(item, 'Request loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Get a hospitality request with logs',
      authRequired: true,
      parameters: {
        requestId: { required: true, schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'updateHospitalityRequest',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const item = await hospitalityService.updateDraft(
          request.params.requestId,
          request.params.requestData,
          request.user
        );
        return ok(item, 'Request updated');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Edit a pending hospitality request',
      roles: ADMIN_ROLES,
      parameters: {
        requestId: { required: true, schema: { type: 'string' } },
        requestData: {
          required: true,
          schema: { $ref: '#/components/schemas/HospitalityRequestInput' },
        },
      },
    }
  );

  defineCloudFunction(
    'approveHospitalityRequest',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const item = await hospitalityService.approve(request.params.requestId, request.user);
        return ok(item, 'Request approved');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Approve a hospitality request',
      roles: ADMIN_ROLES,
      parameters: {
        requestId: { required: true, schema: { type: 'string' } },
      },
    }
  );

  defineCloudFunction(
    'rejectHospitalityRequest',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const item = await hospitalityService.reject(
          request.params.requestId,
          request.user,
          request.params.notes
        );
        return ok(item, 'Request rejected');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Reject a hospitality request',
      roles: ADMIN_ROLES,
      parameters: {
        requestId: { required: true, schema: { type: 'string' } },
        notes: { schema: { type: 'string', example: 'Guest cancelled' } },
      },
    }
  );

  defineCloudFunction(
    'approveHospitalityRequestGroup',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const result = await hospitalityService.approveGroup(request.params.groupId, request.user);
        return ok(result, 'Group approval processed');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Approve pending requests in a hospitality group',
      roles: ADMIN_ROLES,
      parameters: {
        groupId: { required: true, schema: { type: 'string', example: 'grp_lx6m3k_a1b2c3d4' } },
      },
      requestExample: {
        groupId: 'grp_lx6m3k_a1b2c3d4',
      },
    }
  );

  defineCloudFunction(
    'bulkUpdateHospitalityRequests',
    async (request) => {
      try {
        requireRole(request, ADMIN_ROLES);
        const items = await hospitalityService.bulkUpdate(
          request.params.requestIds,
          request.params.action,
          request.user,
          request.params.notes
        );
        return ok(items, 'Selected requests updated');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Bulk approve or reject requests',
      roles: ADMIN_ROLES,
      parameters: {
        requestIds: {
          required: true,
          schema: { type: 'array', items: { type: 'string' } },
        },
        action: { required: true, schema: { type: 'string', enum: ['approve', 'reject'] } },
        notes: { schema: { type: 'string' } },
      },
      requestExample: {
        requestIds: ['abc123', 'def456'],
        action: 'approve',
      },
    }
  );

  defineCloudFunction(
    'updateHospitalityDelivery',
    async (request) => {
      try {
        requireRole(request, FNB_ROLES);
        const item = await hospitalityService.updateDelivery(
          request.params.requestId,
          request.params.status,
          request.params.notes,
          request.user
        );
        return ok(item, 'Delivery status updated');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Update delivery status',
      roles: FNB_ROLES,
      parameters: {
        requestId: { required: true, schema: { type: 'string' } },
        status: {
          required: true,
          schema: {
            type: 'string',
            enum: ['Pending Delivery', 'Delivered', 'Delivery Cancelled'],
          },
        },
        notes: { schema: { type: 'string', example: 'Left at front desk' } },
      },
    }
  );

  defineCloudFunction(
    'getHospitalityReports',
    async (request) => {
      try {
        requireRole(request, REPORT_ROLES);
        const report = await hospitalityService.getReports(request.params, request.user);
        return ok(report, 'Reports loaded');
      } catch (error) {
        return fail(error);
      }
    },
    {
      tags: ['Hospitality'],
      summary: 'Get hospitality reports',
      roles: REPORT_ROLES,
      parameters: {
        status: { schema: { type: 'string' } },
        roomNumber: { schema: { type: 'string' } },
        userId: { schema: { type: 'string' } },
        fromDate: { schema: { type: 'string', format: 'date' } },
        toDate: { schema: { type: 'string', format: 'date' } },
      },
    }
  );
}

module.exports = { registerHospitalityFunctions };
