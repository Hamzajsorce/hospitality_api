const hospitalityRepository = require('../repositories/hospitalityRepository');
const notificationService = require('./notificationService');
const { AppError } = require('../utils/AppError');
const { getUserRole } = require('../utils/role');
const { resolveTypeOption, resolveRequestItems } = require('../utils/hospitalityOptionResolver');
const { ROLES, STATUS } = require('../constants/hospitality');
const { MODULE_TYPES } = require('../constants/notifications');

const REPORT_ROLES = [ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.MANAGEMENT];

function generateGroupId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `grp_${Date.now().toString(36)}_${randomPart}`;
}

function userSnapshot(user) {
  return {
    userId: user.id,
    username: user.get('username'),
    name: user.get('name') || user.get('fullName') || user.get('username'),
    role: getUserRole(user),
  };
}

async function validateRequestData(data = {}) {
  if (!data.roomNumber) throw new AppError('Room number is required');
  if (!data.guestName) throw new AppError('Guest name is required');

  const typeRef = data.hospitalityTypeId || data.hospitalityType;
  if (!typeRef) throw new AppError('Hospitality type is required');

  const requestDate = data.requestDate ? new Date(data.requestDate) : new Date();
  if (Number.isNaN(requestDate.getTime())) {
    throw new AppError('Request date is invalid');
  }

  const typeOption = await resolveTypeOption(typeRef);
  const { items, itemOptionIds } = await resolveRequestItems(data.items);
  const typeName = typeOption.get('name');

  return {
    roomNumber: String(data.roomNumber).trim(),
    roomNumberSearch: String(data.roomNumber).trim().toLowerCase(),
    guestName: String(data.guestName).trim(),
    guestNameSearch: String(data.guestName).trim().toLowerCase(),
    requestDate,
    hospitalityType: typeName,
    hospitalityTypeOption: typeOption,
    hospitalityTypeId: typeOption.id,
    hospitalityTypeName: typeName,
    items: items.map(({ optionId, name, quantity }) => ({
      optionId,
      name,
      quantity,
    })),
    itemOptionIds,
    notes: data.notes ? String(data.notes).trim() : '',
  };
}

async function logAction(requestId, user, action, notes = '') {
  const actor = userSnapshot(user);
  return hospitalityRepository.createLog({
    requestId,
    action,
    notes,
    userId: actor.userId,
    username: actor.username,
    name: actor.name,
    role: actor.role,
    timestamp: new Date(),
  });
}

async function notifyRequestStakeholders(request, payload) {
  if (!request?.objectId) return;

  const base = {
    moduleType: MODULE_TYPES.HOSPITALITY_REQUEST,
    moduleId: request.objectId,
    ...payload,
  };

  if (payload.targetUserId) {
    await notificationService.createForUser({
      targetUserId: payload.targetUserId,
      title: payload.title,
      text: payload.text,
      moduleType: base.moduleType,
      moduleId: base.moduleId,
    });
    return;
  }

  if (payload.role) {
    await notificationService.createForRole(payload.role, {
      title: payload.title,
      text: payload.text,
      moduleType: base.moduleType,
      moduleId: base.moduleId,
    });
  }
}

async function createRequest(data, user) {
  const cleanData = await validateRequestData(data);
  const actor = userSnapshot(user);
  const request = await hospitalityRepository.createRequest({
    ...cleanData,
    status: STATUS.PENDING_APPROVAL,
    createdByUserId: actor.userId,
    createdByName: actor.name,
    createdByRole: actor.role,
  });
  await logAction(request.objectId, user, 'Created request', cleanData.notes);
  await notifyRequestStakeholders(request, {
    role: ROLES.ADMIN,
    title: 'طلب ضيافة جديد',
    text: ` الغرفة ${request.roomNumber} - ${request.guestName} في انتظار الموافقة.
    `,
  });
  return request;
}

function validateGroupRooms(roomNumbers) {
  if (!Array.isArray(roomNumbers) || !roomNumbers.length) {
    throw new AppError('At least one room number is required');
  }

  const rooms = roomNumbers.map((roomNumber) => String(roomNumber || '').trim()).filter(Boolean);
  if (!rooms.length) {
    throw new AppError('At least one room number is required');
  }

  const seen = new Set();
  const duplicates = new Set();
  rooms.forEach((roomNumber) => {
    const key = roomNumber.toLowerCase();
    if (seen.has(key)) duplicates.add(roomNumber);
    seen.add(key);
  });

  if (duplicates.size) {
    throw new AppError(`Duplicate room numbers are not allowed: ${Array.from(duplicates).join(', ')}`);
  }

  return rooms;
}

async function createGroupRequests(data = {}, user) {
  const groupName = String(data.groupName || '').trim();
  if (!groupName) throw new AppError('Group name is required');

  const roomNumbers = validateGroupRooms(data.roomNumbers);
  const actor = userSnapshot(user);
  const groupId = generateGroupId();
  const groupSize = roomNumbers.length;

  const rows = [];
  for (const roomNumber of roomNumbers) {
    const cleanData = await validateRequestData({
      ...data,
      roomNumber,
      guestName: data.guestName || groupName,
    });

    rows.push({
      ...cleanData,
      status: STATUS.PENDING_APPROVAL,
      groupId,
      groupName,
      groupSize,
      createdByUserId: actor.userId,
      createdByName: actor.name,
      createdByRole: actor.role,
    });
  }

  const requests = await hospitalityRepository.createRequests(rows);
  for (const request of requests) {
    await logAction(request.objectId, user, 'Created group request', data.notes || '');
  }

  await notifyRequestStakeholders(requests[0], {
    role: ROLES.ADMIN,
    title: 'طلب ضيافة جماعي جديد',
    text: `${groupName} - ${groupSize} غرف في انتظار الموافقة.`,
  });

  return {
    groupId,
    groupName,
    groupSize,
    requests,
  };
}

function ensureCanSeeRequest(request, user) {
  const role = getUserRole(user);
  if (role === ROLES.REQUESTER && request.createdByUserId !== user.id) {
    throw new AppError('You can only view your own requests', 403);
  }
}

async function getRequest(requestId, user) {
  const request = await hospitalityRepository.findRequestById(requestId);
  ensureCanSeeRequest(request, user);
  const logs = await hospitalityRepository.findLogs(requestId);
  return { ...request, logs };
}

async function listRequests(params = {}, user) {
  const role = getUserRole(user);
  const limit = Math.min(Number(params.limit || 10), 100);
  const skip = Number(params.skip || 0);
  const filters = {
    limit,
    skip,
    status: params.status,
    statuses: params.statuses,
    roomNumber: params.roomNumber,
    fromDate: params.fromDate,
    toDate: params.toDate,
    userId: params.userId,
    hospitalityTypeId: params.hospitalityTypeId,
    itemOptionId: params.itemOptionId,
    groupId: params.groupId,
    orderBy: params.orderBy || '-createdAt',
  };

  if (role === ROLES.REQUESTER) {
    filters.userId = user.id;
  }

  if (role === ROLES.FNB && !filters.status) {
    filters.statuses = [STATUS.APPROVED, STATUS.PENDING_DELIVERY, STATUS.DELIVERY_CANCELED];
  }

  return hospitalityRepository.findRequests(filters);
}

async function updateDraft(requestId, data, user) {
  const request = await hospitalityRepository.findRequestById(requestId);
  if (request.status !== STATUS.PENDING_APPROVAL) {
    throw new AppError('Only pending requests can be edited before approval');
  }

  const cleanData = await validateRequestData({ ...request, ...data });
  const updated = await hospitalityRepository.updateRequest(requestId, cleanData);
  await logAction(requestId, user, 'Edited request before approval', data.notes || '');
  return updated;
}

async function approve(requestId, user) {
  const request = await hospitalityRepository.findRequestById(requestId);
  if (request.status !== STATUS.PENDING_APPROVAL) {
    throw new AppError('Only pending requests can be approved');
  }

  const actor = userSnapshot(user);
  const updated = await hospitalityRepository.updateRequest(requestId, {
    status: STATUS.APPROVED,
    approvedByUserId: actor.userId,
    approvedByName: actor.name,
    approvedAt: new Date(),
  });
  await logAction(requestId, user, 'Approved request');
  await notifyRequestStakeholders(updated, {
    targetUserId: updated.createdByUserId,
    title: 'تم الموافقة على الطلب',
    text: `تم الموافقة على طلب الضيافة الخاص بك للغرفة ${updated.roomNumber}
    `,
  });
  return updated;
}

async function reject(requestId, user, notes = '') {
  const request = await hospitalityRepository.findRequestById(requestId);
  if (![STATUS.PENDING_APPROVAL, STATUS.APPROVED].includes(request.status)) {
    throw new AppError('This request cannot be rejected');
  }

  const actor = userSnapshot(user);
  const updated = await hospitalityRepository.updateRequest(requestId, {
    status: STATUS.REJECTED,
    rejectedByUserId: actor.userId,
    rejectedByName: actor.name,
    rejectedAt: new Date(),
    rejectionReason: notes,
  });
  await logAction(requestId, user, 'Rejected request', notes);
  await notifyRequestStakeholders(updated, {
    targetUserId: updated.createdByUserId,
    title: 'تم رفض الطلب',
    text: ` تم رفض طلب الضيافة الخاص بك للغرفة ${updated.roomNumber}`,
  });
  return updated;
}

async function bulkUpdate(requestIds = [], action, user, notes = '') {
  if (!requestIds.length) throw new AppError('No requests selected');
  if (!['approve', 'reject'].includes(action)) throw new AppError('Bulk action is invalid');

  const updater = action === 'approve' ? approve : reject;
  const results = [];
  for (const requestId of requestIds) {
    results.push(await updater(requestId, user, notes));
  }
  return results;
}

async function approveGroup(groupId, user) {
  const cleanGroupId = String(groupId || '').trim();
  if (!cleanGroupId) throw new AppError('Group id is required');

  const result = await hospitalityRepository.findRequests({
    limit: 1000,
    skip: 0,
    groupId: cleanGroupId,
    orderBy: 'roomNumberSearch',
  });

  if (!result.data.length) {
    throw new AppError('Hospitality request group was not found', 404);
  }

  const approved = [];
  const skipped = [];
  const failed = [];

  for (const request of result.data) {
    if (request.status !== STATUS.PENDING_APPROVAL) {
      skipped.push({
        requestId: request.objectId,
        roomNumber: request.roomNumber,
        status: request.status,
      });
      continue;
    }

    try {
      approved.push(await approve(request.objectId, user));
    } catch (error) {
      failed.push({
        requestId: request.objectId,
        roomNumber: request.roomNumber,
        message: error.message || 'Approval failed',
      });
    }
  }

  return {
    groupId: cleanGroupId,
    groupName: result.data[0].groupName || '',
    groupSize: result.data[0].groupSize || result.data.length,
    approved,
    skipped,
    failed,
  };
}

async function updateDelivery(requestId, status, notes, user) {
  const cleanNotes = String(notes || '').trim();

  if (![STATUS.APPROVED, STATUS.DELIVERED, STATUS.PENDING_DELIVERY, STATUS.DELIVERY_CANCELED].includes(status)) {
    throw new AppError('Delivery status is invalid');
  }

  if (status === STATUS.DELIVERY_CANCELED && !cleanNotes) {
    throw new AppError('Failure reason is required');
  }

  const request = await hospitalityRepository.findRequestById(requestId);
  if (![STATUS.APPROVED, STATUS.PENDING_DELIVERY, STATUS.DELIVERY_CANCELED].includes(request.status)) {
    throw new AppError('Only approved delivery requests can be updated');
  }

  const actor = userSnapshot(user);
  const updated = await hospitalityRepository.updateRequest(requestId, {
    status,
    deliveryNotes: cleanNotes,
    handledByUserId: actor.userId,
    handledByName: actor.name,
    handledAt: new Date(),
  });
  await logAction(requestId, user, `Marked ${status}`, cleanNotes);
  await notifyRequestStakeholders(updated, {
    targetUserId: updated.createdByUserId,
    title: 'تم تحديث حالة التسليم',
    text: `تم تحديث حالة طلب الضيافة الخاص بك للغرفة ${updated.roomNumber} إلى ${status}.`,
  });
  return updated;
}

async function getReports(params = {}, user) {
  const role = getUserRole(user);
  if (!REPORT_ROLES.includes(role) && role !== ROLES.FNB) {
    throw new AppError('You are not authorized to view reports', 403);
  }

  const result = await hospitalityRepository.findRequests({
    limit: 1000,
    skip: 0,
    status: params.status,
    roomNumber: params.roomNumber,
    userId: params.userId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    orderBy: '-requestDate',
  });

  const summary = Object.values(STATUS).reduce((acc, status) => ({ ...acc, [status]: 0 }), {
    Total: result.data.length,
  });

  result.data.forEach((request) => {
    summary[request.status] = (summary[request.status] || 0) + 1;
  });

  return { summary, rows: result.data };
}

module.exports = {
  createRequest,
  createGroupRequests,
  getRequest,
  listRequests,
  updateDraft,
  approve,
  reject,
  bulkUpdate,
  approveGroup,
  updateDelivery,
  getReports,
};
