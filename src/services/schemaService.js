const Parse = require('parse/node');
const { AppError } = require('../utils/AppError');

const CLASS_DEFINITIONS = [
  {
    className: 'HospitalityOption',
    fields: [
      { name: 'type', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'nameSearch', type: 'String' },
      { name: 'sortOrder', type: 'Number' },
      { name: 'isActive', type: 'Boolean' },
    ],
  },
  {
    className: 'HospitalityRequest',
    fields: [
      { name: 'roomNumber', type: 'String' },
      { name: 'roomNumberSearch', type: 'String' },
      { name: 'guestName', type: 'String' },
      { name: 'guestNameSearch', type: 'String' },
      { name: 'requestDate', type: 'Date' },
      { name: 'hospitalityType', type: 'String' },
      { name: 'hospitalityTypeOption', type: 'Pointer', targetClass: 'HospitalityOption' },
      { name: 'hospitalityTypeId', type: 'String' },
      { name: 'hospitalityTypeName', type: 'String' },
      { name: 'items', type: 'Array' },
      { name: 'itemOptionIds', type: 'Array' },
      { name: 'notes', type: 'String' },
      { name: 'status', type: 'String' },
      { name: 'createdByUserId', type: 'String' },
      { name: 'createdByName', type: 'String' },
      { name: 'createdByRole', type: 'String' },
      { name: 'groupId', type: 'String' },
      { name: 'groupName', type: 'String' },
      { name: 'groupSize', type: 'Number' },
      { name: 'approvedByUserId', type: 'String' },
      { name: 'approvedByName', type: 'String' },
      { name: 'approvedAt', type: 'Date' },
      { name: 'rejectedByUserId', type: 'String' },
      { name: 'rejectedByName', type: 'String' },
      { name: 'rejectedAt', type: 'Date' },
      { name: 'rejectionReason', type: 'String' },
      { name: 'deliveryNotes', type: 'String' },
      { name: 'handledByUserId', type: 'String' },
      { name: 'handledByName', type: 'String' },
      { name: 'handledAt', type: 'Date' },
    ],
  },
  {
    className: 'HospitalityLog',
    fields: [
      { name: 'requestId', type: 'String' },
      { name: 'action', type: 'String' },
      { name: 'notes', type: 'String' },
      { name: 'userId', type: 'String' },
      { name: 'username', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'role', type: 'String' },
      { name: 'timestamp', type: 'Date' },
    ],
  },
  {
    className: 'Notification',
    fields: [
      { name: 'title', type: 'String' },
      { name: 'text', type: 'String' },
      { name: 'targetUserId', type: 'String' },
      { name: 'targetUser', type: 'Pointer', targetClass: '_User' },
      { name: 'isRead', type: 'Boolean' },
      { name: 'readAt', type: 'Date' },
      { name: 'moduleType', type: 'String' },
      { name: 'moduleId', type: 'String' },
    ],
  },
  {
    className: '_User',
    fields: [
      { name: 'name', type: 'String' },
      { name: 'roleNumber', type: 'String' },
      { name: 'role', type: 'Pointer', targetClass: '_Role' },
    ],
  },
];

function addField(schema, field) {
  const options = field.required ? { required: true } : undefined;

  switch (field.type) {
    case 'String':
      schema.addString(field.name, options);
      break;
    case 'Number':
      schema.addNumber(field.name, options);
      break;
    case 'Boolean':
      schema.addBoolean(field.name, options);
      break;
    case 'Date':
      schema.addDate(field.name, options);
      break;
    case 'Array':
      schema.addArray(field.name, options);
      break;
    case 'Object':
      schema.addObject(field.name, options);
      break;
    case 'Pointer':
      schema.addPointer(field.name, field.targetClass, options);
      break;
    default:
      throw new AppError(`Unsupported schema field type: ${field.type}`, 500);
  }
}

function fieldMatches(existingField, expectedField) {
  if (!existingField) return false;
  if (existingField.type !== expectedField.type) return false;
  if (expectedField.type === 'Pointer') {
    return existingField.targetClass === expectedField.targetClass;
  }
  return true;
}

function serializeField(field) {
  return {
    name: field.name,
    type: field.type,
    ...(field.targetClass ? { targetClass: field.targetClass } : {}),
  };
}

function isMissingClassError(error) {
  const message = String(error?.message || error?.error || '').toLowerCase();
  return (
    error?.code === 103 ||
    error?.status === 404 ||
    message.includes('schema not found') ||
    message.includes('class not found') ||
    message.includes('does not exist')
  );
}

async function getExistingSchema(className) {
  const schema = new Parse.Schema(className);
  try {
    return await schema.get();
  } catch (error) {
    if (isMissingClassError(error)) return null;
    throw error;
  }
}

async function syncClass(definition, { dryRun = false } = {}) {
  const existing = await getExistingSchema(definition.className);
  const existingFields = existing?.fields || {};
  const missingFields = [];
  const mismatchedFields = [];

  definition.fields.forEach((field) => {
    if (!existingFields[field.name]) {
      missingFields.push(field);
      return;
    }

    if (!fieldMatches(existingFields[field.name], field)) {
      mismatchedFields.push({
        name: field.name,
        expected: serializeField(field),
        actual: existingFields[field.name],
      });
    }
  });

  if (!dryRun && (!existing || missingFields.length)) {
    const schema = new Parse.Schema(definition.className);
    missingFields.forEach((field) => addField(schema, field));

    if (existing) {
      await schema.update();
    } else {
      await schema.save();
    }
  }

  return {
    className: definition.className,
    exists: Boolean(existing),
    created: !existing && !dryRun,
    missingFields: missingFields.map(serializeField),
    addedFields: dryRun ? [] : missingFields.map(serializeField),
    mismatchedFields,
    status: mismatchedFields.length
      ? 'type_mismatch'
      : !existing && !dryRun
      ? 'created'
      : missingFields.length
      ? dryRun
        ? 'needs_update'
        : 'updated'
      : 'ok',
  };
}

async function syncSchemas(options = {}) {
  const results = [];

  for (const definition of CLASS_DEFINITIONS) {
    results.push(await syncClass(definition, options));
  }

  return {
    dryRun: Boolean(options.dryRun),
    classes: results,
    summary: {
      checked: results.length,
      created: results.filter((item) => item.created).length,
      updated: results.filter((item) => item.status === 'updated').length,
      missingFields: results.reduce((total, item) => total + item.missingFields.length, 0),
      mismatchedFields: results.reduce((total, item) => total + item.mismatchedFields.length, 0),
    },
  };
}

function getSchemaDefinitions() {
  return CLASS_DEFINITIONS.map((definition) => ({
    className: definition.className,
    fields: definition.fields.map(serializeField),
  }));
}

module.exports = {
  getSchemaDefinitions,
  syncSchemas,
};
