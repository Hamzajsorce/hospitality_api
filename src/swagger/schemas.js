const ROLES = ['request_user', 'admin', 'fnb', 'accountant', 'management'];

const apiResponse = {
  type: 'object',
  properties: {
    code: { type: 'integer', example: 1 },
    message: { type: 'string', example: 'Success' },
    data: { nullable: true },
    meta: {
      type: 'object',
      nullable: true,
      properties: {
        total: { type: 'integer' },
        limit: { type: 'integer' },
        skip: { type: 'integer' },
        page: { type: 'integer' },
      },
    },
  },
};

const apiError = {
  type: 'object',
  properties: {
    code: { type: 'integer', example: 0 },
    message: { type: 'string', example: 'Something went wrong' },
  },
};

const hospitalityItem = {
  type: 'object',
  required: ['optionId', 'quantity'],
  properties: {
    optionId: { type: 'string', description: 'HospitalityOption objectId for an item' },
    quantity: { type: 'number', example: 1 },
    name: { type: 'string', description: 'Legacy fallback only', example: 'Cake' },
  },
};

const hospitalityRequestInput = {
  type: 'object',
  required: ['roomNumber', 'guestName', 'items'],
  properties: {
    roomNumber: { type: 'string', example: '101' },
    guestName: { type: 'string', example: 'John Smith' },
    hospitalityTypeId: {
      type: 'string',
      description: 'HospitalityOption objectId for the hospitality type',
      example: 'abc123xyz0',
    },
    hospitalityType: {
      type: 'string',
      description: 'Legacy fallback only',
      example: 'VIP',
    },
    requestDate: { type: 'string', format: 'date', example: '2026-06-15' },
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/HospitalityItem' },
    },
    notes: { type: 'string', example: 'Arriving at 3 PM' },
  },
};

const hospitalityGroupRequestInput = {
  type: 'object',
  required: ['groupName', 'roomNumbers', 'guestName', 'items'],
  properties: {
    groupName: { type: 'string', example: 'Basketball Team' },
    roomNumbers: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
      example: ['11', '12', '13'],
    },
    guestName: { type: 'string', example: 'Basketball Team' },
    hospitalityTypeId: {
      type: 'string',
      description: 'HospitalityOption objectId for the hospitality type',
      example: 'abc123xyz0',
    },
    hospitalityType: {
      type: 'string',
      description: 'Legacy fallback only',
      example: 'VIP',
    },
    requestDate: { type: 'string', format: 'date', example: '2026-06-15' },
    items: {
      type: 'array',
      items: { $ref: '#/components/schemas/HospitalityItem' },
    },
    notes: { type: 'string', example: 'Team arrival hospitality' },
  },
};

const hospitalityOptionInput = {
  type: 'object',
  required: ['type', 'name'],
  properties: {
    objectId: { type: 'string', description: 'Include to update an existing option' },
    type: { type: 'string', enum: ['type', 'item'], example: 'item' },
    name: { type: 'string', example: 'Cake' },
    sortOrder: { type: 'number', example: 1 },
    isActive: { type: 'boolean', example: true },
  },
};

function getComponents() {
  return {
    schemas: {
      ApiResponse: apiResponse,
      ApiError: apiError,
      HospitalityItem: hospitalityItem,
      HospitalityRequestInput: hospitalityRequestInput,
      HospitalityGroupRequestInput: hospitalityGroupRequestInput,
      HospitalityOptionInput: hospitalityOptionInput,
    },
    securitySchemes: {
      ParseApplicationId: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Parse-Application-Id',
        description: 'Parse application id from PARSE_APP_ID',
      },
      ParseSessionToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Parse-Session-Token',
        description: 'Session token returned by Parse login',
      },
    },
  };
}

module.exports = {
  ROLES,
  getComponents,
};
